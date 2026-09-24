CREATE TABLE ancestry_trips (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  birth_year INTEGER,
  birth_place TEXT,
  ancestral_place TEXT NOT NULL,
  notes TEXT,
  preview_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ancestry_payments (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  trip_id TEXT NOT NULL REFERENCES ancestry_trips(id),
  stripe_session_id TEXT NOT NULL UNIQUE,
  product TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'eur',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ancestry_reports (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  trip_id TEXT NOT NULL REFERENCES ancestry_trips(id),
  payment_id TEXT NOT NULL UNIQUE REFERENCES ancestry_payments(id),
  content_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ancestry_trips_email
  ON ancestry_trips(email);

CREATE INDEX idx_ancestry_payments_trip_id
  ON ancestry_payments(trip_id);

CREATE INDEX idx_ancestry_reports_trip_id
  ON ancestry_reports(trip_id);
