#!/bin/bash
# TokenScope - Background Sync Daemon
# This script syncs local analytics data to the cloud periodically.
# It's designed to be run by launchd (macOS) or cron (Linux).

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source database functions
source "$SCRIPT_DIR/db.sh"

# Log file
LOG_FILE="$DB_DIR/sync.log"

# Log function
log() {
    local level="$1"
    local message="$2"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $message" >> "$LOG_FILE"
}

# Main sync function
do_sync() {
    # Check if logged in
    if ! is_logged_in 2>/dev/null; then
        log "INFO" "Not logged in to cloud, skipping sync"
        exit 0
    fi

    # Ensure sync columns exist
    if ! is_sync_enabled 2>/dev/null; then
        log "INFO" "Migrating database for sync"
        migrate_for_sync 2>/dev/null
    fi

    # Get auth info
    local auth_json=$(get_cloud_auth)
    local api_key=$(echo "$auth_json" | jq -r '.[0].api_key')
    local api_url=$(echo "$auth_json" | jq -r '.[0].api_url')

    if [[ -z "$api_key" ]] || [[ "$api_key" == "null" ]]; then
        log "ERROR" "No API key found"
        exit 1
    fi

    # Get unsynced data
    local sessions=$(get_unsynced_sessions)
    local tool_uses=$(get_unsynced_tool_uses)
    local file_changes=$(get_unsynced_file_changes)
    local git_ops=$(get_unsynced_git_ops)

    # Count records
    local session_count=$(echo "$sessions" | jq -r 'length // 0' 2>/dev/null || echo "0")
    local tool_count=$(echo "$tool_uses" | jq -r 'length // 0' 2>/dev/null || echo "0")
    local file_count=$(echo "$file_changes" | jq -r 'length // 0' 2>/dev/null || echo "0")
    local git_count=$(echo "$git_ops" | jq -r 'length // 0' 2>/dev/null || echo "0")

    local total=$((session_count + tool_count + file_count + git_count))

    if [[ $total -eq 0 ]]; then
        log "INFO" "Nothing to sync"
        exit 0
    fi

    log "INFO" "Syncing $total records ($session_count sessions, $tool_count tools, $file_count files, $git_count git)"

    # Build payload
    local payload=$(jq -n \
        --argjson sessions "$sessions" \
        --argjson tool_uses "$tool_uses" \
        --argjson file_changes "$file_changes" \
        --argjson git_operations "$git_ops" \
        '{sessions: $sessions, tool_uses: $tool_uses, file_changes: $file_changes, git_operations: $git_operations}')

    # Send to API
    local response=$(curl -s -w "\n%{http_code}" \
        --max-time 30 \
        -X POST \
        -H "Authorization: Bearer $api_key" \
        -H "Content-Type: application/json" \
        -d "$payload" \
        "$api_url/api/sync" 2>&1)

    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')

    if [[ "$http_code" == "200" ]]; then
        # Mark as synced
        mark_sessions_synced
        mark_tool_uses_synced
        mark_file_changes_synced
        mark_git_ops_synced
        update_last_sync

        log "INFO" "Sync complete: $total records synced"
        log_sync "sync_complete" "$total"
    else
        log "ERROR" "Sync failed (HTTP $http_code): $body"
        log_sync "sync_error" "0" "HTTP $http_code: $body"
        exit 1
    fi
}

# Rotate log file if too large (> 1MB)
rotate_log() {
    if [[ -f "$LOG_FILE" ]]; then
        local size=$(wc -c < "$LOG_FILE" 2>/dev/null || echo "0")
        if [[ $size -gt 1048576 ]]; then
            mv "$LOG_FILE" "$LOG_FILE.old"
            log "INFO" "Log rotated"
        fi
    fi
}

# Run
rotate_log
do_sync
