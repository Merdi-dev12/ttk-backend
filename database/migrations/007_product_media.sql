ALTER TABLE product_images
  ADD COLUMN IF NOT EXISTS media_type VARCHAR(10) NOT NULL DEFAULT 'IMAGE';

DO $$ BEGIN
  ALTER TABLE product_images
    ADD CONSTRAINT product_images_media_type_check
    CHECK (media_type IN ('IMAGE', 'VIDEO'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

UPDATE admin_settings
SET value = value
  || '{
    "maxVideoSizeMb": 100,
    "allowedVideoTypes": [
      "video/mp4", "video/webm", "video/quicktime"
    ]
  }'::JSONB
WHERE section = 'storage';
