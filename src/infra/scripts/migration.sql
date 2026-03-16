CREATE TABLE IF NOT EXISTS token_buckets (
  client_id   TEXT        PRIMARY KEY,
  tokens      REAL        NOT NULL,
  last_refill TIMESTAMPTZ NOT NULL DEFAULT now()
);
