-- Per-attempt audit log for webhook deliveries (user + campaign)
CREATE TABLE webhook_delivery_attempts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id           UUID NOT NULL,
  delivery_kind         TEXT NOT NULL DEFAULT 'user'
                          CHECK (delivery_kind IN ('user', 'campaign')),
  attempt_number        INT NOT NULL,
  response_status       INT,
  response_body_snippet TEXT,
  error                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX webhook_delivery_attempts_delivery_idx
  ON webhook_delivery_attempts (delivery_id, delivery_kind, created_at DESC);

ALTER TABLE webhook_deliveries
  ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ;
