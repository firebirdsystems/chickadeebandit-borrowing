-- active_requests orders by needed_date under LIMIT 100. Its WHERE is a
-- status NOT IN (...), which SQLite cannot seek on, so the index is here for the
-- ordering: an ordered walk that stops at the LIMIT rather than sorting every
-- borrow request ever filed.
CREATE INDEX IF NOT EXISTS app_borrowing__requests_needed_date_idx
  ON app_borrowing__requests(needed_date);
