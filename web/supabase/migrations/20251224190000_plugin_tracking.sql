-- Plugin, Skill, and Agent tracking tables
-- Tracks Claude Code plugin ecosystem usage

-- Skill/command usage tracking
CREATE TABLE IF NOT EXISTS skill_uses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    skill_name TEXT NOT NULL,
    plugin_name TEXT,
    args TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Agent/subagent spawn tracking
CREATE TABLE IF NOT EXISTS agent_spawns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    agent_type TEXT NOT NULL,
    description TEXT,
    model TEXT,
    background BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Installed plugins inventory
CREATE TABLE IF NOT EXISTS installed_plugins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    plugin_name TEXT NOT NULL,
    plugin_source TEXT,
    version TEXT,
    has_skills BOOLEAN DEFAULT FALSE,
    has_agents BOOLEAN DEFAULT FALSE,
    has_hooks BOOLEAN DEFAULT FALSE,
    has_mcp BOOLEAN DEFAULT FALSE,
    first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, plugin_name, plugin_source)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_skill_uses_session ON skill_uses(session_id);
CREATE INDEX IF NOT EXISTS idx_skill_uses_timestamp ON skill_uses(timestamp);
CREATE INDEX IF NOT EXISTS idx_skill_uses_skill_name ON skill_uses(skill_name);
CREATE INDEX IF NOT EXISTS idx_agent_spawns_session ON agent_spawns(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_spawns_timestamp ON agent_spawns(timestamp);
CREATE INDEX IF NOT EXISTS idx_agent_spawns_type ON agent_spawns(agent_type);
CREATE INDEX IF NOT EXISTS idx_installed_plugins_user ON installed_plugins(user_id);

-- Enable RLS
ALTER TABLE skill_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_spawns ENABLE ROW LEVEL SECURITY;
ALTER TABLE installed_plugins ENABLE ROW LEVEL SECURITY;

-- RLS Policies for skill_uses
CREATE POLICY "Users can view own skill uses" ON skill_uses
    FOR SELECT USING (
        session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can insert own skill uses" ON skill_uses
    FOR INSERT WITH CHECK (
        session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
    );

-- RLS Policies for agent_spawns
CREATE POLICY "Users can view own agent spawns" ON agent_spawns
    FOR SELECT USING (
        session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can insert own agent spawns" ON agent_spawns
    FOR INSERT WITH CHECK (
        session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
    );

-- RLS Policies for installed_plugins
CREATE POLICY "Users can view own plugins" ON installed_plugins
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own plugins" ON installed_plugins
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own plugins" ON installed_plugins
    FOR UPDATE USING (user_id = auth.uid());
