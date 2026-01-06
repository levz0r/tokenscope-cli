#!/bin/bash
# TokenScope CLI Installation Test
# Verifies that the installer works correctly and all files are properly installed

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

PASSED=0
FAILED=0

# Test helper functions
pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    PASSED=$((PASSED + 1))
}

fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    FAILED=$((FAILED + 1))
}

test_file_exists() {
    local file="$1"
    local desc="$2"
    if [[ -f "$file" ]]; then
        pass "$desc exists"
    else
        fail "$desc missing: $file"
    fi
}

test_file_executable() {
    local file="$1"
    local desc="$2"
    if [[ -x "$file" ]]; then
        pass "$desc is executable"
    else
        fail "$desc not executable: $file"
    fi
}

test_file_contains() {
    local file="$1"
    local pattern="$2"
    local desc="$3"
    if grep -q "$pattern" "$file" 2>/dev/null; then
        pass "$desc"
    else
        fail "$desc - pattern not found: $pattern"
    fi
}

test_command_succeeds() {
    local cmd="$1"
    local desc="$2"
    if eval "$cmd" >/dev/null 2>&1; then
        pass "$desc"
    else
        fail "$desc - command failed: $cmd"
    fi
}

echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${CYAN}           TokenScope CLI Installation Test                     ${NC}"
echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo

# Determine install source
INSTALL_SOURCE="${INSTALL_SOURCE:-production}"
echo -e "${YELLOW}Install source: ${INSTALL_SOURCE}${NC}"
echo

# ============================================================================
# STEP 1: Run the installer
# ============================================================================
echo -e "${BOLD}Step 1: Running installer...${NC}"
echo "─────────────────────────────────────────────────────────────────"

if [[ "$INSTALL_SOURCE" == "local" ]]; then
    # Install from local files (for testing local changes)
    if [[ -f "/repo/install.sh" ]]; then
        bash /repo/install.sh
    else
        fail "Local install.sh not found at /repo/install.sh"
        exit 1
    fi
else
    # Install from production
    curl -fsSL https://tokenscope.dev/install.sh | bash
fi

echo
echo -e "${BOLD}Step 2: Verifying installed files...${NC}"
echo "─────────────────────────────────────────────────────────────────"

# ============================================================================
# STEP 2: Verify file existence
# ============================================================================

# CLI binary
test_file_exists "$HOME/.local/bin/tokenscope" "CLI binary"
test_file_executable "$HOME/.local/bin/tokenscope" "CLI binary"

# Hook script
test_file_exists "$HOME/.claude/analytics/hooks/analytics-hook.sh" "Hook script"
test_file_executable "$HOME/.claude/analytics/hooks/analytics-hook.sh" "Hook script"

# Library files
test_file_exists "$HOME/.claude/analytics/lib/db.sh" "Database library"
test_file_executable "$HOME/.claude/analytics/lib/db.sh" "Database library"
test_file_exists "$HOME/.claude/analytics/lib/sync-daemon.sh" "Sync daemon"
test_file_executable "$HOME/.claude/analytics/lib/sync-daemon.sh" "Sync daemon"

# Database
test_file_exists "$HOME/.claude/analytics/analytics.db" "SQLite database"

# Claude settings
test_file_exists "$HOME/.claude/settings.json" "Claude settings"

echo
echo -e "${BOLD}Step 3: Verifying file contents...${NC}"
echo "─────────────────────────────────────────────────────────────────"

# ============================================================================
# STEP 3: Verify file contents
# ============================================================================

# Check CLI has correct server URL
test_file_contains "$HOME/.local/bin/tokenscope" "tokenscope.dev" "CLI contains correct server URL"

# Check db.sh has the session duration fix (INSERT OR IGNORE)
test_file_contains "$HOME/.claude/analytics/lib/db.sh" "INSERT OR IGNORE" "db.sh has session duration fix"

# Check hooks are configured in settings.json
test_file_contains "$HOME/.claude/settings.json" "SessionStart" "Settings has SessionStart hook"
test_file_contains "$HOME/.claude/settings.json" "PostToolUse" "Settings has PostToolUse hook"
test_file_contains "$HOME/.claude/settings.json" "analytics-hook.sh" "Settings references hook script"

# Check hook script sources db.sh
test_file_contains "$HOME/.claude/analytics/hooks/analytics-hook.sh" "db.sh" "Hook script sources db.sh"

echo
echo -e "${BOLD}Step 4: Verifying database schema...${NC}"
echo "─────────────────────────────────────────────────────────────────"

# ============================================================================
# STEP 4: Verify database schema
# ============================================================================

DB_FILE="$HOME/.claude/analytics/analytics.db"

# Check required tables exist
for table in sessions tool_uses file_changes git_operations skill_uses agent_spawns installed_plugins; do
    if sqlite3 "$DB_FILE" ".tables" | grep -q "$table"; then
        pass "Table '$table' exists"
    else
        fail "Table '$table' missing"
    fi
done

# Verify sessions table has required columns
SESSIONS_SCHEMA=$(sqlite3 "$DB_FILE" ".schema sessions")
for col in session_id start_time end_time source cwd project_name; do
    if echo "$SESSIONS_SCHEMA" | grep -q "$col"; then
        pass "sessions.$col column exists"
    else
        fail "sessions.$col column missing"
    fi
done

echo
echo -e "${BOLD}Step 5: Verifying CLI functionality...${NC}"
echo "─────────────────────────────────────────────────────────────────"

# ============================================================================
# STEP 5: Verify CLI works
# ============================================================================

# Test CLI can run
test_command_succeeds "$HOME/.local/bin/tokenscope help" "CLI help command"

# Test CLI can query database
test_command_succeeds "$HOME/.local/bin/tokenscope sessions" "CLI sessions command"

# Test CLI status (should show not connected)
if $HOME/.local/bin/tokenscope status 2>&1 | grep -q "Not connected\|Connected"; then
    pass "CLI status command works"
else
    fail "CLI status command failed"
fi

echo
echo -e "${BOLD}Step 6: Verifying hook functionality...${NC}"
echo "─────────────────────────────────────────────────────────────────"

# ============================================================================
# STEP 6: Test hook can be sourced and functions exist
# ============================================================================

# Source db.sh and check functions exist
if bash -c "source $HOME/.claude/analytics/lib/db.sh && type init_db >/dev/null 2>&1"; then
    pass "db.sh init_db function exists"
else
    fail "db.sh init_db function missing"
fi

if bash -c "source $HOME/.claude/analytics/lib/db.sh && type record_session_start >/dev/null 2>&1"; then
    pass "db.sh record_session_start function exists"
else
    fail "db.sh record_session_start function missing"
fi

if bash -c "source $HOME/.claude/analytics/lib/db.sh && type record_tool_use >/dev/null 2>&1"; then
    pass "db.sh record_tool_use function exists"
else
    fail "db.sh record_tool_use function missing"
fi

# ============================================================================
# SUMMARY
# ============================================================================
echo
echo -e "${BOLD}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}                         TEST SUMMARY                           ${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════════════════${NC}"
echo
echo -e "  ${GREEN}Passed${NC}: $PASSED"
echo -e "  ${RED}Failed${NC}: $FAILED"
echo

if [[ $FAILED -eq 0 ]]; then
    echo -e "${GREEN}${BOLD}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}${BOLD}Some tests failed!${NC}"
    exit 1
fi
