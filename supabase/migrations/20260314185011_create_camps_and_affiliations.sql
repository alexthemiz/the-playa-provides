-- camps table
CREATE TABLE camps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description text,
  founded_year integer,
  is_claimed boolean NOT NULL DEFAULT false,
  page_owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  avatar_url text,
  banner_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- user_camp_affiliations table
CREATE TABLE user_camp_affiliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  camp_id uuid NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
  year integer NOT NULL,
  is_open_camping boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE camps ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_camp_affiliations ENABLE ROW LEVEL SECURITY;

-- camps policies
CREATE POLICY "camps_public_read"   ON camps FOR SELECT USING (true);
CREATE POLICY "camps_auth_insert"   ON camps FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "camps_owner_update"  ON camps FOR UPDATE USING (auth.uid() = page_owner_id);
CREATE POLICY "camps_owner_delete"  ON camps FOR DELETE USING (auth.uid() = page_owner_id);

-- user_camp_affiliations policies
CREATE POLICY "affiliations_public_read"  ON user_camp_affiliations FOR SELECT USING (true);
CREATE POLICY "affiliations_own_insert"   ON user_camp_affiliations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "affiliations_own_delete"   ON user_camp_affiliations FOR DELETE USING (auth.uid() = user_id);
