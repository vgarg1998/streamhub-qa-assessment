CREATE TABLE transfers (
  id INTEGER PRIMARY KEY,
  from_account TEXT NOT NULL,
  to_account TEXT NOT NULL,
  amount INTEGER NOT NULL,
  transferred_at TEXT NOT NULL
);

CREATE TABLE batting (
  player_name TEXT NOT NULL,
  match_date TEXT NOT NULL,
  runs INTEGER NOT NULL
);
