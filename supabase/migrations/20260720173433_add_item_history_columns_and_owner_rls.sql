-- Dates needed for the owner-only item history feature. Neither table had a
-- reliable "when did this actually finish" timestamp — updated_at exists but
-- nothing ever set it (no trigger, no explicit update), so it would have been
-- misleading to reuse.
alter table public.item_loans add column if not exists returned_at timestamptz;
alter table public.item_transfers add column if not exists completed_at timestamptz;

-- confirm_transfer_receipt is the only path that marks a transfer complete —
-- stamp completed_at there.
create or replace function public.confirm_transfer_receipt(p_transfer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transfer item_transfers%rowtype;
begin
  select * into v_transfer from item_transfers where id = p_transfer_id;

  if v_transfer.recipient_id is null or v_transfer.recipient_id != auth.uid() then
    raise exception 'Not authorized: caller is not the transfer recipient';
  end if;

  if v_transfer.status not in ('accepted', 'pending_handover') then
    raise exception 'Transfer is not in a confirmable state (current: %)', v_transfer.status;
  end if;

  update item_transfers
  set recipient_confirmed = true, status = 'complete', completed_at = now()
  where id = p_transfer_id;

  update gear_items
  set
    user_id = auth.uid(),
    availability_status = 'Not Available',
    visibility = 'private'
  where id = v_transfer.item_id;
end;
$$;

-- Additional (OR'd) SELECT policies: the CURRENT owner of an item can see
-- every loan/transfer row for it, regardless of who the historical
-- owner_id/borrower_id was on that specific row. This is intentionally
-- narrower than "was ever involved" — a past owner who transferred the item
-- away loses this visibility once gear_items.user_id no longer points to
-- them, and a borrower never satisfies this policy at all (they're never
-- gear_items.user_id for an item they're borrowing, only lending changes
-- ownership).
create policy "current_item_owner_can_view_loan_history" on public.item_loans
for select
using (
  exists (
    select 1 from public.gear_items
    where gear_items.id = item_loans.item_id
    and gear_items.user_id = auth.uid()
  )
);

create policy "current_item_owner_can_view_transfer_history" on public.item_transfers
for select
using (
  exists (
    select 1 from public.gear_items
    where gear_items.id = item_transfers.item_id
    and gear_items.user_id = auth.uid()
  )
);
