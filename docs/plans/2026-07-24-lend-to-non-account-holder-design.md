# Lend to a Non-Account Holder — Design Doc

_Date: 2026-07-24_

## Overview

Today, `LendModal`'s recipient lookup requires the borrower to already have a TPP account — if the lookup fails, the owner hits a dead end ("No account found..."). This adds a fallback: the owner can log an **informal loan** to someone by name (and optionally email) even though they have no account, so their inventory accurately reflects "who has my stuff" regardless of whether that person ever joins TPP.

**Primary motivation:** owner-side tracking that works independent of the other person's status — not signup growth. Growth is a secondary, non-blocking benefit: if an email is provided, the borrower gets an email with the loan details and an optional path to claim it as a real, two-sided tracked loan by creating an account (or logging into an existing one under a different email).

## Scope & Constraints

- **In scope:** the Lend flow only (`LendModal`). Transfer/gift (`TransferModal`) has the identical recipient-lookup problem and could get the same treatment later, but is explicitly out of scope for this pass — kept separate to keep this change focused.
- **In scope:** new `informal_loans` table, "Lend to them anyway" fallback UI, owner-side Mark Returned / Cancel / Resend Invite actions, the loan-details email with calendar invite, and the claim-link upgrade path.
- **Out of scope:** any two-sided confirmation for informal loans (no pickup/return confirmation from the borrower — the owner is the sole source of truth until/unless the loan is claimed and converted). No token expiry. No fuzzy/name-based account search.
- **Why not extend `item_loans` itself:** that table's whole shape assumes two real accounts confirming things — `borrower_id` is `NOT NULL` with an FK to `profiles`, there are four non-nullable confirmation booleans, RLS policies and UI (Return Item buttons, "Items I'm Borrowing") all key off `borrower_id` matching the logged-in user. Bending that model to also cover an account-less borrower risks subtle breakage across all of it. A separate table keeps the two systems' assumptions honest.

---

## Data Model

### `informal_loans` (new table)

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, default `gen_random_uuid()` |
| item_id | bigint | FK → `gear_items.id` |
| owner_id | uuid | FK → `profiles.id` |
| borrower_name | text | required — no username to fall back on |
| borrower_email | text | nullable; required in practice to send the email / support claiming, but not enforced at the DB level in case that changes later |
| invite_token | uuid | unique, defaults to `gen_random_uuid()` — NOT the row's own `id` (avoids the token being derivable/reusable via a predictable value). 122 bits of randomness makes enumeration infeasible. Used by the claim page/RPC. |
| handed_over_at | date | required — owner-entered, defaults to today in the UI; not inferred from any confirmation step since there isn't one |
| return_by | date | nullable, prefilled from the item's own default lending terms same as real loans |
| damage_agreement | numeric | nullable, same prefill behavior |
| loss_agreement | numeric | nullable, same prefill behavior |
| notes | text | nullable, same prefill behavior |
| status | text | `active` \| `returned` \| `cancelled` \| `converted` |
| converted_loan_id | uuid | nullable, FK → `item_loans.id` — set when claimed/converted |
| created_at | timestamptz | default `now()` |
| updated_at | timestamptz | default `now()` |

