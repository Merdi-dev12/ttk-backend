DO $$ BEGIN
  CREATE TYPE service_order_flow AS ENUM (
    'DIRECT_PAYMENT',
    'ORDER_REQUEST'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS order_flow service_order_flow NOT NULL DEFAULT 'ORDER_REQUEST';

CREATE INDEX IF NOT EXISTS services_order_flow_idx
  ON services(order_flow);
