# Lend to a Non-Account Holder — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let an owner log an informal, owner-tracked loan to someone without a TPP account (by name + optional email), with an optional claim-link path to upgrade it into a real, two-sided tracked loan if that person later creates or logs into an account.

**Architecture:** A new `informal_loans` table, separate from `item_loans`, with its own simple `active`/`returned`/`cancelled`/`converted` status (no dual confirmation — the owner is the sole source of truth). Reuses the existing `gear_items.is_on_loan` flag (via a new trigger mirroring the existing one on `item_loans`) so every surface that already checks that flag works for free. A `SECURITY DEFINER` RPC (`claim_informal_loan`), modeled directly on the existing `confirm_transfer_receipt`, does the one-time conversion into a real `item_loans` row when/if the borrower claims it via a token-based link. No changes to `app/auth/callback/route.ts`. `middleware.ts` gets one explicitly-authorized, minimal line (Task 9) adding `/loan-invite` to its existing public-route whitelist — required because the claim page's pre-auth preview would otherwise redirect logged-out visitors to `/login` before they ever see what they're being asked to claim.

**Tech Stack:** Next.js 16 App Router, Supabase (Postgres + RLS + Edge Functions), `@supabase/ssr`, Resend for email. No automated test framework exists in this project (`package.json` has no test script/runner) — every task's "verify" step uses `npx tsc --noEmit` plus a concrete manual/SQL check instead of a test suite, matching how every other feature in this codebase has been verified.

**Design doc:** `docs/plans/2026-07-24-lend-to-non-account-holder-design.md` — read that first for the full rationale; this plan assumes it.

---

## Task 1: Migration — `informal_loans` table, RLS, grants, `is_on_loan` sync trigger

**Files:**
- Create via `mcp__supabase__apply_migration` (name: `add_informal_loans_table`), then save the exact SQL Supabase reports to `supabase/migrations/<version>_add_informal_loans_table.sql` per this project's migration-tracking convention (CLAUDE.md: every schema change made via `apply_migration` must also be saved as a file here, named to match what `list_migrations` reports).

**Step 1: Write the migration SQL**

```sql
create table public.informal_loans (
  id uuid primary key default gen_random_uuid(),
  item_id bigint not null references public.gear_items(id),
  owner_id uuid not null references public.profiles(id),
  borrower_name text not null,
  borrower_email text,
  invite_token uuid not null default gen_random_uuid(),
  handed_over_at date not null default current_date,
  return_by date,
  damage_agreement numeric,
  loss_agreement numeric,
  notes text,
  status text not null default 'active' check (status in ('active', 'returned', 'cancelled', 'converted')),
  converted_loan_id uuid references public.item_loans(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index informal_loans_invite_token_idx on public.informal_loans(invite_token);

alter table public.informal_loans enable row level security;

-- Owner-only access — AND the row's item_id must actually belong to the
-- caller. Without the exists() check, `owner_id = auth.uid()` alone is
-- self-attested: anyone could insert a row naming someone ELSE's item_id
-- while setting owner_id to themselves, and the sync trigger below would
-- then falsely mark that other person's item as on-loan. The claim flow (a
-- non-owner, possibly unauthenticated visitor) never touches this table
-- directly — see the get_informal_loan_preview and claim_informal_loan
-- SECURITY DEFINER functions in a later migration, which read/write on the
-- caller's behalf without needing a table grant here.
create policy "owner_can_manage_own_informal_loans" on public.informal_loans
for all
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and exists (select 1 from public.gear_items where id = item_id and user_id = auth.uid())
);

grant select on public.informal_loans to anon;
grant select, insert, update, delete on public.informal_loans to authenticated;
grant select, insert, update, delete on public.informal_loans to service_role;

-- Sync gear_items.is_on_loan from BOTH loan tables' current state, not just
-- "did the row that just fired this trigger become active/inactive." A
-- blind `set is_on_loan = (new.status = 'active')` — mirroring the ORIGINAL
-- naive version of the existing item_loans trigger — has a cross-table
-- clobber risk: if a real loan and an informal loan ever both touch the
-- same item (shouldn't happen via the UI's is_on_loan gating, but nothing
-- at the DB level currently prevents it — see the defensive check added
-- below), whichever trigger fires last would blindly overwrite the flag
-- based on only its own table, potentially clearing it while the OTHER
-- loan is still genuinely active. Computing it as an OR across both tables
-- makes each trigger self-correcting regardless of fire order.
create or replace function public.sync_gear_item_loan_flag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.gear_items
  set is_on_loan = (
    exists (select 1 from public.item_loans where item_id = new.item_id and status in ('pending_handover', 'active', 'return_pending'))
    or exists (select 1 from public.informal_loans where item_id = new.item_id and status = 'active')
  )
  where id = new.item_id;
  return new;
end;
$$;

-- Re-point the EXISTING item_loans trigger at the same updated (OR-based)
-- function — it already existed as sync_gear_item_loan_flag before this
-- migration (see 20260717200252_add_gear_items_is_on_loan_flag.sql); we're
-- upgrading its body in place via create-or-replace above, so this
-- create-trigger is a no-op confirmation, not a new trigger. Listed here
-- for clarity that it now depends on the OR-based version too.
drop trigger if exists item_loans_sync_gear_flag on public.item_loans;
create trigger item_loans_sync_gear_flag
  after insert or update of status on public.item_loans
  for each row
  execute function public.sync_gear_item_loan_flag();

create trigger informal_loans_sync_gear_flag
  after insert or update of status on public.informal_loans
  for each row
  execute function public.sync_gear_item_loan_flag();

-- Defense-in-depth against creating an informal loan for an item that's
-- already on loan (real or informal). The inventory UI's "Lend To" button
-- (renderActionButton) currently only checks for a *pending* real loan
-- before showing itself — it does NOT check for an already-active one, a
-- pre-existing gap found while writing this plan (out of scope to fix
-- here, but worth knowing about). This trigger closes that gap for
-- informal loans specifically at the data layer, regardless of what the
-- UI does or doesn't gate correctly.
create or replace function public.prevent_informal_loan_on_active_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'active' and exists (select 1 from public.gear_items where id = new.item_id and is_on_loan = true) then
    raise exception 'This item is already on loan';
  end if;
  return new;
end;
$$;

create trigger informal_loans_prevent_double_loan
  before insert on public.informal_loans
  for each row
  execute function public.prevent_informal_loan_on_active_item();
```

**Step 2: Apply it**

Use `mcp__supabase__apply_migration` with `project_id: bklycpitofjrjhizttny`, `name: add_informal_loans_table`, and the SQL above as `query`.

**Step 3: Verify**

