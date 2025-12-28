-- Add missing columns to repo_analysis
ALTER TABLE repo_analysis ADD COLUMN IF NOT EXISTS ai_percentage INTEGER DEFAULT 0;
ALTER TABLE repo_analysis ADD COLUMN IF NOT EXISTS last_analyzed_at TIMESTAMPTZ;

-- Add missing column to tracked_repos
ALTER TABLE tracked_repos ADD COLUMN IF NOT EXISTS ai_percentage INTEGER DEFAULT 0;
ALTER TABLE tracked_repos ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Add RLS policies for INSERT/UPDATE on repo_analysis
CREATE POLICY "Users can insert own repo analysis"
  ON repo_analysis FOR INSERT
  WITH CHECK (
    repo_id IN (
      SELECT tr.id FROM tracked_repos tr
      JOIN github_installations gi ON tr.installation_id = gi.id
      WHERE gi.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own repo analysis"
  ON repo_analysis FOR UPDATE
  USING (
    repo_id IN (
      SELECT tr.id FROM tracked_repos tr
      JOIN github_installations gi ON tr.installation_id = gi.id
      WHERE gi.user_id = auth.uid()
    )
  );

-- Add RLS policies for INSERT/UPDATE on repo_commits
CREATE POLICY "Users can insert own repo commits"
  ON repo_commits FOR INSERT
  WITH CHECK (
    repo_id IN (
      SELECT tr.id FROM tracked_repos tr
      JOIN github_installations gi ON tr.installation_id = gi.id
      WHERE gi.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own repo commits"
  ON repo_commits FOR UPDATE
  USING (
    repo_id IN (
      SELECT tr.id FROM tracked_repos tr
      JOIN github_installations gi ON tr.installation_id = gi.id
      WHERE gi.user_id = auth.uid()
    )
  );
