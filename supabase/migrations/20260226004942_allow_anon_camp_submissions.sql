DROP POLICY IF EXISTS "Authenticated users can add resources" ON playa_resources;
CREATE POLICY "Anyone can submit a resource" ON playa_resources
  FOR INSERT TO public WITH CHECK (true);
