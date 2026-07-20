ALTER TABLE playa_resources
  ADD COLUMN IF NOT EXISTS homebase_city text,
  ADD COLUMN IF NOT EXISTS homebase_state text,
  ADD COLUMN IF NOT EXISTS homebase_zip text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS public_email text,
  ADD COLUMN IF NOT EXISTS about_camp text,
  ADD COLUMN IF NOT EXISTS accepting_campers boolean DEFAULT false;
