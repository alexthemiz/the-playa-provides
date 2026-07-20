ALTER TABLE item_loans
  ADD COLUMN IF NOT EXISTS picked_up_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS borrower_location text;
