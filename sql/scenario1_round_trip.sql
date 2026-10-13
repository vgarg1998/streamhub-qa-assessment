SELECT
  t1.id AS first_id,
  t1.from_account AS account_a,
  t1.to_account AS account_b,
  t1.amount AS amount_sent,
  t1.transferred_at AS sent_at,
  t2.id AS return_id,
  t2.amount AS amount_returned,
  t2.transferred_at AS returned_at
FROM transfers AS t1
JOIN transfers AS t2
  ON t1.from_account = t2.to_account
 AND t1.to_account = t2.from_account
 AND t2.transferred_at > t1.transferred_at
 AND t2.transferred_at <= datetime(t1.transferred_at, '+24 hours')
 AND t2.amount * 10 BETWEEN t1.amount * 9 AND t1.amount * 11
WHERE t1.from_account <> t1.to_account
ORDER BY t1.transferred_at, t2.transferred_at;
