#!/bin/bash
# Database initialization and helper functions for Claude Code Analytics
# Version: 1.0.0

# Default database location
DB_DIR="${CLAUDE_ANALYTICS_DIR:-$HOME/.claude/analytics}"
DB_FILE="${DB_DIR}/analytics.db"

# Ensure database directory exists
ensure_db_dir() {
    mkdir -p "$DB_DIR"
}

# Initialize database schema
init_db() {
    ensure_db_dir
    sqlite3 "$DB_FILE" <<'SQL'
-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    session_id TEXT PRIMARY KEY,
    start_time TEXT NOT NULL,
    end_time TEXT,
    source TEXT,  -- startup, resume, clear, compact
    reason TEXT,  -- exit reason: clear, logout, prompt_input_exit, other
    cwd TEXT,
    project_name TEXT
);

-- Tool usage tracking
CREATE TABLE IF NOT EXISTS tool_uses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    tool_name TEXT NOT NULL,
    tool_use_id TEXT,
    timestamp TEXT NOT NULL,
    success INTEGER DEFAULT 1,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);

-- File modifications tracking
CREATE TABLE IF NOT EXISTS file_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    tool_use_id TEXT,
    file_path TEXT NOT NULL,
    operation TEXT NOT NULL,  -- write, edit, read
    lines_added INTEGER DEFAULT 0,
    lines_removed INTEGER DEFAULT 0,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);

-- Git operations tracking
CREATE TABLE IF NOT EXISTS git_operations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    command TEXT NOT NULL,
    operation_type TEXT,  -- commit, push, pull, checkout, branch, merge, pr, etc.
    exit_code INTEGER,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);

-- Token usage (from OpenTelemetry or transcript parsing)
CREATE TABLE IF NOT EXISTS token_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    cache_read_tokens INTEGER DEFAULT 0,
    cache_creation_tokens INTEGER DEFAULT 0,
    model TEXT,
    cost_usd REAL DEFAULT 0,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);

-- User prompts tracking
CREATE TABLE IF NOT EXISTS user_prompts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    prompt_length INTEGER,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tool_uses_session ON tool_uses(session_id);
CREATE INDEX IF NOT EXISTS idx_tool_uses_timestamp ON tool_uses(timestamp);
CREATE INDEX IF NOT EXISTS idx_file_changes_session ON file_changes(session_id);
CREATE INDEX IF NOT EXISTS idx_git_operations_session ON git_operations(session_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_session ON token_usage(session_id);

-- Aggregated daily stats view
CREATE VIEW IF NOT EXISTS daily_stats AS
SELECT
    date(timestamp) as date,
    COUNT(DISTINCT session_id) as sessions,
    COUNT(*) as total_tool_uses,
    SUM(CASE WHEN tool_name = 'Write' THEN 1 ELSE 0 END) as writes,
    SUM(CASE WHEN tool_name = 'Edit' THEN 1 ELSE 0 END) as edits,
    SUM(CASE WHEN tool_name = 'Read' THEN 1 ELSE 0 END) as reads,
    SUM(CASE WHEN tool_name = 'Bash' THEN 1 ELSE 0 END) as bash_commands
FROM tool_uses
GROUP BY date(timestamp);
SQL
    echo "Database initialized at $DB_FILE"
}

# Insert session start
record_session_start() {
    local session_id="$1"
    local source="$2"
    local cwd="$3"
    local project_name="$4"

    ensure_db_dir
    sqlite3 "$DB_FILE" "
        INSERT OR REPLACE INTO sessions (session_id, start_time, source, cwd, project_name)
        VALUES ('$session_id', datetime('now'), '$source', '$cwd', '$project_name');
    "
}

# Update session end
record_session_end() {
    local session_id="$1"
    local reason="$2"

    sqlite3 "$DB_FILE" "
        UPDATE sessions
        SET end_time = datetime('now'), reason = '$reason'
        WHERE session_id = '$session_id';
    "
}

# Record tool use
record_tool_use() {
    local session_id="$1"
    local tool_name="$2"
    local tool_use_id="$3"
    local success="$4"

    sqlite3 "$DB_FILE" "
        INSERT INTO tool_uses (session_id, tool_name, tool_use_id, timestamp, success)
        VALUES ('$session_id', '$tool_name', '$tool_use_id', datetime('now'), $success);
    "
}

