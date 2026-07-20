ALTER TABLE gear_items DROP CONSTRAINT gear_items_visibility_check;
ALTER TABLE gear_items ADD CONSTRAINT gear_items_visibility_check
  CHECK (visibility = ANY (ARRAY['public','private','followers','campmates','followers_and_campmates']));
