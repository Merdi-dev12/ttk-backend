DO $$ BEGIN
  CREATE TYPE order_request_status AS ENUM (
    'PENDING',
    'APPROVED',
    'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE customer_sex AS ENUM (
    'MALE',
    'FEMALE',
    'OTHER',
    'PREFER_NOT_TO_SAY'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS order_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference VARCHAR(40) NOT NULL UNIQUE,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  modality_id UUID REFERENCES modalities(id) ON DELETE SET NULL,
  service_snapshot JSONB NOT NULL,
  product_snapshot JSONB,
  modality_snapshot JSONB,
  customer_name VARCHAR(150) NOT NULL,
  customer_email CITEXT NOT NULL,
  customer_phone VARCHAR(30) NOT NULL,
  customer_address VARCHAR(500),
  customer_sex customer_sex NOT NULL,
  customer_age SMALLINT NOT NULL CHECK (customer_age BETWEEN 13 AND 120),
  message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status order_request_status NOT NULL DEFAULT 'PENDING',
  admin_note TEXT,
  payment_token UUID UNIQUE,
  payment_link_sent_at TIMESTAMPTZ,
  status_updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS order_requests_status_created_at_idx
  ON order_requests(status, created_at DESC);

CREATE INDEX IF NOT EXISTS order_requests_customer_email_idx
  ON order_requests(customer_email);

CREATE INDEX IF NOT EXISTS order_requests_service_id_idx
  ON order_requests(service_id);

CREATE INDEX IF NOT EXISTS order_requests_payment_token_idx
  ON order_requests(payment_token)
  WHERE payment_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS order_request_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_request_id UUID NOT NULL REFERENCES order_requests(id) ON DELETE CASCADE,
  previous_status order_request_status,
  new_status order_request_status NOT NULL,
  note TEXT,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_type VARCHAR(20) NOT NULL DEFAULT 'SYSTEM'
    CHECK (actor_type IN ('CUSTOMER', 'ADMIN', 'SYSTEM')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS order_request_history_order_created_at_idx
  ON order_request_history(order_request_id, created_at DESC);
