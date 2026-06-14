CREATE TABLE IF NOT EXISTS currencies (
  code VARCHAR(3) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  symbol VARCHAR(10) NOT NULL,
  decimal_places SMALLINT NOT NULL DEFAULT 2
    CHECK (decimal_places BETWEEN 0 AND 4),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO currencies(code, name, symbol, decimal_places)
VALUES
  ('USD', 'Dollar américain', '$', 2),
  ('CDF', 'Franc congolais', 'FC', 2)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  symbol = EXCLUDED.symbol,
  decimal_places = EXCLUDED.decimal_places,
  is_active = TRUE,
  updated_at = NOW();

UPDATE modalities
SET currency = 'CDF'
WHERE currency NOT IN ('USD', 'CDF');

ALTER TABLE modalities
  ALTER COLUMN currency TYPE VARCHAR(3),
  ALTER COLUMN currency SET DEFAULT 'CDF';

ALTER TABLE modalities
  ADD COLUMN IF NOT EXISTS old_price NUMERIC(12, 2);

DO $$ BEGIN
  ALTER TABLE modalities
    ADD CONSTRAINT modalities_currency_fk
    FOREIGN KEY (currency) REFERENCES currencies(code);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE modalities
    ADD CONSTRAINT modalities_old_price_check
    CHECK (old_price IS NULL OR old_price > price);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS modalities_currency_idx
  ON modalities(currency);
