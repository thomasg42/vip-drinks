-- One row. One bar. The shift everybody is looking at.
--
-- The whole shift is stored as a single JSON document rather than normalised
-- tables because it is merged as a whole: the merge function decides what the
-- truth is, and SQL is only being asked to hold the answer and hand it back.
CREATE TABLE IF NOT EXISTS shift_state (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  rev INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

-- Per-caller counters for the PIN endpoint. Swept opportunistically.
CREATE TABLE IF NOT EXISTS rate_usage (
  bucket TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS rate_usage_expires_at_idx
  ON rate_usage(expires_at);
