-- Claude Code Analytics - Supabase Database Schema
-- Run this in the Supabase SQL Editor to set up the database

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  api_key TEXT UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- TEAMS
-- ============================================
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TEAM MEMBERS
-- ============================================
CREATE TABLE IF NOT EXISTS team_members (
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (team_id, user_id)
);

-- ============================================
-- SESSIONS (synced from CLI)
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  local_session_id TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  project_name TEXT,
  source TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, local_session_id)
);

-- ============================================
-- TOOL USES
-- ============================================
CREATE TABLE IF NOT EXISTS tool_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  tool_use_id TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  success BOOLEAN DEFAULT true
);

-- ============================================
-- FILE CHANGES
-- ============================================
CREATE TABLE IF NOT EXISTS file_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('write', 'edit', 'read')),
  lines_added INTEGER DEFAULT 0,
  lines_removed INTEGER DEFAULT 0,
  timestamp TIMESTAMPTZ NOT NULL
);

-- ============================================
-- GIT OPERATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS git_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  command TEXT,
  operation_type TEXT NOT NULL,
  exit_code INTEGER DEFAULT 0,
  timestamp TIMESTAMPTZ NOT NULL
);

-- ============================================
-- SUBSCRIPTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID UNIQUE REFERENCES teams(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'canceled', 'past_due')),
  seats INTEGER DEFAULT 1,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_team_id ON sessions(team_id);
CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_tool_uses_session_id ON tool_uses(session_id);
CREATE INDEX IF NOT EXISTS idx_tool_uses_timestamp ON tool_uses(timestamp);
CREATE INDEX IF NOT EXISTS idx_file_changes_session_id ON file_changes(session_id);
CREATE INDEX IF NOT EXISTS idx_git_operations_session_id ON git_operations(session_id);
CREATE INDEX IF NOT EXISTS idx_profiles_api_key ON profiles(api_key);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE git_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's team IDs (SECURITY DEFINER to bypass RLS)
-- This prevents infinite recursion in team_members policies
CREATE OR REPLACE FUNCTION get_user_team_ids(check_user_id UUID)
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY SELECT team_id FROM team_members WHERE user_id = check_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Profiles: users can only see/edit their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Teams: members can view their teams
CREATE POLICY "Team members can view teams" ON teams
  FOR SELECT USING (id IN (SELECT get_user_team_ids(auth.uid())));

CREATE POLICY "Team owners can update teams" ON teams
  FOR UPDATE USING (
    id IN (
      SELECT tm.team_id FROM team_members tm
      WHERE tm.user_id = auth.uid() AND tm.role = 'owner'
    )
  );

-- Team members: users can see their own memberships + memberships of teams they're in
CREATE POLICY "Users can view own team memberships" ON team_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view team memberships of their teams" ON team_members
  FOR SELECT USING (team_id IN (SELECT get_user_team_ids(auth.uid())));

CREATE POLICY "Team admins can manage members" ON team_members
  FOR ALL USING (
    team_id IN (
      SELECT tm.team_id FROM team_members tm
      WHERE tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')
    )
  );

-- Sessions: users can view own sessions + team sessions
CREATE POLICY "Users can view own sessions" ON sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Team members can view team sessions" ON sessions
  FOR SELECT USING (team_id IN (SELECT get_user_team_ids(auth.uid())));

-- Tool uses: through session ownership
CREATE POLICY "Users can view own tool uses" ON tool_uses
  FOR ALL USING (
    session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
  );

CREATE POLICY "Team members can view team tool uses" ON tool_uses
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM sessions WHERE team_id IN (SELECT get_user_team_ids(auth.uid()))
    )
  );

-- File changes: through session ownership
CREATE POLICY "Users can view own file changes" ON file_changes
  FOR ALL USING (
    session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
  );

CREATE POLICY "Team members can view team file changes" ON file_changes
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM sessions WHERE team_id IN (SELECT get_user_team_ids(auth.uid()))
    )
  );

