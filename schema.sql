CREATE TABLE IF NOT EXISTS trip_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ancestral_country TEXT NOT NULL,
  ancestral_region TEXT,
  ancestral_city TEXT,
  surname TEXT,
  ancestor_first_name TEXT,
  birth_year INTEGER,
  death_year INTEGER,
  destination TEXT NOT NULL,
  trip_length_days INTEGER NOT NULL,
  budget TEXT,
  interests TEXT,
  preview_json TEXT
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  trip_request_id INTEGER,
  stripe_session_id TEXT UNIQUE,
  product TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'eur',
  customer_email TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  report_token TEXT UNIQUE,
  report_json TEXT,
  report_created_at TEXT,
  FOREIGN KEY (trip_request_id) REFERENCES trip_requests(id)
);

CREATE INDEX IF NOT EXISTS idx_orders_stripe_session
  ON orders(stripe_session_id);

CREATE INDEX IF NOT EXISTS idx_orders_report_token
  ON orders(report_token);