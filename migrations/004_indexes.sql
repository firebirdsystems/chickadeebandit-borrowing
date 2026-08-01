-- The app shipped with no indexes. The `requests` and `activity` party_scoped
-- policies rewrite every read into `borrower_id = ? OR lender_id = ?`, which
-- SQLite can only satisfy from separate single-column indexes (a composite on
-- the pair serves neither side of the OR).
CREATE INDEX IF NOT EXISTS app_borrowing__requests_borrower_idx
  ON app_borrowing__requests (borrower_id);
CREATE INDEX IF NOT EXISTS app_borrowing__requests_lender_idx
  ON app_borrowing__requests (lender_id);
CREATE INDEX IF NOT EXISTS app_borrowing__activity_request_idx
  ON app_borrowing__activity (request_id, created_at);
CREATE INDEX IF NOT EXISTS app_borrowing__activity_actor_idx
  ON app_borrowing__activity (actor_id);