Run (via `mcp__supabase__execute_sql`):
```sql
select column_name, is_nullable, data_type from information_schema.columns
where table_schema = 'public' and table_name = 'informal_loans'
order by ordinal_position;
```
Expected: 14 rows matching the columns above, `borrower_name`/`owner_id`/`item_id`/`status` as `NO` (not nullable).

Then confirm RLS is on and both triggers exist:
```sql
select relrowsecurity from pg_class where relname = 'informal_loans';
select tgname from pg_trigger where tgrelid = 'public.informal_loans'::regclass;
select tgname from pg_trigger where tgrelid = 'public.item_loans'::regclass;
```
Expected: `relrowsecurity = true`; `informal_loans` has both `informal_loans_sync_gear_flag` and `informal_loans_prevent_double_loan`; `item_loans` still has `item_loans_sync_gear_flag` (now pointing at the upgraded OR-based function body).

Also confirm the ownership check actually blocks a mismatched insert — as a second test account (or via a query with a mismatched item_id/owner_id pair), verify an insert naming an item_id you don't own gets rejected by RLS, and that inserting a second informal loan for an item that's already `is_on_loan = true` raises the "already on loan" exception from the new trigger.

**Step 4: Save the migration file**

Run `mcp__supabase__list_migrations`, find the version Supabase assigned to `add_informal_loans_table`, and write the exact SQL from Step 1 to `supabase/migrations/<version>_add_informal_loans_table.sql`.

**Step 5: Commit**

```bash
git add supabase/migrations/<version>_add_informal_loans_table.sql
git commit -m "feat: add informal_loans table for lending to non-account holders"
```

---

## Task 2: Migration — extend `notifications.type` with `informal_loan_claimed`

**Files:**
- Create via `mcp__supabase__apply_migration` (name: `add_informal_loan_claimed_notification_type`), then save to `supabase/migrations/`.

**Step 1: Write the migration SQL**

Postgres can't `ALTER ... ADD VALUE` cleanly inside a transaction alongside other changes when the constraint is a plain `CHECK`, not a native enum — this project uses a `CHECK` constraint, not a native Postgres enum type. Confirmed directly against the live database (not just inferred from the design doc) via:
```sql
select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.notifications'::regclass and contype = 'c';
```
which returns exactly one row, `conname = notifications_type_check`, with a definition matching the 18 existing values listed below. So this is a drop-and-recreate:

```sql
alter table public.notifications drop constraint notifications_type_check;

alter table public.notifications add constraint notifications_type_check
check (type in (
  'new_item', 'new_follower', 'transfer_accepted', 'transfer_declined',
  'loan_accepted', 'loan_declined', 'item_request', 'camp_join',
  'camp_claim_approved', 'camp_claim_denied', 'loan_return_confirmed',
  'camp_member_removed', 'wish_list_match', 'loan_pickup_ready',
  'transfer_pickup_ready', 'loan_return_pending', 'loan_initiated',
  'transfer_initiated', 'informal_loan_claimed'
));
```

**Step 2: Apply it** via `mcp__supabase__apply_migration`.

**Step 3: Verify**

```sql
select conname, pg_get_constraintdef(oid) from pg_constraint
where conrelid = 'public.notifications'::regclass and contype = 'c';
```
Expected: the definition includes `'informal_loan_claimed'`.

**Step 4: Save the migration file** to `supabase/migrations/<version>_add_informal_loan_claimed_notification_type.sql`, matching what `list_migrations` reports.

**Step 5: Commit**

```bash
git add supabase/migrations/<version>_add_informal_loan_claimed_notification_type.sql
git commit -m "feat: add informal_loan_claimed notification type"
```

---

## Task 3: Migration — `get_informal_loan_preview` and `claim_informal_loan` RPCs

**Files:**
- Create via `mcp__supabase__apply_migration` (name: `add_informal_loan_claim_functions`), then save to `supabase/migrations/`.

**Step 1: Write the migration SQL**

```sql
-- Public, token-scoped preview for the pre-auth claim page. Returns only the
-- safe-to-show subset — never exposes owner_id, borrower_email, or lets the
-- caller enumerate rows without already knowing the token.
create or replace function public.get_informal_loan_preview(p_token uuid)
returns table (
  item_name text,
  item_image_url text,
  owner_display_name text,
  handed_over_at date,
  return_by date,
  damage_agreement numeric,
  loss_agreement numeric,
  status text
)
language sql
security definer
set search_path = public
as $$
  select
    gi.item_name,
    gi.image_urls[1],
    coalesce(p.preferred_name, p.username),
    il.handed_over_at,
    il.return_by,
    il.damage_agreement,
    il.loss_agreement,
    il.status
  from public.informal_loans il
  join public.gear_items gi on gi.id = il.item_id
  join public.profiles p on p.id = il.owner_id
  where il.invite_token = p_token;
$$;

-- Converts an informal loan into a real, tracked item_loans row for the
-- CALLING (already-authenticated) user. Mirrors confirm_transfer_receipt's
-- trust boundary: the caller never gets a direct table grant on
-- informal_loans for this — this function does the sensitive read/write on
-- their behalf, scoped strictly to the one row matching the token.
--
-- The status flip IS the concurrency check (`where ... and status =
-- 'active'`), not a separate select-then-update — two people clicking the
-- same claim link near-simultaneously must not both be able to pass a
-- read-only check before either commits. Only one concurrent caller can
-- ever successfully flip a given row's status away from 'active'; the
-- loser's UPDATE simply matches zero rows, so v_informal.id comes back
-- null for them and they get a clean "no longer available" error instead
-- of a duplicate item_loans row being created.
create or replace function public.claim_informal_loan(p_token uuid)
returns uuid
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

**A note on why the self-claim check runs before the atomic update, as a separate read:** if it ran after (checking `v_informal.owner_id = auth.uid()` post-update), an owner accidentally clicking their own claim link would still be safe — an unhandled `raise exception` in PL/pgSQL rolls back everything the function did up to that point, including the status flip — but checking first avoids wastefully flipping and rolling back a row's status for a request that was always going to fail.

**Step 2: Apply it** via `mcp__supabase__apply_migration`.

**Step 3: Verify**

```sql
select proname from pg_proc where proname in ('get_informal_loan_preview', 'claim_informal_loan');
```
Expected: both listed.

Then do an end-to-end dry run with real data (replace the IDs with a real test item/owner from `@alex` or `@abm`):
```sql
-- as service_role, simulate what LendModal's insert will do:
insert into informal_loans (item_id, owner_id, borrower_name, borrower_email, return_by)
values (<a real gear_items.id owned by test account>, '<that owner''s profile id>', 'Test Borrower', 'test@example.com', current_date + 7)
returning id, invite_token;
```
Note the returned `invite_token`, then:
```sql
select * from get_informal_loan_preview('<that token>');
```
Expected: one row with the item's real name/photo and the terms just inserted. This confirms the preview function works before wiring up the UI.

Then, as an authenticated call (via the Supabase dashboard SQL editor running `set role authenticated; set request.jwt.claim.sub = '<a different test account's user id>';` or more simply by testing this end-to-end once the claim page exists in Task 9), call `select claim_informal_loan('<that token>');` **twice in a row**. Expected: the first call succeeds and returns a new `item_loans` id; the second call raises "This loan is no longer available to claim" — confirming the atomic status-flip actually prevents a double-claim rather than just happening to work once. Leave this test row in place for Task 9's manual verification, or delete it now with `delete from informal_loans where id = '<id>'` if you'd rather start clean later.

