#!/bin/bash
# Claude Code Analytics Hook
# Captures tool usage, file changes, and git operations
#
# This script receives JSON input from Claude Code hooks and records
# analytics data to a local SQLite database.

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="$(dirname "$SCRIPT_DIR")/lib"

# Source database functions
source "$LIB_DIR/db.sh"

# Initialize database if needed (runs only once)
if [[ ! -f "$DB_FILE" ]]; then
    init_db >/dev/null 2>&1
fi

# Read JSON input from stdin
INPUT=$(cat)

# Parse common fields
HOOK_EVENT=$(echo "$INPUT" | jq -r '.hook_event_name // empty')
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')

# Exit if no session ID
if [[ -z "$SESSION_ID" ]]; then
    exit 0
fi

# Extract project name from cwd
PROJECT_NAME=""
if [[ -n "$CWD" ]]; then
    PROJECT_NAME=$(basename "$CWD")
fi

# Handle different hook events
case "$HOOK_EVENT" in
    "SessionStart")
        SOURCE=$(echo "$INPUT" | jq -r '.source // "startup"')
        record_session_start "$SESSION_ID" "$SOURCE" "$CWD" "$PROJECT_NAME"
        # Scan installed plugins on session start
        scan_installed_plugins 2>/dev/null || true
        ;;

    "SessionEnd")
        REASON=$(echo "$INPUT" | jq -r '.reason // "unknown"')
        record_session_end "$SESSION_ID" "$REASON"
        ;;

    "UserPromptSubmit")
        PROMPT=$(echo "$INPUT" | jq -r '.prompt // ""')
        PROMPT_LENGTH=${#PROMPT}
        record_user_prompt "$SESSION_ID" "$PROMPT_LENGTH"
        ;;

    "PostToolUse")
        TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
        TOOL_USE_ID=$(echo "$INPUT" | jq -r '.tool_use_id // empty')
        TOOL_INPUT=$(echo "$INPUT" | jq -r '.tool_input // {}')
        TOOL_RESPONSE=$(echo "$INPUT" | jq -r '.tool_response // {}')

        # Determine success from tool response
        SUCCESS=1
        if echo "$TOOL_RESPONSE" | jq -e '.error' >/dev/null 2>&1; then
            SUCCESS=0
        fi

        # Record the tool use
        record_tool_use "$SESSION_ID" "$TOOL_NAME" "$TOOL_USE_ID" "$SUCCESS"

        # Handle specific tools
        case "$TOOL_NAME" in
            "Write")
                FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // empty')
                CONTENT=$(echo "$TOOL_INPUT" | jq -r '.content // ""')
                # Count lines in new content
                LINES_ADDED=$(echo "$CONTENT" | wc -l | tr -d ' ')
                if [[ -n "$FILE_PATH" ]]; then
                    record_file_change "$SESSION_ID" "$TOOL_USE_ID" "$FILE_PATH" "write" "$LINES_ADDED" "0"
                fi
                ;;

            "Edit")
                FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // empty')
                OLD_STRING=$(echo "$TOOL_INPUT" | jq -r '.old_string // ""')
                NEW_STRING=$(echo "$TOOL_INPUT" | jq -r '.new_string // ""')
                # Estimate lines changed
                OLD_LINES=$(echo "$OLD_STRING" | wc -l | tr -d ' ')
                NEW_LINES=$(echo "$NEW_STRING" | wc -l | tr -d ' ')
                LINES_ADDED=$((NEW_LINES > OLD_LINES ? NEW_LINES - OLD_LINES : 0))
                LINES_REMOVED=$((OLD_LINES > NEW_LINES ? OLD_LINES - NEW_LINES : 0))
                if [[ -n "$FILE_PATH" ]]; then
                    record_file_change "$SESSION_ID" "$TOOL_USE_ID" "$FILE_PATH" "edit" "$LINES_ADDED" "$LINES_REMOVED"
                fi
                ;;

            "Read")
                FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // empty')
                if [[ -n "$FILE_PATH" ]]; then
                    record_file_change "$SESSION_ID" "$TOOL_USE_ID" "$FILE_PATH" "read" "0" "0"
                fi
                ;;

            "Skill")
                # Track skill/command invocations
                SKILL_NAME=$(echo "$TOOL_INPUT" | jq -r '.skill // empty')
                SKILL_ARGS=$(echo "$TOOL_INPUT" | jq -r '.args // empty')

                # Extract plugin name if skill is in format "plugin:skill"
                PLUGIN_NAME=""
                if [[ "$SKILL_NAME" == *":"* ]]; then
                    PLUGIN_NAME=$(echo "$SKILL_NAME" | cut -d':' -f1)
                    SKILL_NAME=$(echo "$SKILL_NAME" | cut -d':' -f2-)
                fi

                if [[ -n "$SKILL_NAME" ]]; then
                    record_skill_use "$SESSION_ID" "$SKILL_NAME" "$PLUGIN_NAME" "$SKILL_ARGS"
                fi
                ;;

            "Task")
                # Track agent/subagent spawns
                AGENT_TYPE=$(echo "$TOOL_INPUT" | jq -r '.subagent_type // empty')
                DESCRIPTION=$(echo "$TOOL_INPUT" | jq -r '.description // empty')
                MODEL=$(echo "$TOOL_INPUT" | jq -r '.model // empty')
                BACKGROUND=$(echo "$TOOL_INPUT" | jq -r '.run_in_background // false')

                # Convert boolean to integer
                BG_INT=0
                if [[ "$BACKGROUND" == "true" ]]; then
                    BG_INT=1
                fi

                if [[ -n "$AGENT_TYPE" ]]; then
                    record_agent_spawn "$SESSION_ID" "$AGENT_TYPE" "$DESCRIPTION" "$MODEL" "$BG_INT"
                fi
                ;;

            "Bash")
                COMMAND=$(echo "$TOOL_INPUT" | jq -r '.command // empty')
                EXIT_CODE=$(echo "$TOOL_RESPONSE" | jq -r '.exitCode // 0')

                # Check if it's a git command
                if [[ "$COMMAND" =~ ^git[[:space:]] ]]; then
                    # Determine git operation type
                    OP_TYPE="other"
                    if [[ "$COMMAND" =~ git[[:space:]]+commit ]]; then
                        OP_TYPE="commit"
                    elif [[ "$COMMAND" =~ git[[:space:]]+push ]]; then
                        OP_TYPE="push"
                    elif [[ "$COMMAND" =~ git[[:space:]]+pull ]]; then
                        OP_TYPE="pull"
                    elif [[ "$COMMAND" =~ git[[:space:]]+checkout ]]; then
                        OP_TYPE="checkout"
                    elif [[ "$COMMAND" =~ git[[:space:]]+branch ]]; then
                        OP_TYPE="branch"
                    elif [[ "$COMMAND" =~ git[[:space:]]+merge ]]; then
                        OP_TYPE="merge"
                    elif [[ "$COMMAND" =~ git[[:space:]]+rebase ]]; then
                        OP_TYPE="rebase"
                    elif [[ "$COMMAND" =~ git[[:space:]]+stash ]]; then
                        OP_TYPE="stash"
                    elif [[ "$COMMAND" =~ git[[:space:]]+reset ]]; then
                        OP_TYPE="reset"
                    elif [[ "$COMMAND" =~ git[[:space:]]+add ]]; then
                        OP_TYPE="add"
                    elif [[ "$COMMAND" =~ git[[:space:]]+status ]]; then
                        OP_TYPE="status"
                    elif [[ "$COMMAND" =~ git[[:space:]]+diff ]]; then
                        OP_TYPE="diff"
                    elif [[ "$COMMAND" =~ git[[:space:]]+log ]]; then
                        OP_TYPE="log"
                    fi

                    record_git_operation "$SESSION_ID" "$COMMAND" "$OP_TYPE" "$EXIT_CODE"
                fi

                # Check for gh (GitHub CLI) commands
                if [[ "$COMMAND" =~ ^gh[[:space:]] ]]; then
                    OP_TYPE="gh-other"
                    if [[ "$COMMAND" =~ gh[[:space:]]+pr[[:space:]]+create ]]; then
                        OP_TYPE="pr-create"
                    elif [[ "$COMMAND" =~ gh[[:space:]]+pr[[:space:]]+merge ]]; then
                        OP_TYPE="pr-merge"
                    elif [[ "$COMMAND" =~ gh[[:space:]]+pr[[:space:]]+view ]]; then
                        OP_TYPE="pr-view"
                    elif [[ "$COMMAND" =~ gh[[:space:]]+issue ]]; then
                        OP_TYPE="issue"
                    fi

                    record_git_operation "$SESSION_ID" "$COMMAND" "$OP_TYPE" "$EXIT_CODE"
                fi
                ;;
        esac
        ;;

    "PreToolUse")
        # We can use this for pre-execution logging if needed
        # Currently we focus on PostToolUse for accurate results
        ;;

    "Stop"|"SubagentStop")
        # Auto-sync to cloud (throttled to avoid too frequent syncs)
        # Only syncs if logged in and at least 5 minutes since last sync
        LAST_SYNC_FILE="/tmp/cc-analytics-last-sync"
        MIN_SYNC_INTERVAL=300  # 5 minutes

        # Check if logged in (using db function)
        if is_logged_in; then
            LAST_SYNC=$(cat "$LAST_SYNC_FILE" 2>/dev/null || echo 0)
            NOW=$(date +%s)

            if (( NOW - LAST_SYNC > MIN_SYNC_INTERVAL )); then
                # Run sync in background with quiet mode
                BIN_DIR="$(dirname "$SCRIPT_DIR")/bin"
                if [[ -x "$BIN_DIR/cc-analytics" ]]; then
                    "$BIN_DIR/cc-analytics" sync --quiet >/dev/null 2>&1 &
                elif command -v cc-analytics &>/dev/null; then
                    cc-analytics sync --quiet >/dev/null 2>&1 &
                fi
                echo "$NOW" > "$LAST_SYNC_FILE"
            fi
        fi
        ;;

    "PreCompact")
        # Context compaction event - useful for understanding context usage
        TRIGGER=$(echo "$INPUT" | jq -r '.trigger // "auto"')
        # Could record this as a special event if needed
        ;;
esac

exit 0
