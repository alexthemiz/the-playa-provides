-- Links a resources listing to a real camp record. Nullable because
-- anonymous submissions with no matching camp still won't have one.
-- ON DELETE SET NULL (not CASCADE) because a resources listing is a
-- standalone directory entry that should survive even if the linked
-- camp record is ever removed.
alter table public.playa_resources
  add column camp_id uuid references public.camps(id) on delete set null;

-- camps.homebase is a single freeform string ("Brooklyn, NY", "Seattle",
-- "Redding") -- never structured city/state/zip. The three-column split
-- on this table couldn't be auto-filled from that without either leaving
-- state/zip blank or badly guessing at a split. Safe to replace outright:
-- this table currently has exactly one row.
alter table public.playa_resources
  drop column homebase_city,
  drop column homebase_state,
  drop column homebase_zip;

alter table public.playa_resources
  add column homebase text;

alter table public.playa_resources
  add column camp_description text;
