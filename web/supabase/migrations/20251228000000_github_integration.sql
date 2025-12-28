-- GitHub App installations (when user installs our app)
CREATE TABLE github_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  installation_id BIGINT NOT NULL UNIQUE, -- GitHub's installation ID
  github_user_id BIGINT NOT NULL,
  github_username TEXT NOT NULL,
  access_token TEXT, -- Installation access token (refreshed automatically)
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Repositories being tracked
CREATE TABLE tracked_repos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id UUID NOT NULL REFERENCES github_installations(id) ON DELETE CASCADE,
  repo_id BIGINT NOT NULL, -- GitHub's repo ID
  repo_full_name TEXT NOT NULL, -- e.g., "user/repo"
  repo_name TEXT NOT NULL,
  default_branch TEXT DEFAULT 'main',
  is_active BOOLEAN DEFAULT true,
  last_analyzed_at TIMESTAMPTZ,
  last_push_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(installation_id, repo_id)
);

-- Commit analysis results (aggregated per repo)
CREATE TABLE repo_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id UUID NOT NULL REFERENCES tracked_repos(id) ON DELETE CASCADE,
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Commit stats
  total_commits INTEGER DEFAULT 0,
  ai_commits INTEGER DEFAULT 0,

  -- Line stats (from latest tree analysis)
  total_lines INTEGER,

  -- Cumulative lines added/removed by AI
  ai_lines_added INTEGER DEFAULT 0,
  ai_lines_removed INTEGER DEFAULT 0,

  UNIQUE(repo_id) -- One row per repo, updated incrementally
);

-- Individual commit tracking (for detailed history)
CREATE TABLE repo_commits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id UUID NOT NULL REFERENCES tracked_repos(id) ON DELETE CASCADE,
  commit_sha TEXT NOT NULL,
  commit_message TEXT,
  author_name TEXT,
  author_email TEXT,
  is_ai_generated BOOLEAN DEFAULT false,
  lines_added INTEGER DEFAULT 0,
  lines_removed INTEGER DEFAULT 0,
  committed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(repo_id, commit_sha)
);

-- Historical snapshots for trend charts
CREATE TABLE repo_analysis_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id UUID NOT NULL REFERENCES tracked_repos(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  total_commits INTEGER DEFAULT 0,
  ai_commits INTEGER DEFAULT 0,
  ai_percentage DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(repo_id, snapshot_date)
);

-- Indexes
CREATE INDEX idx_github_installations_user ON github_installations(user_id);
CREATE INDEX idx_tracked_repos_installation ON tracked_repos(installation_id);
CREATE INDEX idx_repo_analysis_repo ON repo_analysis(repo_id);
CREATE INDEX idx_repo_commits_repo ON repo_commits(repo_id);
CREATE INDEX idx_repo_commits_sha ON repo_commits(commit_sha);
CREATE INDEX idx_repo_analysis_history_repo_date ON repo_analysis_history(repo_id, snapshot_date);

-- RLS policies
ALTER TABLE github_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracked_repos ENABLE ROW LEVEL SECURITY;
ALTER TABLE repo_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE repo_commits ENABLE ROW LEVEL SECURITY;
ALTER TABLE repo_analysis_history ENABLE ROW LEVEL SECURITY;

-- Users can only see their own installations
CREATE POLICY "Users can view own installations"
  ON github_installations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own installations"
  ON github_installations FOR ALL
  USING (auth.uid() = user_id);

-- Users can see repos from their installations
CREATE POLICY "Users can view own repos"
  ON tracked_repos FOR SELECT
  USING (
    installation_id IN (
      SELECT id FROM github_installations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own repos"
  ON tracked_repos FOR ALL
  USING (
    installation_id IN (
      SELECT id FROM github_installations WHERE user_id = auth.uid()
    )
  );

-- Analysis data follows repo access
CREATE POLICY "Users can view own repo analysis"
  ON repo_analysis FOR SELECT
  USING (
    repo_id IN (
      SELECT tr.id FROM tracked_repos tr
      JOIN github_installations gi ON tr.installation_id = gi.id
      WHERE gi.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own repo commits"
  ON repo_commits FOR SELECT
  USING (
    repo_id IN (
      SELECT tr.id FROM tracked_repos tr
      JOIN github_installations gi ON tr.installation_id = gi.id
      WHERE gi.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own repo history"
  ON repo_analysis_history FOR SELECT
  USING (
    repo_id IN (
      SELECT tr.id FROM tracked_repos tr
      JOIN github_installations gi ON tr.installation_id = gi.id
      WHERE gi.user_id = auth.uid()
    )
  );
