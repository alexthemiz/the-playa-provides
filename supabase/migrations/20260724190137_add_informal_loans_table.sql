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
