-- Drop all existing catch-all SELECT policies
DROP POLICY IF EXISTS "Allow public read" ON gear_items;
DROP POLICY IF EXISTS "Anyone can view gear" ON gear_items;
DROP POLICY IF EXISTS "Anyone can view gear_items" ON gear_items;
DROP POLICY IF EXISTS "Public Access" ON gear_items;

-- Single visibility-aware SELECT policy
CREATE POLICY "gear_items_visibility" ON gear_items
FOR SELECT USING (
  -- Owner always sees their own items regardless of visibility
  auth.uid() = user_id

  OR

  -- Public items: visible to everyone including logged-out users
  visibility = 'public'

  OR

  -- Followers: item owner follows the viewer
  (
    visibility IN ('followers', 'followers_and_campmates')
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM user_follows
      WHERE follower_id = user_id        -- item owner is the one following
        AND following_id = auth.uid()    -- viewer is being followed by owner
    )
  )

  OR

  -- Campmates: viewer shares any camp (non-null camp_id) with item owner
  (
    visibility IN ('campmates', 'followers_and_campmates')
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM user_camp_affiliations uca_viewer
      JOIN user_camp_affiliations uca_owner
        ON uca_viewer.camp_id = uca_owner.camp_id
      WHERE uca_viewer.user_id = auth.uid()
        AND uca_owner.user_id = gear_items.user_id
        AND uca_viewer.camp_id IS NOT NULL
    )
  )
);
