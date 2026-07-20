CREATE OR REPLACE FUNCTION confirm_transfer_receipt(p_transfer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transfer item_transfers%ROWTYPE;
BEGIN
  SELECT * INTO v_transfer FROM item_transfers WHERE id = p_transfer_id;

  IF v_transfer.recipient_id IS NULL OR v_transfer.recipient_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized: caller is not the transfer recipient';
  END IF;

  IF v_transfer.status NOT IN ('accepted', 'pending_handover') THEN
    RAISE EXCEPTION 'Transfer is not in a confirmable state (current: %)', v_transfer.status;
  END IF;

  UPDATE item_transfers
  SET recipient_confirmed = true, status = 'complete'
  WHERE id = p_transfer_id;

  UPDATE gear_items
  SET user_id = auth.uid()
  WHERE id = v_transfer.item_id;
END;
$$;
