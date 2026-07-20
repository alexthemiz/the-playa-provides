ALTER TABLE notifications ADD COLUMN camp_id uuid REFERENCES camps(id) ON DELETE SET NULL;
