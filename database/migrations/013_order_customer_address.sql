ALTER TABLE order_requests
  ADD COLUMN IF NOT EXISTS customer_address VARCHAR(500);
