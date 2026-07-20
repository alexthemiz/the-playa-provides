-- Without this, a former owner querying their own completed item_transfers
-- row would get a null gear_items embed the moment the current owner sets
-- the item to private/followers/campmates — silently losing the item name
-- (not just current-owner info) from their own "Items I've Given Away"
-- history. Anyone who was ever a genuine owner_id on a completed transfer
-- for this item keeps permanent read access to it.
create policy "past_transfer_owner_can_view_item" on public.gear_items
for select
using (
  exists (
    select 1 from public.item_transfers
    where item_transfers.item_id = gear_items.id
    and item_transfers.owner_id = auth.uid()
    and item_transfers.status = 'complete'
  )
);
