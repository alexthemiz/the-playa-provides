-- new_follower
CREATE OR REPLACE FUNCTION notify_on_new_follower()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO notifications (recipient_id, actor_id, type)
  VALUES (NEW.following_id, NEW.follower_id, 'new_follower');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_follower ON user_follows;
CREATE TRIGGER on_new_follower
  AFTER INSERT ON user_follows
  FOR EACH ROW EXECUTE FUNCTION notify_on_new_follower();

-- transfer_accepted / transfer_declined
CREATE OR REPLACE FUNCTION notify_on_transfer_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' THEN
    INSERT INTO notifications (recipient_id, actor_id, item_id, type)
    VALUES (NEW.owner_id, NEW.recipient_id, NEW.item_id, 'transfer_accepted');
  ELSIF NEW.status = 'declined' AND OLD.status IS DISTINCT FROM 'declined' THEN
    INSERT INTO notifications (recipient_id, actor_id, item_id, type)
    VALUES (NEW.owner_id, NEW.recipient_id, NEW.item_id, 'transfer_declined');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_transfer_status_change ON item_transfers;
CREATE TRIGGER on_transfer_status_change
  AFTER UPDATE ON item_transfers
  FOR EACH ROW EXECUTE FUNCTION notify_on_transfer_status_change();

-- loan_accepted / loan_declined
CREATE OR REPLACE FUNCTION notify_on_loan_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' THEN
    INSERT INTO notifications (recipient_id, actor_id, item_id, type)
    VALUES (NEW.owner_id, NEW.borrower_id, NEW.item_id, 'loan_accepted');
  ELSIF NEW.status = 'declined' AND OLD.status IS DISTINCT FROM 'declined' THEN
    INSERT INTO notifications (recipient_id, actor_id, item_id, type)
    VALUES (NEW.owner_id, NEW.borrower_id, NEW.item_id, 'loan_declined');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_loan_status_change ON item_loans;
CREATE TRIGGER on_loan_status_change
  AFTER UPDATE ON item_loans
  FOR EACH ROW EXECUTE FUNCTION notify_on_loan_status_change();

-- camp_join (only fires when camp is claimed)
CREATE OR REPLACE FUNCTION notify_on_camp_join()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_owner_id uuid;
BEGIN
  SELECT page_owner_id INTO v_owner_id FROM camps WHERE id = NEW.camp_id;
  IF v_owner_id IS NOT NULL AND v_owner_id <> NEW.user_id THEN
    INSERT INTO notifications (recipient_id, actor_id, camp_id, type)
    VALUES (v_owner_id, NEW.user_id, NEW.camp_id, 'camp_join');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_camp_join ON user_camp_affiliations;
CREATE TRIGGER on_camp_join
  AFTER INSERT ON user_camp_affiliations
  FOR EACH ROW EXECUTE FUNCTION notify_on_camp_join();
