-- 1. Create camp_claim_requests table
CREATE TABLE camp_claim_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id uuid NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text,
  years text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (camp_id, user_id)
);

-- 2. RLS
ALTER TABLE camp_claim_requests ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert their own rows
CREATE POLICY "users can insert own claim requests"
  ON camp_claim_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own claim requests
CREATE POLICY "users can read own claim requests"
  ON camp_claim_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Only service role can update (approve/deny)
-- (no UPDATE policy = only service role bypassing RLS can update)

-- 3. Trigger function: approval
CREATE OR REPLACE FUNCTION handle_camp_claim_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    -- Mark camp as claimed, set page owner
    UPDATE camps
    SET is_claimed = true,
        page_owner_id = NEW.user_id
    WHERE id = NEW.camp_id;

    -- Deny any other pending requests for this camp
    UPDATE camp_claim_requests
    SET status = 'denied'
    WHERE camp_id = NEW.camp_id
      AND id <> NEW.id
      AND status = 'pending';

    -- Notify the approved user
    INSERT INTO notifications (user_id, actor_id, type, camp_id)
    VALUES (NEW.user_id, NEW.user_id, 'camp_claim_approved', NEW.camp_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_camp_claim_approved ON camp_claim_requests;
CREATE TRIGGER on_camp_claim_approved
  AFTER UPDATE ON camp_claim_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_camp_claim_approved();

-- 4. Trigger function: denial
CREATE OR REPLACE FUNCTION handle_camp_claim_denied()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'denied' AND OLD.status = 'pending' THEN
    -- Notify the denied user
    INSERT INTO notifications (user_id, actor_id, type, camp_id)
    VALUES (NEW.user_id, NEW.user_id, 'camp_claim_denied', NEW.camp_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_camp_claim_denied ON camp_claim_requests;
CREATE TRIGGER on_camp_claim_denied
  AFTER UPDATE ON camp_claim_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_camp_claim_denied();