**Step 4: Save the migration file** to `supabase/migrations/<version>_add_informal_loan_claim_functions.sql`.

**Step 5: Commit**

```bash
git add supabase/migrations/<version>_add_informal_loan_claim_functions.sql
git commit -m "feat: add get_informal_loan_preview and claim_informal_loan RPCs"
```

---

## Task 4: `LendModal.tsx` — "Lend to them anyway" fallback

**Files:**
- Modify: `components/LendModal.tsx`

**Step 1: Add state for the informal-loan fallback**

In `components/LendModal.tsx`, after the existing `lookupError` state (around line 24), add:

```tsx
  const [showInformalForm, setShowInformalForm] = useState(false)
  const [informalName, setInformalName] = useState('')
  const [handedOverAt, setHandedOverAt] = useState(new Date().toISOString().slice(0, 10))
```

**Step 2: Track the last-searched email for the fallback**

The existing `handleLookup` only has local `query`/`q`. Add a new piece of state to remember whether the last search was an email (so the fallback button only shows then), right next to `lookupError`:

```tsx
  const [lastSearchWasEmail, setLastSearchWasEmail] = useState(false)
```

In `handleLookup`, right after `const q = query.trim().toLowerCase()`, add:
```tsx
    setLastSearchWasEmail(q.includes('@'))
```

**Step 3: Add the fallback button and informal form, and hide the lookup box while in informal mode**

This step matters more than it looks: once `showInformalForm` is true, the original lookup box **must** stop being usable. Without this, a user could trigger the informal flow, then successfully search again and get a real `matched` user set — but `handleConfirm` branches on `showInformalForm`, not on whether `matched` is set, so it would silently create an *informal* loan even though a real account was just found. Hiding the lookup box (rather than just leaving it inert) also gives a clear "back to search" escape hatch.

Replace the existing lookup block (the `<div>` containing the input + Find button) and the error block together:
```tsx
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setMatched(null); setLookupError('') }}
            onKeyDown={e => e.key === 'Enter' && handleLookup()}
            placeholder="username or email"
            style={inputStyle}
          />
          <button onClick={handleLookup} style={lookupButtonStyle}>Find</button>
        </div>
        {lookupError && <p style={errorStyle}>{lookupError}</p>}
```
with:
```tsx
        {!showInformalForm && (
          <>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input
                value={query}
                onChange={e => { setQuery(e.target.value); setMatched(null); setLookupError('') }}
                onKeyDown={e => e.key === 'Enter' && handleLookup()}
                placeholder="username or email"
                style={inputStyle}
              />
              <button onClick={handleLookup} style={lookupButtonStyle}>Find</button>
            </div>
            {lookupError && (
              <div>
                <p style={errorStyle}>{lookupError}</p>
                {lastSearchWasEmail && (
                  <button onClick={() => setShowInformalForm(true)} style={lendAnywayButtonStyle}>
                    Lend to them anyway →
                  </button>
                )}
              </div>
            )}
          </>
        )}
        {showInformalForm && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.85rem', color: '#666' }}>Lending to <strong>{query}</strong> (no account)</span>
              <button
                onClick={() => { setShowInformalForm(false); setInformalName(''); setLookupError(''); }}
                style={{ background: 'none', border: 'none', color: '#1E8A82', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
              >
                ← back to search
              </button>
            </div>
            <label style={labelStyle}>Their name</label>
            <input
              value={informalName}
              onChange={e => setInformalName(e.target.value)}
              placeholder="e.g. Jamie"
              style={inputStyle}
            />
            <label style={{ ...labelStyle, marginTop: '10px' }}>Handed over on</label>
            <input
              type="date"
              value={handedOverAt}
              onChange={e => setHandedOverAt(e.target.value)}
              style={inputStyle}
            />
          </div>
        )}
```