# Record file change
record_file_change() {
    local session_id="$1"
    local tool_use_id="$2"
    local file_path="$3"
    local operation="$4"
    local lines_added="${5:-0}"
    local lines_removed="${6:-0}"

    # Escape single quotes in file path
    file_path="${file_path//\'/\'\'}"

    sqlite3 "$DB_FILE" "
        INSERT INTO file_changes (session_id, tool_use_id, file_path, operation, lines_added, lines_removed, timestamp)
        VALUES ('$session_id', '$tool_use_id', '$file_path', '$operation', $lines_added, $lines_removed, datetime('now'));
    "
}

# Record git operation
record_git_operation() {
    local session_id="$1"
    local command="$2"
    local operation_type="$3"
    local exit_code="${4:-0}"

    # Escape single quotes in command
    command="${command//\'/\'\'}"

    sqlite3 "$DB_FILE" "
        INSERT INTO git_operations (session_id, command, operation_type, exit_code, timestamp)
        VALUES ('$session_id', '$command', '$operation_type', $exit_code, datetime('now'));
    "
}

# Record token usage
record_token_usage() {
    local session_id="$1"
    local input_tokens="$2"
    local output_tokens="$3"
    local cache_read="${4:-0}"
    local cache_creation="${5:-0}"
    local model="${6:-unknown}"
    local cost="${7:-0}"

    sqlite3 "$DB_FILE" "
        INSERT INTO token_usage (session_id, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens, model, cost_usd, timestamp)
        VALUES ('$session_id', $input_tokens, $output_tokens, $cache_read, $cache_creation, '$model', $cost, datetime('now'));
    "
}

# Record user prompt
record_user_prompt() {
    local session_id="$1"
    local prompt_length="$2"

    sqlite3 "$DB_FILE" "
        INSERT INTO user_prompts (session_id, prompt_length, timestamp)
        VALUES ('$session_id', $prompt_length, datetime('now'));
    "
}

# Get database file path
get_db_path() {
    echo "$DB_FILE"
}

# ============================================
# CLOUD SYNC FUNCTIONS
# ============================================

# Migrate database to add sync columns (run once)
migrate_for_sync() {
    ensure_db_dir
    sqlite3 "$DB_FILE" <<'SQL'
-- Add sync tracking columns to sessions
ALTER TABLE sessions ADD COLUMN synced INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN cloud_id TEXT;

-- Add sync tracking to tool_uses
ALTER TABLE tool_uses ADD COLUMN synced INTEGER DEFAULT 0;

-- Add sync tracking to file_changes
ALTER TABLE file_changes ADD COLUMN synced INTEGER DEFAULT 0;

-- Add sync tracking to git_operations
ALTER TABLE git_operations ADD COLUMN synced INTEGER DEFAULT 0;

-- Cloud authentication table
CREATE TABLE IF NOT EXISTS cloud_auth (
    id INTEGER PRIMARY KEY CHECK (id = 1),  -- Only one row allowed
    api_key TEXT NOT NULL,
    user_id TEXT,
    email TEXT,
    team_id TEXT,
    api_url TEXT DEFAULT 'http://localhost:3000',
    last_sync TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Sync log for tracking sync operations
CREATE TABLE IF NOT EXISTS sync_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operation TEXT NOT NULL,  -- sync_start, sync_complete, sync_error
    records_synced INTEGER DEFAULT 0,
    error_message TEXT,
    timestamp TEXT DEFAULT (datetime('now'))
);
SQL
    echo "Database migrated for cloud sync"
}

# Check if sync migration has been applied
is_sync_enabled() {
    local result=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM pragma_table_info('sessions') WHERE name='synced';" 2>/dev/null)
    [[ "$result" == "1" ]]
}

# Save cloud credentials
save_cloud_auth() {
    local api_key="$1"
    local api_url="${2:-http://localhost:3000}"
    local email="${3:-}"
    local user_id="${4:-}"
    local team_id="${5:-}"

    ensure_db_dir

    # Ensure sync tables exist
    if ! is_sync_enabled; then
        migrate_for_sync 2>/dev/null
    fi

    sqlite3 "$DB_FILE" "
        INSERT OR REPLACE INTO cloud_auth (id, api_key, api_url, email, user_id, team_id)
        VALUES (1, '$api_key', '$api_url', '$email', '$user_id', '$team_id');
    "
}

