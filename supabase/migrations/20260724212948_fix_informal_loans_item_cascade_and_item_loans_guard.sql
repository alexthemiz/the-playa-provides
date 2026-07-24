-- Every other item_id FK to gear_items (item_loans, item_transfers) is
-- ON DELETE CASCADE; informal_loans.item_id was left as the default
-- RESTRICT/NO ACTION. Without this, any item that ever had an informal
-- loan (even a long-returned/cancelled one, since the FK is never removed
-- based on status) can never be deleted again -- and AddItemModal's delete
-- flow removes the item's photos from Storage BEFORE attempting the
-- gear_items delete, so a blocked delete leaves the item row stranded with
-- broken image URLs and no user-facing error (only console.error).
alter table public.informal_loans drop constraint informal_loans_item_id_fkey;
alter table public.informal_loans add constraint informal_loans_item_id_fkey
  foreign key (item_id) references public.gear_items(id) on delete cascade;

-- Symmetric counterpart to prevent_informal_loan_on_active_item (which only
-- blocks a NEW informal loan from being created on an item already on
-- loan). Nothing previously blocked the reverse: a real item_loans row
-- could still be created via LendModal on an item currently out on an
-- active informal loan, since renderActionButton's "Lend To" button
-- doesn't check informalLoans and no DB-level guard existed on item_loans
-- at all. This closes that gap the same way, at the same layer.
create or replace function public.prevent_item_loan_on_active_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('pending_handover', 'active', 'return_pending')
     and exists (select 1 from public.gear_items where id = new.item_id and is_on_loan = true) then
    raise exception 'This item is already on loan';
  end if;
  return new;
end;
$$;

create trigger item_loans_prevent_double_loan
  before insert on public.item_loans
  for each row
  execute function public.prevent_item_loan_on_active_item();
