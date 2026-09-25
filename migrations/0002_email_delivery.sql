ALTER TABLE ancestry_payments ADD COLUMN email_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE ancestry_payments ADD COLUMN email_sent_at TEXT;
ALTER TABLE ancestry_payments ADD COLUMN email_error TEXT;

CREATE INDEX idx_ancestry_payments_email_status
  ON ancestry_payments(email_status);
