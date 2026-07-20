-- profiles.id → ON DELETE CASCADE
ALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey;
ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- locations.user_id → ON DELETE CASCADE
ALTER TABLE locations DROP CONSTRAINT locations_user_id_fkey;
ALTER TABLE locations ADD CONSTRAINT locations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- gear_items.user_id → ON DELETE SET NULL
ALTER TABLE gear_items DROP CONSTRAINT gear_items_user_id_fkey;
ALTER TABLE gear_items ADD CONSTRAINT gear_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- playa_resources.submitted_by → ON DELETE SET NULL
ALTER TABLE playa_resources DROP CONSTRAINT playa_resources_submitted_by_fkey;
ALTER TABLE playa_resources ADD CONSTRAINT playa_resources_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES auth.users(id) ON DELETE SET NULL;
