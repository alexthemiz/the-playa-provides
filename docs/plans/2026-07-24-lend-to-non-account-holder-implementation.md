# Lend to a Non-Account Holder — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let an owner log an informal, owner-tracked loan to someone without a TPP account (by name + optional email), with an optional claim-link path to upgrade it into a real, two-sided tracked loan if that person later creates or logs into an account.

**Architecture:** A new `informal_loans` table, separate from `item_loans`, with its own simple `active`/`returned`/`cancelled`/`converted` status (no dual confirmation — the owner is the sole source of truth). Reuses the existing `gear_items.is_on_loan` flag (via a new trigger mirroring the existing one on `item_loans`) so every surface that already checks that flag works for free. A `SECURITY DEFINER` RPC (`claim_informal_loan`), modeled directly on the existing `confirm_transfer_receipt`, does the one-time conversion into a real `item_loans` row when/if the borrower claims it via a token-based link — no changes to `middleware.ts` or `app/auth/callback/route.ts`.

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

-- Owner-only access. The claim flow (a non-owner, possibly unauthenticated
-- visitor) never touches this table directly — see the get_informal_loan_preview
-- and claim_informal_loan SECURITY DEFINER functions in a later migration,
-- which read/write on the caller's behalf without needing a table grant here.
create policy "owner_can_manage_own_informal_loans" on public.informal_loans
for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

grant select on public.informal_loans to anon;
grant select, insert, update, delete on public.informal_loans to authenticated;
grant select, insert, update, delete on public.informal_loans to service_role;

-- Mirrors the existing item_loans_sync_gear_flag trigger (see
-- 20260717200252_add_gear_items_is_on_loan_flag.sql) so an active informal
-- loan marks the item on-loan exactly like a real one, with no new UI logic
-- needed anywhere that already checks gear_items.is_on_loan.
create or replace function public.sync_gear_item_informal_loan_flag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.gear_items
  set is_on_loan = (new.status = 'active')
  where id = new.item_id;
  return new;
end;
$$;

create trigger informal_loans_sync_gear_flag
  after insert or update of status on public.informal_loans
  for each row
  execute function public.sync_gear_item_informal_loan_flag();
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

Then confirm RLS is on and the trigger exists:
```sql
select relrowsecurity from pg_class where relname = 'informal_loans';
select tgname from pg_trigger where tgrelid = 'public.informal_loans'::regclass;
```
Expected: `relrowsecurity = true`; trigger `informal_loans_sync_gear_flag` listed.

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

Postgres can't `ALTER ... ADD VALUE` cleanly inside a transaction alongside other changes when the constraint is a plain `CHECK`, not a native enum — this project uses a `CHECK` constraint (confirmed via the existing `notifications_type_check`), so this is a drop-and-recreate:

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

  select * into v_informal from informal_loans where invite_token = p_token;

  if v_informal.id is null then
    raise exception 'Loan invite not found';
  end if;

  if v_informal.status != 'active' then
    raise exception 'This loan is no longer available to claim (status: %)', v_informal.status;
  end if;

  if v_informal.owner_id = auth.uid() then
    raise exception 'You can''t claim your own loan';
  end if;

  insert into item_loans (item_id, owner_id, borrower_id, status, return_by, damage_agreement, loss_agreement, notes)
  values (v_informal.item_id, v_informal.owner_id, auth.uid(), 'pending_handover', v_informal.return_by, v_informal.damage_agreement, v_informal.loss_agreement, v_informal.notes)
  returning id into v_new_loan_id;

  update informal_loans
  set status = 'converted', converted_loan_id = v_new_loan_id, updated_at = now()
  where id = v_informal.id;

  insert into notifications (recipient_id, actor_id, type, item_id)
  values (v_informal.owner_id, auth.uid(), 'informal_loan_claimed', v_informal.item_id);

  return v_new_loan_id;
end;
$$;
```

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
Expected: one row with the item's real name/photo and the terms just inserted. This confirms the preview function works before wiring up the UI. Leave this test row in place for Task 9's manual verification, or delete it now with `delete from informal_loans where id = '<id>'` if you'd rather start clean later.

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

**Step 3: Add the fallback button and informal form**

Replace the existing lookup-error block:
```tsx
        {lookupError && <p style={errorStyle}>{lookupError}</p>}
