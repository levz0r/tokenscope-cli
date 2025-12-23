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
