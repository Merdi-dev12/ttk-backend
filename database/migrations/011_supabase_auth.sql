ALTER TABLE users
  ADD COLUMN IF NOT EXISTS supabase_user_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS users_supabase_user_id_idx
  ON users(supabase_user_id)
  WHERE supabase_user_id IS NOT NULL;
