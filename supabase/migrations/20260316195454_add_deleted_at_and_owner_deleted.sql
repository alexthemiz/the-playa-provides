ALTER TABLE profiles ADD COLUMN deleted_at timestamptz;
ALTER TABLE gear_items ADD COLUMN owner_deleted boolean NOT NULL DEFAULT false;
