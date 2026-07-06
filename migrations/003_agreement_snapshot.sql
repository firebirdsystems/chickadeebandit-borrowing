-- Freeze the agreed item terms into the endpoint_only request_agreements row at
-- lock time. Previously the item-detail columns lived only on the party_scoped
-- requests table, which either party can UPDATE at any time via raw /api/db --
-- so a party could silently change the agreed terms (dates, conditions,
-- consequences) after both had agreed, while the request still displayed as
-- 🔒 Agreed. The `agreements` mechanism froze the consent FLAGS but not the TERMS.
--
-- These columns mirror the agreed columns on app_borrowing__requests. The
-- api/agree endpoint copies them from requests into this endpoint_only table at
-- the moment the request locks (manifest agreements.snapshot_columns). Because
-- this table blocks app-originated writes, the snapshot is immutable, and the
-- client reads the authoritative agreed terms from here for any locked request
-- (see loadRequests). A post-lock edit to requests.* no longer changes what was
-- agreed. Column names MUST match the source columns exactly (the endpoint copies
-- by name).
ALTER TABLE app_borrowing__request_agreements ADD COLUMN item_name        TEXT;
ALTER TABLE app_borrowing__request_agreements ADD COLUMN item_description TEXT;
ALTER TABLE app_borrowing__request_agreements ADD COLUMN needed_date      TEXT;
ALTER TABLE app_borrowing__request_agreements ADD COLUMN return_date      TEXT;
ALTER TABLE app_borrowing__request_agreements ADD COLUMN return_condition TEXT;
ALTER TABLE app_borrowing__request_agreements ADD COLUMN if_not_returned  TEXT;

-- Backfill snapshots for requests that are already locked, so historical locked
-- requests show their frozen terms too (best-effort: uses the current terms).
UPDATE app_borrowing__request_agreements
SET
  item_name        = (SELECT item_name        FROM app_borrowing__requests r WHERE r.id = app_borrowing__request_agreements.id),
  item_description  = (SELECT item_description FROM app_borrowing__requests r WHERE r.id = app_borrowing__request_agreements.id),
  needed_date      = (SELECT needed_date      FROM app_borrowing__requests r WHERE r.id = app_borrowing__request_agreements.id),
  return_date      = (SELECT return_date      FROM app_borrowing__requests r WHERE r.id = app_borrowing__request_agreements.id),
  return_condition = (SELECT return_condition FROM app_borrowing__requests r WHERE r.id = app_borrowing__request_agreements.id),
  if_not_returned  = (SELECT if_not_returned  FROM app_borrowing__requests r WHERE r.id = app_borrowing__request_agreements.id)
WHERE status = 'locked';
