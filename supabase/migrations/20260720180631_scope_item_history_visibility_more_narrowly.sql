-- Reverting the blanket "past owner can always see the current gear_items
-- row" policy — it let a giver see who a re-gifted item's current owner is
-- even if that person set it private and has zero relationship with the
-- giver, which overrides a privacy choice that wasn't theirs to override.
drop policy if exists "past_transfer_owner_can_view_item" on public.gear_items;

-- Instead: snapshot the item name onto the transfer record itself at the
-- time of the transfer. This is a record of the giver's own past action —
-- not something about the current owner — so it shouldn't depend on
-- whatever visibility the item currently has under however many owners
-- later. "Current owner" now falls back to the item's live, real visibility
-- rules (same as any other viewer would see) with no special bypass.
alter table public.item_transfers add column if not exists item_name text;

update public.item_transfers t
set item_name = g.item_name
from public.gear_items g
where g.id = t.item_id
and t.item_name is null;
