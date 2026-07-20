ALTER TABLE profiles ADD COLUMN social_links jsonb NOT NULL DEFAULT '{}'::jsonb;