No `item_name` snapshot column — unlike `item_transfers.item_name`, which is snapshotted because a transfer changes who owns the item (so the old owner's visibility of the current row can change), an informal loan never changes ownership. A live join to `gear_items` stays accurate for as long as the loan exists, same as the real `item_loans` table already does.

**RLS:** owner-only (`owner_id = auth.uid()`) for normal table access — mirrors every other owner-scoped table in this app, **plus** a same-transaction check that `item_id` actually belongs to that owner in `gear_items`. `owner_id = auth.uid()` alone is self-attested on INSERT; without also verifying the item, anyone could insert a row naming someone *else's* item while claiming to be its owner, and the `is_on_loan` sync trigger below would then falsely mark that other person's item as on-loan. The claim flow (a non-owner, possibly not-yet-authenticated person) does **not** get a direct table grant; see Claim Path below.

**Defense against double-lending:** a `before insert` trigger rejects creating an informal loan for an item where `gear_items.is_on_loan` is already `true` (from either a real or another informal loan). Worth noting why this needs to be enforced at the DB level, not just trusted to the UI: while reviewing this design, `app/inventory/client-page.tsx`'s `renderActionButton` turned out to only check for a *pending* real loan before showing the "Lend To" button — it doesn't check for an already-active one. That's a pre-existing gap outside this feature's scope to fix, but this trigger keeps informal loans from being able to exploit it.

**Standard grants** (per project convention — Supabase no longer auto-grants new tables):
```sql
grant select on public.informal_loans to anon;
grant select, insert, update, delete on public.informal_loans to authenticated;
grant select, insert, update, delete on public.informal_loans to service_role;
```

---

## Front-End Flow

In `LendModal`, the existing lookup is unchanged for the common case. On failure:

1. If the search query was an email (not a username — a username search has no email to fall back to), show a new "Lend to them anyway →" button beneath the existing error.
2. Clicking it swaps the lookup box for a **Name** field (required) with the searched email carried over, and reveals the same Lending Terms section already in the modal (prefilled from the item's own defaults, unchanged), plus a new **Handed over on** date field defaulting to today.
3. The Confirm button becomes "Lend Item" and inserts an `informal_loans` row instead of an `item_loans` row.
4. On success: same success pattern as a real loan (toast/close), and fires the loan-details email (see below) if an email was provided.

---

## Owner-Side Management (Inventory)

Informal loans appear in the existing "Items Out on Loan" section (not a separate table) — one place to see everything lent out. Rows for an informal loan show the borrower as e.g. "Jamie — no account" instead of a linked username, and offer:

- **Mark Returned** — sets `status = 'returned'` (clearing `gear_items.is_on_loan` via the sync trigger), and also resets `availability_status`/`visibility` to `Not Available`/`private`, mirroring exactly what the real loan flow's return confirmation already does — so the owner consciously re-lists the item afterward rather than it silently reverting to whatever it was mid-loan. No confirmation needed from the other side.
- **Cancel** — for a mistake or a loan that never actually happened; sets `status = 'cancelled'`. Distinct from Mark Returned, which implies the loan happened and is now over. Mirrors the existing Cancel option already available for pending real loans.
- **Resend Invite** — re-sends the loan-details email. Copies the existing Remind-button pattern used for pending real loans (client-side 24h cooldown via localStorage, not DB-enforced).

Once a loan is claimed/converted (see Claim Path), its `informal_loans` row moves to `status = 'converted'` and stops appearing in this section — the now-real `item_loans` row takes its place, so the owner never sees the same loan represented twice.

---

## Shared State: `gear_items.is_on_loan`

An active informal loan sets `gear_items.is_on_loan = true`, exactly like a real loan — reusing the existing flag rather than adding a parallel concept. This means, for free, with no new UI logic:

- The item disappears from Find Items while informally lent.
- Lend/Transfer/Edit/Delete already grey out on the item's own page (`onLoan ? disabled : ...` already checks this flag on all 3 item-view surfaces).
- "Currently on loan" already shows to other users.

The sync trigger computes the flag as "does *either* table (`item_loans` OR `informal_loans`) have an active loan for this item" rather than blindly asserting based on whichever row just changed — otherwise, if a real and an informal loan ever both touched the same item, whichever trigger fired last could clobber the flag based only on its own table's state. (The double-lending guard mentioned above is what should normally prevent that combination from arising in the first place; this is the belt to that guard's suspenders.)

Mark Returned and Cancel both end up clearing the flag to `false` via the trigger, but they're not symmetric beyond that: Mark Returned *also* explicitly resets `availability_status`/`visibility` to `Not Available`/`private` (matching the real return flow), while Cancel leaves those fields untouched — since a cancelled loan is meant to mean "this never really happened," there's nothing to restore.

---

## The Email

Sent via the existing Resend/edge-function infrastructure (same pattern as every other transactional email here), triggered on creation and on Resend Invite. Contents:

- Item name + photo (if set)
- Who lent it (`preferred_name ?? username`) and the handed-over date
- Expected return date, if set
- Damage/loss terms, if set
- A single claim link: `/loan-invite/<invite_token>`, worded to cover both cases — *"New to The Playa Provides? That link lets you create an account. Already have one under a different email? Same link — just log in instead."*
- A `.ics` calendar attachment for the return date, if set (Resend supports attachments; this is a template addition, not new infrastructure). Two implementation details worth calling out: the base64 encoding has to go through `TextEncoder` first, not a raw `btoa()` call, since `btoa()` throws on any non-Latin1 character — a real risk given item/owner names can plausibly contain accents or emoji. And the event's UID reuses `informal_loan_id` (already a stable, unique value) rather than generating a fresh random one, so resending the invite updates the same calendar event instead of creating a duplicate.

---

## Claim Path

`/loan-invite/<token>` — a public page, reachable without being logged in.

**Pre-auth preview:** shows item name/photo, who lent it, and the terms, so the visitor knows what they're claiming before deciding to log in or sign up. Fetched via a narrow, token-scoped lookup (a small RPC or edge function using service-role access to read just the safe-to-show subset of one row by token) — **not** a broad RLS grant on the table, since the token itself is the only thing standing in for identity at this point.

**After authenticating** (either path — fresh signup or logging into an existing account under any email) and confirming "yes, this is me": a `SECURITY DEFINER` Postgres function, structurally mirroring the existing `confirm_transfer_receipt`, does the conversion atomically:

```sql
create or replace function public.claim_informal_loan(p_token uuid)
returns uuid  -- returns the new item_loans.id
language plpgsql
security definer
set search_path = public
as $$
declare
  v_informal informal_loans%rowtype;
  v_new_loan_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Must be logged in to claim a loan';
  end if;

  if exists (select 1 from informal_loans where invite_token = p_token and owner_id = auth.uid()) then
    raise exception 'You can''t claim your own loan';
  end if;

  -- The status flip IS the concurrency check — not a separate select-then-
  -- update. Two people clicking the same link near-simultaneously must not
  -- both pass a read-only check before either commits; only one caller can
  -- ever successfully flip a row's status away from 'active', so the loser
  -- gets zero rows back here instead of a duplicate item_loans row existing.
  update informal_loans
  set status = 'converted', updated_at = now()
  where invite_token = p_token and status = 'active'
  returning * into v_informal;

  if v_informal.id is null then
    raise exception 'This loan is no longer available to claim';
  end if;

  insert into item_loans (item_id, owner_id, borrower_id, status, return_by, damage_agreement, loss_agreement, notes)
  values (v_informal.item_id, v_informal.owner_id, auth.uid(), 'pending_handover', v_informal.return_by, v_informal.damage_agreement, v_informal.loss_agreement, v_informal.notes)
  returning id into v_new_loan_id;

  update informal_loans set converted_loan_id = v_new_loan_id where id = v_informal.id;

  insert into notifications (recipient_id, actor_id, type, item_id)
  values (v_informal.owner_id, auth.uid(), 'informal_loan_claimed', v_informal.item_id);

  return v_new_loan_id;
end;
$$;
```

The claiming user needs no direct table grants on `informal_loans` — the RPC (running as the definer) does all the sensitive reads/writes, matching how `confirm_transfer_receipt` already handles the equivalent trust boundary for real transfers. This also means nothing here touches `app/auth/callback/route.ts` or `middleware.ts` — claiming happens as a distinct step on the dedicated claim page after a normal login/signup, not inside the auth callback itself (both files are flagged in this project as do-not-touch-without-discussion). Also note: `/login` and `/signup` don't currently support a caller-supplied redirect destination (confirmed by reading both — they hardcode their post-auth landing page), so the claim page doesn't try to auto-return the user after auth; it just tells them to come back to the link, which works with zero changes to either page since the claim page already checks session state on load.

New `item_loans` row starts at `pending_handover`, same as any freshly-created real loan — from that point on, the normal two-sided handshake takes over exactly as it does today.

---

## Notifications

`notifications.type` is a fixed check-constraint enum. This feature needs one new value — something like `informal_loan_claimed` — added via migration alongside everything else, fired when `claim_informal_loan` succeeds so the owner is told their informal loan is now a real, tracked one.

---

## Explicitly Deferred

- Transfer/gift version of this same flow (same underlying mechanism, different modal — natural follow-up, not built now).
- Matching/surfacing *other* pending informal loans to someone claiming one (e.g. if two different owners have informally lent to the same email) — claiming is strictly one-token-at-a-time for now.
- Token expiry — links stay claimable indefinitely.
