-- Scoped, safe replacement for the lend/transfer "find recipient by login
-- email" fallback. Returns only what the UI needs (never the email itself),
-- letting us revoke direct column-level access to profiles.email below
-- without breaking that feature. Mirrors get_informal_loan_preview's
-- existing security-definer pattern.
create or replace function public.find_profile_by_login_email(p_email text)
returns table (id uuid, username text, preferred_name text)
language sql
security definer
set search_path = public
as $$
  select id, username, preferred_name
  from public.profiles
  where email ilike p_email
    and (contact_email is null or contact_email = '')
  limit 1;
$$;

revoke execute on function public.find_profile_by_login_email(text) from public, anon;
grant execute on function public.find_profile_by_login_email(text) to authenticated;

-- profiles' SELECT policy is USING (true) (row-level, can't hide specific
-- columns) — column-level privileges are the only way to actually restrict
-- these. email/phone_number/street_address are read by zero client-side
-- code paths now that the RPC above replaces the one legitimate reader.
revoke select (email, phone_number, street_address) on public.profiles from anon, authenticated;
grant select (email, phone_number, street_address) on public.profiles to service_role;