```
with:
```tsx
        {lookupError && (
          <div>
            <p style={errorStyle}>{lookupError}</p>
            {lastSearchWasEmail && !showInformalForm && (
              <button onClick={() => setShowInformalForm(true)} style={lendAnywayButtonStyle}>
                Lend to them anyway →
              </button>
            )}
          </div>
        )}
        {showInformalForm && (
          <div style={{ marginTop: '8px' }}>
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

// Minimal single-event ICS — no library needed, this is just a text format.
function buildIcs(summary: string, description: string, dateStr: string) {
  const d = dateStr.replace(/-/g, '')
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//The Playa Provides//EN',
    'BEGIN:VEVENT',
    `UID:${crypto.randomUUID()}@theplayaprovides.com`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `DTSTART;VALUE=DATE:${d}`,
    `DTEND;VALUE=DATE:${d}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
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
      const ics = buildIcs(`Return ${itemName} to ${ownerName}`, `Via The Playa Provides: ${claimUrl}`, loan.return_by)
      emailBody.attachments = [{
        filename: 'return-reminder.ics',
        content: btoa(ics),
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
Expected: `{"ok":true}` and an email arrives at the test address with the item name, terms, claim link, and (if `return_by` was set) an `.ics` attachment that opens correctly in a calendar app.

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

Near `handleCancelLoan` (line 334), add:
```tsx
  async function handleMarkInformalLoanReturned(loan: any) {
    const { error } = await supabase
      .from('informal_loans')
      .update({ status: 'returned' })
      .eq('id', loan.id);
    if (!error) setInformalLoans(prev => prev.filter(l => l.id !== loan.id));
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

Manually: insert a test `informal_loans` row (as in Task 3 Step 3) for an item you own, reload `/inventory`, confirm it appears in "Items Out on Loan" labeled "(no account)", and that clicking **Mark Returned** removes it from the list and (`select is_on_loan from gear_items where id = <item_id>`) confirms the flag flipped back to `false` via the trigger from Task 1.

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
- Modify: `app/robots.ts` — this page should stay indexable/public (it's meant to be reached via an emailed link, not search, but doesn't contain anything sensitive since the preview RPC only returns the safe subset) — no change actually needed here; leave it out of the disallow list.

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

`app/loan-invite/[token]/client-page.tsx`:
```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

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
  const router = useRouter()
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

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' as const }}>Loading…</div>
  if (!preview) return <div style={{ padding: '40px', textAlign: 'center' as const }}>This loan invite wasn&apos;t found.</div>

  if (claimed) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' as const }}>
        <h1>You&apos;re all set!</h1>
        <p>This loan is now linked to your account.</p>
        <a href="/inventory">Go to your inventory →</a>
      </div>
    )
  }

  if (preview.status !== 'active') {
    return <div style={{ padding: '40px', textAlign: 'center' as const }}>This loan invite is no longer available (it&apos;s already {preview.status}).</div>
  }

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '40px 20px' }}>
      <h1>{preview.owner_display_name} lent you {preview.item_name}</h1>
      {preview.item_image_url && <img src={preview.item_image_url} alt={preview.item_name} style={{ width: '100%', maxWidth: '300px' }} />}
      <p>Handed over: {new Date(preview.handed_over_at).toLocaleDateString()}</p>
      {preview.return_by && <p>Expected back: {new Date(preview.return_by).toLocaleDateString()}</p>}
      {preview.damage_agreement != null && <p>If damaged: ${preview.damage_agreement}</p>}
      {preview.loss_agreement != null && <p>If not returned: ${preview.loss_agreement}</p>}

      {session ? (
        <>
          <p>Is this you? Claim this loan to link it to your account.</p>
          <button onClick={handleClaim} disabled={claiming}>{claiming ? 'Claiming…' : 'Claim this loan'}</button>
          {claimError && <p style={{ color: '#dc2626' }}>{claimError}</p>}
        </>
      ) : (
        <>
          <p>Log in or create an account to claim this loan.</p>
          <a href={`/login?next=/loan-invite/${token}`}>Log In</a>
          <a href={`/signup?next=/loan-invite/${token}`}>Sign Up</a>
        </>
      )}
    </div>
  )
}
```

**Note:** check whether `/login` and `/signup` already support a `?next=` redirect param before wiring those links — grep `app/login` and `app/signup` for `next` or `redirectTo` handling. If they don't, the simplest fix within scope is to store the token in `sessionStorage` before navigating to login/signup, then check for it on this page's `useEffect` after the user returns authenticated — note this as a follow-up if `?next=` isn't already supported, rather than modifying the login/signup pages as part of this plan (keep this task scoped to the claim page itself).

**Step 3: Verify**

```bash
npx tsc --noEmit
```
Manually: using the test informal loan's token from Task 3, visit `/loan-invite/<token>` while logged out — confirm the preview renders (item name, terms) and Log In/Sign Up links appear. Log in as a *different* test account than the loan's owner, revisit the same URL, click "Claim this loan," confirm success message appears, then check:
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

**Step 1: Find the existing notification-type switch**

Every notification type has a matching `case` for display text + link (per this project's established pattern). Find the switch/case block handling types like `loan_initiated` and add a sibling case:

```tsx
    case 'informal_loan_claimed':
      return { text: 'claimed the item you lent them — it\'s now a tracked loan', link: `/find-items/${n.item_id}` }
```

Match the exact shape (object with `text`/`link`, or however the existing cases are structured — read the surrounding code first since this plan can't see the exact current switch structure) used by the neighboring cases (e.g. `loan_initiated`) so the new case fits the existing pattern precisely rather than guessing a different shape.

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

**Step 1:** Move the "Private owner-only note field..." — no wait, wrong entry. Find the informal-loans design entry logged earlier (search for "lending to non-account" or check Ideas & Long Term) and either remove it (superseded by this shipped feature) or convert it to a "Verify on prod" entry under Next Session Priority, following this project's End of Session Protocol: summarize what shipped, note what needs manual verification on production (the full flow: lend to a non-account email, receive the real email with working claim link and calendar attachment, claim it as a different account, confirm it converts).

**Step 2: Commit**

```bash
git add TASKS.md
git commit -m "docs: TASKS.md — log lending to non-account holders feature"
```

---

## Notes for whoever executes this plan

- Every SQL migration task includes a `mcp__supabase__apply_migration` step *and* a follow-up "save the file to `supabase/migrations/`" step — both are required per this project's migration-tracking convention; skipping the second one silently breaks reconstructability from git (this exact problem already happened once in this project's history).
- `middleware.ts` and `app/auth/callback/route.ts` are explicitly flagged in this project as do-not-touch-without-discussion. Nothing in this plan should require touching either — if executing this plan seems to need a change there (e.g. for the `?next=` redirect in Task 9), stop and flag it rather than editing those files directly.
- No automated test suite exists in this project — every "verify" step above is a real, concrete manual or SQL check, not a placeholder. Don't skip them even though they're not `pytest`-style.
