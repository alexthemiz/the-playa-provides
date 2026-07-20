ALTER TABLE playa_resources
  ADD COLUMN contact_email text NOT NULL DEFAULT '',
  ADD COLUMN submitter_name text NOT NULL DEFAULT '',
  ADD COLUMN instagram text;