-- Git operations: through session ownership
CREATE POLICY "Users can view own git operations" ON git_operations
  FOR ALL USING (
    session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
  );

CREATE POLICY "Team members can view team git operations" ON git_operations
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM sessions WHERE team_id IN (SELECT get_user_team_ids(auth.uid()))
    )
  );

-- Subscriptions: team members can view, owners can manage
CREATE POLICY "Team members can view subscription" ON subscriptions
  FOR SELECT USING (team_id IN (SELECT get_user_team_ids(auth.uid())));

CREATE POLICY "Team owners can manage subscription" ON subscriptions
  FOR ALL USING (
    team_id IN (
      SELECT tm.team_id FROM team_members tm
      WHERE tm.user_id = auth.uid() AND tm.role = 'owner'
    )
  );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get user by API key (for CLI sync)
CREATE OR REPLACE FUNCTION get_user_by_api_key(key TEXT)
RETURNS TABLE (user_id UUID, email TEXT, team_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id as user_id,
    p.email,
    tm.team_id
  FROM profiles p
  LEFT JOIN team_members tm ON tm.user_id = p.id AND tm.role = 'owner'
  WHERE p.api_key = key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Regenerate API key
CREATE OR REPLACE FUNCTION regenerate_api_key(target_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  new_key TEXT;
BEGIN
  new_key := encode(gen_random_bytes(24), 'hex');

  UPDATE profiles
  SET api_key = new_key, updated_at = NOW()
  WHERE id = target_user_id AND id = auth.uid();

  RETURN new_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get analytics summary for a user
CREATE OR REPLACE FUNCTION get_user_analytics_summary(
  target_user_id UUID,
  days_back INTEGER DEFAULT 30
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_sessions', (
      SELECT COUNT(*) FROM sessions
      WHERE user_id = target_user_id
      AND start_time >= NOW() - (days_back || ' days')::INTERVAL
    ),
    'total_tool_uses', (
      SELECT COUNT(*) FROM tool_uses tu
      JOIN sessions s ON tu.session_id = s.id
      WHERE s.user_id = target_user_id
      AND tu.timestamp >= NOW() - (days_back || ' days')::INTERVAL
    ),
    'total_files_changed', (
      SELECT COUNT(DISTINCT file_path) FROM file_changes fc
      JOIN sessions s ON fc.session_id = s.id
      WHERE s.user_id = target_user_id
      AND fc.timestamp >= NOW() - (days_back || ' days')::INTERVAL
    ),
    'lines_added', (
      SELECT COALESCE(SUM(lines_added), 0) FROM file_changes fc
      JOIN sessions s ON fc.session_id = s.id
      WHERE s.user_id = target_user_id
      AND fc.timestamp >= NOW() - (days_back || ' days')::INTERVAL
    ),
    'lines_removed', (
      SELECT COALESCE(SUM(lines_removed), 0) FROM file_changes fc
      JOIN sessions s ON fc.session_id = s.id
      WHERE s.user_id = target_user_id
      AND fc.timestamp >= NOW() - (days_back || ' days')::INTERVAL
    ),
    'git_operations', (
      SELECT COUNT(*) FROM git_operations go
      JOIN sessions s ON go.session_id = s.id
      WHERE s.user_id = target_user_id
      AND go.timestamp >= NOW() - (days_back || ' days')::INTERVAL
    ),
    'tool_breakdown', (
      SELECT json_agg(json_build_object('tool', tool_name, 'count', cnt))
      FROM (
        SELECT tu.tool_name, COUNT(*) as cnt
        FROM tool_uses tu
        JOIN sessions s ON tu.session_id = s.id
        WHERE s.user_id = target_user_id
        AND tu.timestamp >= NOW() - (days_back || ' days')::INTERVAL
        GROUP BY tu.tool_name
        ORDER BY cnt DESC
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