Note this also removes the old standalone `{matched && (...)}` block's redundancy with the lookup box's visibility — that block should stay as-is (it's already conditional on `matched`, which can now only be truthy when the lookup box is visible, i.e. `!showInformalForm`, since `setMatched(null)` fires on every query edit and the informal path never sets it).

**Step 4: Add the `lendAnywayButtonStyle` constant**

Near the other style constants at the bottom of the file, add:
```tsx
const lendAnywayButtonStyle: React.CSSProperties = { marginTop: '6px', padding: '8px 14px', backgroundColor: 'transparent', color: '#1E8A82', border: '1.5px solid #1E8A82', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }
```

**Step 5: Branch the confirm handler**

Replace `handleConfirm`'s guard and body to branch on `showInformalForm`. Change:
```tsx
  const handleConfirm = async () => {
    if (!matched) return
```
to:
```tsx
  const handleConfirm = async () => {
    if (!showInformalForm && !matched) return
    if (showInformalForm && !informalName.trim()) return
```

Then, inside the `try` block, replace the single `item_loans` insert + notification with a branch. The full new body:

```tsx
    setSubmitting(true)
    setSubmitError('')
    try {
      if (showInformalForm) {
        const { data: informalLoan, error } = await supabase
          .from('informal_loans')
          .insert({
            item_id: item.id,
            owner_id: ownerId,
            borrower_name: informalName.trim(),
            borrower_email: query.trim().toLowerCase(),
            handed_over_at: handedOverAt,
            return_by: returnBy || null,
            damage_agreement: damageAgreement ? parseFloat(damageAgreement) : null,
            loss_agreement: lossAgreement ? parseFloat(lossAgreement) : null,
            notes: notes || null,
          })
          .select()
          .single()
        if (error) throw error

        await supabase.functions.invoke('send-informal-loan-invite', {
          body: { informal_loan_id: informalLoan.id },
        })
      } else {
        if (!matched) return
        const { data: loan, error } = await supabase
          .from('item_loans')
          .insert({
            item_id: item.id,
            owner_id: ownerId,
            borrower_id: matched.id,
            return_by: returnBy || null,
            damage_agreement: damageAgreement ? parseFloat(damageAgreement) : null,
            loss_agreement: lossAgreement ? parseFloat(lossAgreement) : null,
            notes: notes || null,
          })
          .select()
          .single()
        if (error) throw error

        await supabase.from('notifications').insert({
          type: 'loan_initiated',
          recipient_id: matched.id,
          actor_id: ownerId,
          item_id: item.id,
        })

        await supabase.functions.invoke('send-loan-notification', {
          body: { type: 'initiated', loan_id: loan.id },
        })
      }

      onSuccess()
    } catch (err: any) {
      setSubmitError(err.message || 'Something went wrong.')
      setSubmitting(false)
    }
```

**Step 6: Update the Confirm button's disabled condition and label**

Change:
```tsx
          <button
            onClick={handleConfirm}
            disabled={!matched || submitting}
            style={{ ...confirmButtonStyle, opacity: (!matched || submitting) ? 0.5 : 1 }}
          >
            {submitting ? 'Sending...' : 'Confirm Loan'}
          </button>
```
to:
```tsx
          <button
            onClick={handleConfirm}
            disabled={(!showInformalForm && !matched) || (showInformalForm && !informalName.trim()) || submitting}
            style={{ ...confirmButtonStyle, opacity: ((!showInformalForm && !matched) || (showInformalForm && !informalName.trim()) || submitting) ? 0.5 : 1 }}
          >
            {submitting ? 'Sending...' : showInformalForm ? 'Lend Item' : 'Confirm Loan'}
          </button>
```

**Step 7: Verify**

Run:
```bash
npx tsc --noEmit
```
Expected: no new errors in `components/LendModal.tsx` (pre-existing unrelated errors elsewhere in the project are fine — this session's baseline already has some in `app/page.tsx` and `lib/supabaseClient.ts`).

Then manually check in the browser preview: open Lend on any item you own, search an email with no matching account, confirm the "Lend to them anyway →" button appears (and does *not* appear if you search a made-up username instead), click it, confirm the Name + Handed over on fields appear, and that Confirm Loan is disabled until Name is filled in.

**Step 8: Commit**

```bash
git add components/LendModal.tsx
git commit -m "feat: LendModal — lend to someone without an account"
```

---

## Task 5: Edge function `send-informal-loan-invite` (email + calendar invite)

**Files:**
- Create: `supabase/functions/send-informal-loan-invite/index.ts`
- Deploy manually via Supabase Dashboard → Edge Functions (per this project's established pattern — no CLI deploy on this machine), Verify JWT off, matching every other edge function here.

**Step 1: Write the function**

```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SITE_URL = 'https://theplayaprovides.com'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

function formatDate(d: string | null) {
  if (!d) return null
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

// btoa() throws on any character outside Latin1 — a real risk here since
// itemName/ownerName come from user-entered profile/item data and this is a
// Burning Man community app (accented characters, emoji in names are
// plausible). Route through TextEncoder first so the base64 is built from
// actual UTF-8 bytes instead of raw JS string code units.
function toBase64(str: string) {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  bytes.forEach(b => { binary += String.fromCharCode(b) })
  return btoa(binary)
}

// ICS text values need commas/semicolons/backslashes/newlines escaped per
// RFC 5545 — without this, an item name or owner name containing e.g. a
// comma could produce a malformed calendar file some clients reject.
function icsEscape(text: string) {
  return text.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')
}

// Minimal single-event ICS — no library needed, this is just a text format.
// UID reuses informal_loan_id (already a stable, unique UUID) rather than
// generating a fresh random one — that makes a resent invite update the
// SAME calendar event in the recipient's calendar app instead of creating
// a duplicate, and avoids introducing crypto.randomUUID() as a new,
// unverified-in-this-codebase API for something that already has a
// perfectly good stable ID available.
function buildIcs(uid: string, summary: string, description: string, dateStr: string) {
  const d = dateStr.replace(/-/g, '')
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//The Playa Provides//EN',
    'BEGIN:VEVENT',
    `UID:${uid}@theplayaprovides.com`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `DTSTART;VALUE=DATE:${d}`,
    `DTEND;VALUE=DATE:${d}`,
    `SUMMARY:${icsEscape(summary)}`,
    `DESCRIPTION:${icsEscape(description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

Deno.serve(async (req) => {
  try {
    const { informal_loan_id } = await req.json()

    const { data: loan, error } = await supabase
      .from('informal_loans')
      .select('id, invite_token, borrower_name, borrower_email, handed_over_at, return_by, damage_agreement, loss_agreement, notes, gear_items(item_name, image_urls), owner:profiles!informal_loans_owner_id_fkey(preferred_name, username)')
      .eq('id', informal_loan_id)
      .single()

    if (error || !loan) throw new Error(error?.message ?? 'Informal loan not found')
    if (!loan.borrower_email) {
      return new Response(JSON.stringify({ ok: true, skipped: 'no email on file' }), { status: 200 })
    }

    const ownerName = (loan.owner as any)?.preferred_name || (loan.owner as any)?.username || 'Someone'
    const itemName = (loan.gear_items as any)?.item_name || 'an item'
    const claimUrl = `${SITE_URL}/loan-invite/${loan.invite_token}`
    const returnByFormatted = formatDate(loan.return_by)

    const termsRows = [
      `<tr><td style="padding:4px 8px;color:#555;">Handed over</td><td style="padding:4px 8px;font-weight:bold;">${formatDate(loan.handed_over_at)}</td></tr>`,
      returnByFormatted ? `<tr style="background:#f9f9f9;"><td style="padding:4px 8px;color:#555;">Expected back</td><td style="padding:4px 8px;font-weight:bold;">${returnByFormatted}</td></tr>` : '',
      loan.damage_agreement != null ? `<tr><td style="padding:4px 8px;color:#555;">If damaged</td><td style="padding:4px 8px;font-weight:bold;">$${loan.damage_agreement}</td></tr>` : '',
      loan.loss_agreement != null ? `<tr style="background:#f9f9f9;"><td style="padding:4px 8px;color:#555;">If not returned</td><td style="padding:4px 8px;font-weight:bold;">$${loan.loss_agreement}</td></tr>` : '',
      loan.notes ? `<tr><td style="padding:4px 8px;color:#555;">Notes</td><td style="padding:4px 8px;">${loan.notes}</td></tr>` : '',
    ].filter(Boolean).join('')

    const html = `
<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:20px;">
  <h1 style="font-size:18px;color:#111;">${ownerName} lent you ${itemName}</h1>
  <table style="border-collapse:collapse;width:100%;font-size:14px;margin:16px 0;">${termsRows}</table>
  <p style="font-size:14px;color:#333;">
    <a href="${claimUrl}" style="display:inline-block;padding:12px 20px;background:#1E8A82;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">View this loan</a>
  </p>
  <p style="font-size:13px;color:#666;">
    New to The Playa Provides? That link lets you create an account. Already have one under a different email? Same link — just log in instead.
  </p>
</div>`

    const emailBody: any = {
      from: 'hello@theplayaprovides.com',
      to: loan.borrower_email,
      subject: `${ownerName} lent you ${itemName}`,
      html,
    }

    if (returnByFormatted) {
      const ics = buildIcs(loan.id, `Return ${itemName} to ${ownerName}`, `Via The Playa Provides: ${claimUrl}`, loan.return_by)
      emailBody.attachments = [{
        filename: 'return-reminder.ics',
        content: toBase64(ics),
      }]
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(emailBody),
    })

    if (!res.ok) throw new Error(`Resend error: ${await res.text()}`)

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
```

**Step 2: Deploy**

This machine has no Supabase CLI deploy set up (per this project's established pattern — every other edge function here is deployed manually). Use `mcp__supabase__deploy_edge_function` with `project_id: bklycpitofjrjhizttny`, `name: send-informal-loan-invite`, and the file content above. Verify JWT should be OFF, matching every other function in this project (they're invoked from the client with the anon key, not a user JWT).

**Step 3: Verify**

Using the test `informal_loans` row from Task 3 Step 3 (or create a fresh one), invoke it directly:
```bash
curl -X POST 'https://bklycpitofjrjhizttny.supabase.co/functions/v1/send-informal-loan-invite' \
  -H 'Content-Type: application/json' \
  -d '{"informal_loan_id": "<the test row id>"}'
```
Expected: `{"ok":true}` and an email arrives at the test address with the item name, terms, claim link, and (if `return_by` was set) an `.ics` attachment that opens correctly in a calendar app. Note: this project has no prior example of a Resend attachment anywhere in its edge functions, so the `attachments: [{filename, content}]` shape above is based on Resend's documented API rather than in-codebase precedent — this manual send-and-open-the-ics-file check is what actually confirms it works, don't skip it.

**Step 4: Commit**

```bash
git add supabase/functions/send-informal-loan-invite/index.ts
git commit -m "feat: add send-informal-loan-invite edge function"
```

Then update `TASKS.md`'s "Edge function deploys" reminder area (per this project's convention of flagging when a function needs to be pasted into the Dashboard) — not needed here since Step 2 already deployed it via MCP, but note in `TASKS.md` that it's live.

---

## Task 6: Inventory — show informal loans, Mark Returned

**Files:**
- Modify: `app/inventory/client-page.tsx`

**Step 1: Add state and fetch informal loans**

Near `const [activeLoans, setActiveLoans] = useState<any[]>([]);` (line 32), add:
```tsx
  const [informalLoans, setInformalLoans] = useState<any[]>([]);
```

Near the existing loan fetch (around line 119-125), add immediately after `setActiveLoans(loanData || []);`:
```tsx
        // Fetch active informal loans (owner side) — no-account borrowers
        const { data: informalLoanData } = await supabase
          .from('informal_loans')
          .select('id, item_id, borrower_name, borrower_email, handed_over_at, return_by, status, gear_items(item_name)')
          .eq('owner_id', user.id)
          .eq('status', 'active');
        setInformalLoans(informalLoanData || []);
```

**Step 2: Add the Mark Returned handler**

The real loan flow's `handleOwnerConfirmReturn` (line 370-381) doesn't just close out the loan — it also resets the item to `Not Available`/`private` afterward, so the owner has to consciously re-list it rather than it silently popping back to whatever availability it had mid-loan. Mark Returned should match that, not just clear `is_on_loan` (which the trigger from Task 1 already handles automatically on the status update — this second query is specifically for the availability/visibility reset, which nothing else does for you).

Near `handleCancelLoan` (line 334), add:
```tsx
  async function handleMarkInformalLoanReturned(loan: any) {
    const { error } = await supabase
      .from('informal_loans')
      .update({ status: 'returned' })
      .eq('id', loan.id);
    if (error) return;
    await supabase
      .from('gear_items')
      .update({ availability_status: 'Not Available', visibility: 'private' })
      .eq('id', loan.item_id);
    setInformalLoans(prev => prev.filter(l => l.id !== loan.id));
  }
```

**Step 3: Render informal loans in the "Items Out on Loan" table**

The table currently only renders `activeLoans` rows. Change the empty-state check (line 869) from:
```tsx
              {activeLoans.filter(l => ['active', 'return_pending'].includes(l.status)).length === 0 && (
```
to:
```tsx
              {activeLoans.filter(l => ['active', 'return_pending'].includes(l.status)).length === 0 && informalLoans.length === 0 && (
```

Then, immediately after the closing `})}` of the existing `activeLoans.filter(...).map(...)` block (right before `</tbody>`, around line 908), add a second `.map()` for informal loans:

```tsx
              {informalLoans.map(loan => {
                const returnBy = loan.return_by ? new Date(loan.return_by).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
                const handedOverOn = new Date(loan.handed_over_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                const itemName = loan.gear_items?.item_name || items.find(i => i.id === loan.item_id)?.item_name || '—';
                return (
                  <tr key={`informal-${loan.id}`} style={rowStyle}>
                    <td style={{ ...tdStyle, fontWeight: 600, color: '#1C1610' }}>
                      {itemName}
                      <a href={`/find-items/${loan.item_id}`} style={editLinkStyle}>View Item Details</a>
                    </td>
                    <td style={tdStyle}>
                      {loan.borrower_name} <span style={{ color: '#9A8878', fontSize: '0.78rem' }}>(no account)</span>
                    </td>
                    <td style={tdStyle}>{handedOverOn}</td>
                    <td style={tdStyle}>{returnBy}</td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: '0.8rem', color: '#555' }}>Out on Loan</span>
                    </td>
                    <td style={tdActionStyle}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => handleMarkInformalLoanReturned(loan)} style={handsOverButtonStyle}>Mark Returned</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
```

(Cancel and Resend Invite buttons are added to this same action cell in Tasks 7 and 8.)

**Step 4: Verify**

```bash
npx tsc --noEmit
```
Expected: no new errors.

Manually: insert a test `informal_loans` row (as in Task 3 Step 3) for an item you own, reload `/inventory`, confirm it appears in "Items Out on Loan" labeled "(no account)", and that clicking **Mark Returned** removes it from the list and (`select is_on_loan, availability_status, visibility from gear_items where id = <item_id>`) confirms `is_on_loan = false` (via the trigger), `availability_status = 'Not Available'`, and `visibility = 'private'` (via this handler's second update).

**Step 5: Commit**

```bash
git add app/inventory/client-page.tsx
git commit -m "feat: inventory — show informal loans, Mark Returned"
```

---

## Task 7: Inventory — Cancel informal loan

**Files:**
- Modify: `app/inventory/client-page.tsx`

**Step 1: Add the handler**

Next to `handleMarkInformalLoanReturned` from Task 6, add:
```tsx
  async function handleCancelInformalLoan(loan: any) {
    const { error } = await supabase
      .from('informal_loans')
      .update({ status: 'cancelled' })
      .eq('id', loan.id);
    if (!error) setInformalLoans(prev => prev.filter(l => l.id !== loan.id));
  }
```

**Step 2: Add the button**

In the informal-loan row's action cell from Task 6 Step 3, add a Cancel button next to Mark Returned:
```tsx
                        <button onClick={() => handleCancelInformalLoan(loan)} style={cancelActionButtonStyle}>Cancel</button>
```

**Step 3: Verify**

```bash
npx tsc --noEmit
```
Manually: create a fresh test informal loan, click Cancel, confirm it disappears from the list and `select status from informal_loans where id = ...` shows `'cancelled'`, and `gear_items.is_on_loan` is back to `false`.

**Step 4: Commit**

```bash
git add app/inventory/client-page.tsx
git commit -m "feat: inventory — cancel an informal loan"
```

---

## Task 8: Inventory — Resend Invite

**Files:**
- Modify: `app/inventory/client-page.tsx`

**Step 1: Add the handler, reusing the existing cooldown pattern**

This project already has a generic `isReminderOnCooldown(key)` / `reminderSentAt` / `sendingReminderKey` mechanism (used for both loan and transfer reminders — see line 290-358). Reuse it with a new key prefix. Next to `handleSendLoanReminder`, add:
```tsx
  async function handleResendInformalLoanInvite(loan: any) {
    const key = `informal_${loan.id}`;
    if (isReminderOnCooldown(key) || sendingReminderKey === key) return;
    setSendingReminderKey(key);
    try {
      await supabase.functions.invoke('send-informal-loan-invite', {
        body: { informal_loan_id: loan.id },
      });
      const now = Date.now();
      localStorage.setItem(`tpp_reminder_${key}`, String(now));
      setReminderSentAt(prev => ({ ...prev, [key]: now }));
    } catch (err) {
      console.error('Resend informal loan invite error:', err);
    } finally {
      setSendingReminderKey(null);
    }
  }
```

**Step 2: Add the button**

In the informal-loan row's action cell, add (only when there's an email to resend to):
```tsx
                        {loan.borrower_email && (() => {
                          const key = `informal_${loan.id}`;
                          const onCooldown = isReminderOnCooldown(key);
                          return (
                            <button
                              onClick={() => handleResendInformalLoanInvite(loan)}
                              disabled={sendingReminderKey === key || onCooldown}
                              style={{ ...reminderButtonStyle, opacity: (sendingReminderKey === key || onCooldown) ? 0.5 : 1, cursor: (sendingReminderKey === key || onCooldown) ? 'default' : 'pointer' }}
                            >
                              {sendingReminderKey === key ? 'Sending…' : onCooldown ? 'Invite Sent' : 'Resend Invite'}
                            </button>
                          );
                        })()}
```

Also select `borrower_email` in the Task 6 Step 1 fetch — update that `.select(...)` to include it (it's already in the field list given in Step 1 above, double check it's there).

**Step 3: Verify**

```bash
npx tsc --noEmit
```
Manually: click Resend Invite on a test informal loan with an email set, confirm a second email arrives, and that clicking again immediately shows "Invite Sent" (disabled) rather than sending a duplicate — matching the existing Remind button's 24h cooldown behavior.

**Step 4: Commit**

```bash
git add app/inventory/client-page.tsx
git commit -m "feat: inventory — resend informal loan invite"
```

---

## Task 9: Claim page — `app/loan-invite/[token]/page.tsx`

**Files:**
- Create: `app/loan-invite/[token]/page.tsx`
- Create: `app/loan-invite/[token]/client-page.tsx`
- Modify: `middleware.ts` — **authorized explicitly by Alex** for this specific one-line addition (this file is normally do-not-touch-without-discussion per CLAUDE.md). Without this, `middleware.ts`'s `isPublicRoute` whitelist doesn't include `/loan-invite`, so a logged-out visitor clicking the claim link gets redirected to `/login` before the page ever renders — breaking the pre-auth preview entirely.
- Modify: `app/robots.ts` — this page should stay indexable/public (it's meant to be reached via an emailed link, not search, but doesn't contain anything sensitive since the preview RPC only returns the safe subset) — no change actually needed here; leave it out of the disallow list.

**Step 0: Add `/loan-invite` to `middleware.ts`'s public-route whitelist**

In `middleware.ts`, find:
```ts
  const isPublicRoute = ['/login', '/signup', '/'].includes(url.pathname) || url.pathname.startsWith('/auth') || url.pathname.startsWith('/resources') || url.pathname.startsWith('/about') || url.pathname.startsWith('/privacy') || url.pathname.startsWith('/terms') || url.pathname.startsWith('/find-items')
```
Change to:
```ts
  const isPublicRoute = ['/login', '/signup', '/'].includes(url.pathname) || url.pathname.startsWith('/auth') || url.pathname.startsWith('/resources') || url.pathname.startsWith('/about') || url.pathname.startsWith('/privacy') || url.pathname.startsWith('/terms') || url.pathname.startsWith('/find-items') || url.pathname.startsWith('/loan-invite')
```
This is the only change to this file — same pattern already used for `/find-items` etc., not a change to the redirect logic itself. Commit it separately from the page files so it's easy to review/revert in isolation if needed:
```bash
git add middleware.ts
git commit -m "feat: middleware — allow logged-out access to /loan-invite (claim page preview)"
```

**Step 1: Server wrapper**

`app/loan-invite/[token]/page.tsx`:
```tsx
import ClientPage from './client-page'

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <ClientPage token={token} />
}
```

**Step 2: Client page**

This is a public, unauthenticated landing page — the first thing a potential new user sees when they click the link in the invite email. It should look like the rest of the site (the same "Playful Field Guide" design system every other page uses — Arvo headlines, ink/paper palette, offset-shadow buttons), not bare unstyled HTML. Styled here to match `app/login/page.tsx`'s existing centered-card pattern closely, reusing the same token values.

`app/loan-invite/[token]/client-page.tsx`:
```tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

const INK      = '#1C1610'
const INK_MID  = '#4A3828'
const INK_LITE = '#9A8878'
const PAPER    = '#F6F1E8'
const PAPER_LT = '#FDFAF4'
const TEAL     = '#1E8A82'

interface Preview {
  item_name: string
  item_image_url: string | null
  owner_display_name: string
  handed_over_at: string
  return_by: string | null
  damage_agreement: number | null
  loss_agreement: number | null
  status: string
}

export default function ClientPage({ token }: { token: string }) {
  const [preview, setPreview] = useState<Preview | null>(null)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<any>(null)
  const [claiming, setClaiming] = useState(false)
  const [claimError, setClaimError] = useState('')
  const [claimed, setClaimed] = useState(false)

  useEffect(() => {
    supabase.rpc('get_informal_loan_preview', { p_token: token }).then(({ data, error }) => {
      if (!error && data && data.length > 0) setPreview(data[0])
      setLoading(false)
    })
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
  }, [token])

  async function handleClaim() {
    setClaiming(true)
    setClaimError('')
    const { error } = await supabase.rpc('claim_informal_loan', { p_token: token })
    if (error) {
      setClaimError(error.message)
      setClaiming(false)
    } else {
      setClaimed(true)
    }
  }

  if (loading) {
    return <div style={pageStyle}><div style={cardStyle}><p style={{ color: INK_MID }}>Loading…</p></div></div>
  }

  if (!preview) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h1 style={h1Style}>Not found</h1>
          <p style={{ color: INK_MID }}>This loan invite wasn&apos;t found.</p>
        </div>
      </div>
    )
  }

  if (claimed) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h1 style={h1Style}>You&apos;re all <em style={{ fontStyle: 'italic', color: TEAL }}>set!</em></h1>
          <p style={{ color: INK_MID, marginBottom: '20px' }}>This loan is now linked to your account.</p>
          <a href="/inventory" style={primaryBtnStyle}>Go to your inventory →</a>
        </div>
      </div>
    )
  }

  if (preview.status !== 'active') {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h1 style={h1Style}>No longer available</h1>
          <p style={{ color: INK_MID }}>This loan invite is no longer available (it&apos;s already {preview.status}).</p>
        </div>
      </div>
    )
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={eyebrowStyle}>You&apos;ve been lent something</div>
        <h1 style={h1Style}>{preview.owner_display_name} lent you <em style={{ fontStyle: 'italic', color: TEAL }}>{preview.item_name}</em></h1>

        {preview.item_image_url && (
          <img src={preview.item_image_url} alt={preview.item_name} style={{ width: '100%', maxHeight: '220px', objectFit: 'cover' as const, border: `2px solid ${INK}`, marginBottom: '16px' }} />
        )}

        <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: '0.9rem', marginBottom: '20px' }}>
          <tbody>
            <tr><td style={termLabelStyle}>Handed over</td><td style={termValueStyle}>{new Date(preview.handed_over_at).toLocaleDateString()}</td></tr>
            {preview.return_by && <tr><td style={termLabelStyle}>Expected back</td><td style={termValueStyle}>{new Date(preview.return_by).toLocaleDateString()}</td></tr>}
            {preview.damage_agreement != null && <tr><td style={termLabelStyle}>If damaged</td><td style={termValueStyle}>${preview.damage_agreement}</td></tr>}
            {preview.loss_agreement != null && <tr><td style={termLabelStyle}>If not returned</td><td style={termValueStyle}>${preview.loss_agreement}</td></tr>}
          </tbody>
        </table>

        {session ? (
          <>
            <p style={{ color: INK_MID, fontSize: '0.9rem', marginBottom: '14px' }}>Is this you? Claim this loan to link it to your account.</p>
            <button
              onClick={handleClaim}
              disabled={claiming}
              style={{ ...primaryBtnStyle, width: '100%', border: `2px solid ${INK}`, cursor: claiming ? 'not-allowed' : 'pointer', opacity: claiming ? 0.6 : 1, fontFamily: 'inherit' }}
            >
              {claiming ? 'Claiming…' : 'Claim this loan'}
            </button>
            {claimError && <p style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: '10px' }}>{claimError}</p>}
          </>
        ) : (
          <>
            <p style={{ color: INK_MID, fontSize: '0.9rem', marginBottom: '14px' }}>Log in or create an account, then come back to this page (or click the link in your email again) to claim this loan.</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <a href="/login" style={{ ...secondaryBtnStyle, flex: 1, textAlign: 'center' as const }}>Log In</a>
              <a href="/signup" style={{ ...primaryBtnStyle, flex: 1, textAlign: 'center' as const }}>Sign Up</a>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const pageStyle: React.CSSProperties = { backgroundColor: PAPER, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }
const cardStyle: React.CSSProperties = { width: '100%', maxWidth: '480px', backgroundColor: PAPER_LT, border: `2px solid ${INK}`, boxShadow: `5px 5px 0 ${INK}`, padding: '32px' }
const eyebrowStyle: React.CSSProperties = { fontFamily: "'Space Mono', monospace", fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: INK_LITE, marginBottom: '8px' }
const h1Style: React.CSSProperties = { fontFamily: "'Arvo', serif", fontSize: '1.6rem', fontWeight: 900, color: INK, margin: '0 0 20px', lineHeight: 1.15 }
const termLabelStyle: React.CSSProperties = { padding: '6px 0', color: INK_LITE, borderBottom: '1px solid rgba(28,22,16,0.1)' }
const termValueStyle: React.CSSProperties = { padding: '6px 0', color: INK, fontWeight: 700, textAlign: 'right' as const, borderBottom: '1px solid rgba(28,22,16,0.1)' }
const primaryBtnStyle: React.CSSProperties = { display: 'inline-block', backgroundColor: TEAL, color: '#fff', padding: '13px', fontWeight: 700, border: `2px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}`, fontSize: '0.95rem', textDecoration: 'none', fontFamily: 'Outfit, sans-serif', textAlign: 'center' as const }
const secondaryBtnStyle: React.CSSProperties = { display: 'inline-block', backgroundColor: 'transparent', color: INK, padding: '13px', fontWeight: 700, border: `2px solid ${INK}`, fontSize: '0.95rem', textDecoration: 'none', fontFamily: 'Outfit, sans-serif', textAlign: 'center' as const }
```

**Why no auto-redirect back after login/signup:** confirmed directly — `app/login/page.tsx` hardcodes its post-login destination to `/inventory` (both the password path via `router.push('/inventory')` and the Google OAuth path via `redirectTo: .../auth/callback?next=/inventory`), and `app/signup/page.tsx` does the same (`/profile/<username>` for password signup, `?next=/settings?setup=true` for Google). Neither reads a `next` value from its own incoming URL. `app/auth/callback/route.ts` itself is actually already generic (`searchParams.get('next') ?? '/'`) — it's not the bottleneck — but making login/signup forward a caller-supplied `next` means editing those two files' redirect logic, which is out of scope for this plan and starts creeping toward auth-flow changes this project treats cautiously. Simpler and fully in-scope: tell the user to come back to the link after they're done, a completely standard pattern for invite-link flows. This page already checks `session` on load and shows the Claim button whenever they land back here authenticated, so revisiting the link "just works" with zero changes to login/signup.

**Step 3: Verify**

```bash
npx tsc --noEmit
```
Manually: using the test informal loan's token from Task 3, visit `/loan-invite/<token>` **while logged out, in a fresh/incognito session** — if Step 0's `middleware.ts` change didn't take effect, this will silently redirect to `/login` instead of showing the page at all, so check the actual URL in the address bar after loading, not just that *something* rendered. Confirm the preview renders (item name, terms) and Log In/Sign Up links appear. Log in as a *different* test account than the loan's owner, revisit the same URL, click "Claim this loan," confirm success message appears, then check:
```sql
select status, converted_loan_id from informal_loans where invite_token = '<token>';
select id, status, borrower_id from item_loans where id = '<converted_loan_id from above>';
```
Expected: `informal_loans.status = 'converted'`, `item_loans.status = 'pending_handover'` with `borrower_id` matching the account you claimed as. Also confirm a `informal_loan_claimed` notification landed for the original owner (check the bell dropdown or `select * from notifications where type = 'informal_loan_claimed' order by created_at desc limit 1`).

**Step 4: Commit**

```bash
git add app/loan-invite/
git commit -m "feat: add /loan-invite/[token] claim page"
```

---

## Task 10: `header.tsx` — display the new notification type

**Files:**
- Modify: `components/header.tsx`

**Step 1: Add the new case**

Confirmed the exact shape directly from `components/header.tsx` (lines 281-298): a switch inside `notifications.map(n => ...)` returning `{ text, href }` (not `link`), where `itemName` is already resolved above the switch via `const itemName = (n.item as any)?.item_name || 'an item'` — this comes from a *generic* join (`item:gear_items!notifications_item_id_fkey(item_name)`) already present in the notifications fetch query, keyed off `item_id` for any notification type, so it works for the new type automatically with no query changes needed. Every existing loan/transfer-related case links to `/inventory`, not the item's own detail page — matching that convention (rather than the `/find-items/${n.item_id}` pattern used only by `new_item`, which is a different kind of notification).

Add, next to `case 'transfer_initiated':` (line 298):
```tsx
                case 'informal_loan_claimed':  return { text: `claimed ${itemName} — it's now a tracked loan`, href: '/inventory' }
```

**Step 2: Verify**

```bash
npx tsc --noEmit
```
Manually: trigger the claim flow from Task 9 again (or reuse the notification already created), open the bell dropdown as the loan's original owner, confirm the new notification shows sensible text and links to the item.

**Step 3: Commit**

```bash
git add components/header.tsx
git commit -m "feat: header — display informal_loan_claimed notifications"
```

---

## Task 11: Update `TASKS.md`

**Files:**
- Modify: `TASKS.md`

**Step 1:** There's no existing TASKS.md entry for this feature to update — the design/plan docs were the only place it was tracked before implementation. (Don't confuse this with the *unrelated* existing entry "Transfer/Lend on 'Keep Private' items" in Ideas & Long Term — that's a different, still-open question about a different feature; leave it alone.) Add a fresh bullet under **Next Session Priority**, following this project's End of Session Protocol: summarize what shipped (informal loans for non-account borrowers, the claim-link upgrade path, the calendar-invite email), and note what needs manual verification on production — the full flow end to end: lend to a real non-account email, receive the actual email with a working claim link and calendar attachment, claim it from a different real account, confirm it converts to a tracked loan and the original owner gets notified.

**Step 2: Commit**

```bash
git add TASKS.md
git commit -m "docs: TASKS.md — log lending to non-account holders feature"
```

---

## Notes for whoever executes this plan

- Every SQL migration task includes a `mcp__supabase__apply_migration` step *and* a follow-up "save the file to `supabase/migrations/`" step — both are required per this project's migration-tracking convention; skipping the second one silently breaks reconstructability from git (this exact problem already happened once in this project's history).
- `middleware.ts` and `app/auth/callback/route.ts` are explicitly flagged in this project as do-not-touch-without-discussion. `app/auth/callback/route.ts` is untouched by this plan entirely. `middleware.ts` gets exactly one line changed (Task 9, Step 0) — **this was surfaced to Alex directly during the final review pass and explicitly authorized**, not something to treat as pre-approved for future changes to this feature. It adds `/loan-invite` to the existing public-route whitelist, using the same pattern already there for `/find-items` etc. — without it, the claim page's core requirement (an unauthenticated visitor can preview what they're being asked to claim) silently breaks, since every non-whitelisted route redirects logged-out users to `/login` before rendering. Separately: `app/login/page.tsx` and `app/signup/page.tsx` both hardcode their post-auth destination (confirmed while writing this plan) — rather than editing those two files to support a dynamic redirect back to the claim page, Task 9 just asks the user to come back to the link after logging in/signing up. If a future change ever wants that auto-redirect, that's an edit to `app/login/page.tsx`/`app/signup/page.tsx` specifically, not the callback route, and would need its own authorization the same way the middleware change did.
- No automated test suite exists in this project — every "verify" step above is a real, concrete manual or SQL check, not a placeholder. Don't skip them even though they're not `pytest`-style.
- This plan went through an explicit adversarial review pass after the first draft (checking for security gaps, race conditions, and unverified assumptions) before execution began. Findings from that pass are folded into the tasks above rather than listed separately here — notably: the RLS insert policy verifies item ownership (not just self-attested `owner_id`), `claim_informal_loan` uses an atomic status-flip to close a double-claim race condition, the `is_on_loan` sync trigger (both the new one and the existing `item_loans` one, upgraded in place) computes the flag across both tables instead of blindly asserting per-row, and the calendar-invite base64 encoding is UTF-8-safe. Everything that was inferred rather than confirmed against the live schema or actual source files (the notifications check-constraint name, `header.tsx`'s exact case shape, whether login/signup support a redirect param) was individually verified before this plan was finalized — none of it was left as a guess.
