-- Fix approval trigger: recipient_id instead of user_id
CREATE OR REPLACE FUNCTION handle_camp_claim_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    UPDATE camps
    SET is_claimed = true,
        page_owner_id = NEW.user_id
    WHERE id = NEW.camp_id;

    UPDATE camp_claim_requests
    SET status = 'denied'
    WHERE camp_id = NEW.camp_id
      AND id <> NEW.id
      AND status = 'pending';

    INSERT INTO notifications (recipient_id, actor_id, type, camp_id)
    VALUES (NEW.user_id, NEW.user_id, 'camp_claim_approved', NEW.camp_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Fix denial trigger: recipient_id instead of user_id
CREATE OR REPLACE FUNCTION handle_camp_claim_denied()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'denied' AND OLD.status = 'pending' THEN
    INSERT INTO notifications (recipient_id, actor_id, type, camp_id)
    VALUES (NEW.user_id, NEW.user_id, 'camp_claim_denied', NEW.camp_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Add CHECK constraint on status
ALTER TABLE camp_claim_requests
  ADD CONSTRAINT camp_claim_requests_status_check
  CHECK (status IN ('pending', 'approved', 'denied'));
