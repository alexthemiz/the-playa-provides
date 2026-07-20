-- Three policies were byte-identical (ALL commands, using auth.uid() = user_id,
-- no explicit with_check). Keeping "Owner Access", dropping the two duplicates.
drop policy if exists "Users can manage their own gear" on public.gear_items;
drop policy if exists "Users can manage their own gear_items" on public.gear_items;
