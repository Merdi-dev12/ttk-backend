ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(2048);

ALTER TABLE refresh_tokens
  ADD COLUMN IF NOT EXISTS user_agent VARCHAR(500),
  ADD COLUMN IF NOT EXISTS ip_address INET,
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS refresh_tokens_active_sessions_idx
  ON refresh_tokens(user_id, expires_at)
  WHERE revoked_at IS NULL;
