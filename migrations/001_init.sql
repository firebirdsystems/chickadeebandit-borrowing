CREATE TABLE IF NOT EXISTS requests (
  household_id     UUID NOT NULL DEFAULT current_setting('app.household_id', true)::uuid,
  id               TEXT NOT NULL,
  item_name        TEXT NOT NULL,
  item_description TEXT NOT NULL DEFAULT '',
  borrower_id      TEXT NOT NULL,
  lender_id        TEXT NOT NULL,
  needed_date      TEXT NOT NULL,
  return_date      TEXT NOT NULL,
  return_condition TEXT NOT NULL DEFAULT '[]',
  if_not_returned  TEXT NOT NULL DEFAULT '',
  status           TEXT NOT NULL DEFAULT 'pending',
  borrower_agreed  INTEGER NOT NULL DEFAULT 0,
  lender_agreed    INTEGER NOT NULL DEFAULT 0,
  locked_at        TEXT,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL,
  PRIMARY KEY (household_id, id)
);

CREATE TABLE IF NOT EXISTS activity (
  household_id UUID NOT NULL DEFAULT current_setting('app.household_id', true)::uuid,
  id           TEXT NOT NULL,
  request_id   TEXT NOT NULL,
  actor_id     TEXT NOT NULL,
  action       TEXT NOT NULL,
  detail       TEXT NOT NULL DEFAULT '',
  created_at   TEXT NOT NULL,
  PRIMARY KEY (household_id, id)
);
