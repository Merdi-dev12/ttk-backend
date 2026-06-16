CREATE TABLE IF NOT EXISTS admin_settings (
  section VARCHAR(50) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255),
  previous_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_logs_resource_idx
  ON audit_logs(resource_type, resource_id, created_at DESC);

INSERT INTO admin_settings(section, value)
VALUES
  ('general', '{
    "platformName": "TTK Services",
    "supportEmail": "support@example.com",
    "supportPhone": "+243000000000",
    "defaultCurrency": "CDF",
    "timezone": "Africa/Kinshasa",
    "maintenanceMode": false
  }'::JSONB),
  ('catalog', '{
    "autoPublishServices": false,
    "autoPublishProducts": false,
    "lowStockThreshold": 5,
    "allowOutOfStockOrders": false
  }'::JSONB),
  ('orders', '{
    "referencePrefix": "TTK",
    "cancellationDelayMinutes": 30,
    "autoCancelUnpaid": true,
    "requireAdminConfirmation": true
  }'::JSONB),
  ('payments', '{
    "enabledCurrencies": ["CDF", "USD"],
    "paymentTimeoutMinutes": 15,
    "manualVerification": true
  }'::JSONB),
  ('notifications', '{
    "adminEmail": "admin@example.com",
    "notifyNewOrder": true,
    "notifyNewSubmission": true,
    "notifyPaymentFailure": true,
    "dailyDigest": false
  }'::JSONB),
  ('security', '{
    "sessionIdleMinutes": 30,
    "maxLoginAttempts": 5,
    "requireTwoFactor": false,
    "allowedAdminIps": []
  }'::JSONB),
  ('storage', '{
    "maxImageSizeMb": 10,
    "allowedImageTypes": [
      "image/jpeg", "image/png", "image/webp", "image/avif"
    ],
    "imageQuality": 85,
    "generateWebp": true
  }'::JSONB)
ON CONFLICT (section) DO NOTHING;
