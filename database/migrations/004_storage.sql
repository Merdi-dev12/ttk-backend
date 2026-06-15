CREATE TABLE IF NOT EXISTS storage_buckets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(63) NOT NULL UNIQUE,
  provider_name VARCHAR(63) NOT NULL UNIQUE,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS storage_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id UUID NOT NULL REFERENCES storage_buckets(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  object_key VARCHAR(1024) NOT NULL,
  url VARCHAR(2048) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size BIGINT NOT NULL CHECK (size > 0),
  etag VARCHAR(255),
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(bucket_id, object_key)
);

CREATE INDEX IF NOT EXISTS storage_objects_bucket_created_idx
  ON storage_objects(bucket_id, created_at DESC);
