-- Separate agreement/lock state into its own endpoint_only table so that
-- party_scoped writes to app_borrowing__requests cannot forge agreement flags
-- or force-lock a request via direct SQL.  The api/agree hub endpoint is now
-- the only writer of this table (enforced by the endpoint_only row policy) --
-- that endpoint_only policy is the actual security boundary.
--
-- The original requests table keeps all item-detail columns (name, dates,
-- conditions) as well as status values 'pending'/'cancelled'/'returned'.
-- 'locked' is now derived from request_agreements.status rather than stored
-- in requests.status.  SQLite cannot DROP columns, so the old borrower_agreed,
-- lender_agreed, and locked_at columns are left in place but are now VESTIGIAL:
-- the client never reads or writes them (loadRequests reads agreement state
-- from request_agreements via JOIN, and effective lock status is derived solely
-- from request_agreements.status -- a forged requests.status = 'locked' is
-- ignored by that derivation).  Writing garbage into these dead columns
-- therefore has no effect, so no trigger guard is needed.

CREATE TABLE IF NOT EXISTS app_borrowing__request_agreements (
  id              TEXT NOT NULL,     -- same value as app_borrowing__requests.id
  borrower_id     TEXT NOT NULL,     -- copied on init for party verification
  lender_id       TEXT NOT NULL,
  borrower_agreed INTEGER NOT NULL DEFAULT 0,
  lender_agreed   INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending',
  locked_at       TEXT,
  updated_at      TEXT NOT NULL,
  PRIMARY KEY (id)
);

-- Also add borrower_id / lender_id to activity so party_scoped can make both
-- parties' entries mutually visible (see updated row_policies.activity).
ALTER TABLE app_borrowing__activity ADD COLUMN borrower_id TEXT NOT NULL DEFAULT '';
ALTER TABLE app_borrowing__activity ADD COLUMN lender_id   TEXT NOT NULL DEFAULT '';

-- Migrate existing agreement state from requests.
-- Rows that are already cancelled/returned don't need a pending agreement row,
-- but we create one anyway so api/agree won't 404 if somehow re-called.
INSERT OR IGNORE INTO app_borrowing__request_agreements
  (id, borrower_id, lender_id, borrower_agreed, lender_agreed, status, locked_at, updated_at)
SELECT
  id,
  borrower_id,
  lender_id,
  borrower_agreed,
  lender_agreed,
  CASE WHEN status = 'locked' THEN 'locked' ELSE 'pending' END,
  locked_at,
  updated_at
FROM app_borrowing__requests;
