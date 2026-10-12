-- Street addresses (locations.address_line_1) were readable by anyone holding the
-- public anon key, because locations has a legacy table-wide SELECT grant and a
-- "viewable by everyone" row policy (row policies cannot hide a single column).
-- Same recipe as restrict_profiles_sensitive_columns: drop the table-wide SELECT,
-- re-grant it per column EXCEPT address_line_1. Everything the site shows publicly
-- (city/state/zip/lat-lng for search + map, label) stays readable. Owners read their
-- own street address through get_my_location_addresses().
--
-- NOTE for future client code: because address_line_1 is unreadable, never use
-- select('*') on locations, and never UPSERT it (ON CONFLICT ... EXCLUDED.address_line_1
-- needs read permission on that column) -- use plain INSERT / UPDATE instead.
revoke select on public.locations from anon, authenticated;

grant select (id, user_id, label, city, state, zip_code, is_default, created_at, location_type, latitude, longitude)
  on public.locations to anon, authenticated;
