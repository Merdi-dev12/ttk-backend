ALTER TABLE users
  ALTER COLUMN password_hash DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_idx
  ON users(google_sub)
  WHERE google_sub IS NOT NULL;
