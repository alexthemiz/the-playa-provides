CREATE OR REPLACE FUNCTION confirm_transfer_receipt(p_transfer_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transfer item_transfers%ROWTYPE;
BEGIN
  -- Fetch the transfer
  SELECT * INTO v_transfer FROM item_transfers WHERE id = p_transfer_id;

  -- Verify caller is the recipient
  IF v_transfer.recipient_id IS NULL OR v_transfer.recipient_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized: caller is not the transfer recipient';
  END IF;

  -- Verify transfer is in accepted state
  IF v_transfer.status != 'accepted' THEN
    RAISE EXCEPTION 'Transfer is not in accepted state (current: %)', v_transfer.status;
  END IF;

  -- Mark transfer complete
  UPDATE item_transfers
  SET recipient_confirmed = true, status = 'complete'
  WHERE id = p_transfer_id;

  -- Transfer ownership to recipient
  UPDATE gear_items
  SET user_id = auth.uid()
  WHERE id = v_transfer.item_id;
END;
$$;
