-- The prior migration's column-level REVOKE had no effect: profiles carries
-- a legacy table-wide GRANT SELECT to anon/authenticated (predating the
-- per-table explicit-grants convention), and a broader table-level grant
-- always wins over a narrower column-level revoke in Postgres. Fix: revoke
-- the table-wide SELECT and re-grant it scoped to every column except the
-- three now-restricted ones (email, phone_number, street_address).
revoke select on public.profiles from anon, authenticated;

grant select (
  id, full_name, preferred_name, zip_code, city, state, avatar_url,
  updated_at, bio, username, contact_email, burning_man_years,
  burning_man_camp, wish_list, notify_new_items_email, social_links,
  playa_story, pronouns, deleted_at, has_seen_welcome, checklist_dismissed,
  has_browsed, referred_by, welcome_email_sent_at
) on public.profiles to anon, authenticated;
