-- Street addresses are about to be hidden from the public API (see the follow-up
-- migration that restricts column grants on public.locations). This lets a
-- signed-in user still read their OWN addresses (needed by Settings), and nothing else.
create or replace function public.get_my_location_addresses()
returns table (id uuid, address_line_1 text)
language sql
security definer
set search_path = public
as $$
  select l.id, l.address_line_1
  from public.locations l
  where l.user_id = (select auth.uid())
$$;

revoke all on function public.get_my_location_addresses() from public, anon;
grant execute on function public.get_my_location_addresses() to authenticated;
grant execute on function public.get_my_location_addresses() to service_role;