# Get cloud credentials
get_cloud_auth() {
    sqlite3 -json "$DB_FILE" "SELECT api_key, api_url, email, user_id, team_id, last_sync FROM cloud_auth WHERE id = 1;" 2>/dev/null
}

# Check if logged in to cloud
is_logged_in() {
    local result=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM cloud_auth WHERE id = 1;" 2>/dev/null)
    [[ "$result" == "1" ]]
}

# Clear cloud credentials (logout)
clear_cloud_auth() {
    sqlite3 "$DB_FILE" "DELETE FROM cloud_auth;" 2>/dev/null
}

# Update last sync time
update_last_sync() {
    sqlite3 "$DB_FILE" "UPDATE cloud_auth SET last_sync = datetime('now') WHERE id = 1;"
}

# Get unsynced sessions
get_unsynced_sessions() {
    sqlite3 -json "$DB_FILE" "
        SELECT session_id as local_session_id, start_time, end_time, project_name, source, reason
        FROM sessions
        WHERE synced = 0 OR synced IS NULL;
    " 2>/dev/null
}

# Get unsynced tool uses
get_unsynced_tool_uses() {
    sqlite3 -json "$DB_FILE" "
        SELECT t.session_id as local_session_id, t.tool_name, t.tool_use_id, t.timestamp, t.success
        FROM tool_uses t
        WHERE t.synced = 0 OR t.synced IS NULL;
    " 2>/dev/null
}

# Get unsynced file changes
get_unsynced_file_changes() {
    sqlite3 -json "$DB_FILE" "
        SELECT f.session_id as local_session_id, f.file_path, f.operation, f.lines_added, f.lines_removed, f.timestamp
        FROM file_changes f
        WHERE f.synced = 0 OR f.synced IS NULL;
    " 2>/dev/null
}

# Get unsynced git operations
get_unsynced_git_ops() {
    sqlite3 -json "$DB_FILE" "
        SELECT g.session_id as local_session_id, g.command, g.operation_type, g.exit_code, g.timestamp
        FROM git_operations g
        WHERE g.synced = 0 OR g.synced IS NULL;
    " 2>/dev/null
}

# Mark sessions as synced
mark_sessions_synced() {
    sqlite3 "$DB_FILE" "UPDATE sessions SET synced = 1 WHERE synced = 0 OR synced IS NULL;"
}

# Mark tool uses as synced
mark_tool_uses_synced() {
    sqlite3 "$DB_FILE" "UPDATE tool_uses SET synced = 1 WHERE synced = 0 OR synced IS NULL;"
}

# Mark file changes as synced
mark_file_changes_synced() {
    sqlite3 "$DB_FILE" "UPDATE file_changes SET synced = 1 WHERE synced = 0 OR synced IS NULL;"
}

# Mark git operations as synced
mark_git_ops_synced() {
    sqlite3 "$DB_FILE" "UPDATE git_operations SET synced = 1 WHERE synced = 0 OR synced IS NULL;"
}

# Log sync operation
log_sync() {
    local operation="$1"
    local records="${2:-0}"
    local error="${3:-}"

    sqlite3 "$DB_FILE" "
        INSERT INTO sync_log (operation, records_synced, error_message)
        VALUES ('$operation', $records, '$error');
    "
}

# Get sync stats
get_sync_stats() {
    sqlite3 "$DB_FILE" "
        SELECT
            (SELECT COUNT(*) FROM sessions WHERE synced = 0 OR synced IS NULL) as unsynced_sessions,
            (SELECT COUNT(*) FROM tool_uses WHERE synced = 0 OR synced IS NULL) as unsynced_tools,
            (SELECT COUNT(*) FROM file_changes WHERE synced = 0 OR synced IS NULL) as unsynced_files,
            (SELECT COUNT(*) FROM git_operations WHERE synced = 0 OR synced IS NULL) as unsynced_git,
            (SELECT last_sync FROM cloud_auth WHERE id = 1) as last_sync;
    "
}
