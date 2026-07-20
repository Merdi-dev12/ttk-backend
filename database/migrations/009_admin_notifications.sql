DO $$ BEGIN
  CREATE TYPE admin_notification_type AS ENUM (
    'CONTACT_MESSAGE',
    'INBOUND_EMAIL'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type admin_notification_type NOT NULL,
  title VARCHAR(180) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_notifications_created_at_idx
  ON admin_notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS admin_notifications_unread_idx
  ON admin_notifications(created_at DESC)
  WHERE read_at IS NULL;
