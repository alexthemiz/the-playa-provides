ALTER TABLE profiles
  ALTER COLUMN wish_list TYPE jsonb
  USING CASE
    WHEN wish_list IS NULL OR wish_list = '' THEN '[]'::jsonb
    ELSE jsonb_build_array(wish_list)
  END;
