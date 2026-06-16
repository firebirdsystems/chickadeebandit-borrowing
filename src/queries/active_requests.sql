SELECT
  id,
  item_name,
  item_description,
  borrower_id,
  lender_id,
  needed_date,
  return_date,
  return_condition,
  status,
  borrower_agreed,
  lender_agreed,
  locked_at,
  created_at,
  updated_at
FROM app_borrowing__requests
WHERE status NOT IN ('returned', 'cancelled')
ORDER BY needed_date ASC
LIMIT 100
