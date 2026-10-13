WITH ordered AS (
  SELECT
    player_name,
    match_date,
    runs,
    ROW_NUMBER() OVER (PARTITION BY player_name ORDER BY match_date) AS match_seq
  FROM batting
),
qualifying AS (
  SELECT
    player_name,
    match_date,
    runs,
    match_seq,
    match_seq - ROW_NUMBER() OVER (PARTITION BY player_name ORDER BY match_date) AS island
  FROM ordered
  WHERE runs >= 30
)
SELECT
  player_name,
  MIN(match_date) AS streak_started_on,
  COUNT(*) AS matches_in_streak
FROM qualifying
GROUP BY player_name, island
HAVING COUNT(*) >= 3
ORDER BY streak_started_on, player_name;
