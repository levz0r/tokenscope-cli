-- Link existing sessions to teams based on user's team membership
-- For users who are owners of a team, link all their sessions to that team

UPDATE sessions s
SET team_id = (
  SELECT tm.team_id
  FROM team_members tm
  WHERE tm.user_id = s.user_id
    AND tm.role = 'owner'
  LIMIT 1
)
WHERE s.team_id IS NULL
  AND EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.user_id = s.user_id AND tm.role = 'owner'
  );
