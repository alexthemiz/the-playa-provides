ALTER TABLE item_loans
  DROP COLUMN IF EXISTS borrower_location,
  ADD COLUMN IF NOT EXISTS borrower_location_id uuid REFERENCES locations(id) ON DELETE SET NULL;
