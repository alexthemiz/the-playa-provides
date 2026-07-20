ALTER TABLE gear_items
  DROP CONSTRAINT IF EXISTS gear_items_location_id_fkey;

ALTER TABLE gear_items
  ADD CONSTRAINT gear_items_location_id_fkey
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL;
