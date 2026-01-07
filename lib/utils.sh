#!/bin/bash
# Utility functions for TokenScope
# Version: 1.0.0

# Marker file name for opting into tracking
TOKENSCOPE_MARKER=".tokenscope"

# Cache file for marker check results (per-session)
MARKER_CACHE_FILE="/tmp/tokenscope-marker-cache-$$"

# Initialize marker cache
init_marker_cache() {
    if [[ ! -f "$MARKER_CACHE_FILE" ]]; then
        touch "$MARKER_CACHE_FILE"
    fi
}

# Get cached result for a directory
# Returns: "1" (allowed), "0" (not allowed), or "" (not cached)
get_cached_marker_result() {
    local dir="$1"
    if [[ -f "$MARKER_CACHE_FILE" ]]; then
        grep -F "^${dir}=" "$MARKER_CACHE_FILE" 2>/dev/null | cut -d'=' -f2 | head -1
    fi
}

# Cache marker result for a directory
cache_marker_result() {
    local dir="$1"
    local result="$2"
    init_marker_cache
    # Append to cache (simple approach, duplicates OK for short sessions)
    echo "${dir}=${result}" >> "$MARKER_CACHE_FILE"
}

# Check if tracking is allowed for a directory (with caching)
# Returns 0 (true) if .tokenscope marker exists in dir or any parent
# Returns 1 (false) if no marker found
is_tracking_allowed() {
    local dir="$1"

    # If no directory provided, tracking not allowed
    if [[ -z "$dir" ]]; then
        return 1
    fi

    # Resolve to absolute path
    if [[ "$dir" != /* ]]; then
        dir="$(cd "$dir" 2>/dev/null && pwd)" || return 1
    fi

    # Check cache first
    local cached=$(get_cached_marker_result "$dir")
    if [[ "$cached" == "1" ]]; then
        return 0
    elif [[ "$cached" == "0" ]]; then
        return 1
    fi

    # Not cached, do the full check
    local original_dir="$dir"

    # Walk up directory tree looking for .tokenscope
    while [[ "$dir" != "/" && -n "$dir" ]]; do
        if [[ -f "$dir/$TOKENSCOPE_MARKER" ]]; then
            cache_marker_result "$original_dir" "1"
            return 0  # Marker found, tracking allowed
        fi
        dir="$(dirname "$dir")"
    done

    # Check root directory too
    if [[ -f "/$TOKENSCOPE_MARKER" ]]; then
        cache_marker_result "$original_dir" "1"
        return 0
    fi

    cache_marker_result "$original_dir" "0"
    return 1  # No marker found, tracking not allowed
}

# Check if tracking is allowed for a file path
# Extracts directory from file path and checks marker
is_file_tracking_allowed() {
    local file_path="$1"

    if [[ -z "$file_path" ]]; then
        return 1
    fi

    # Get directory of the file
    local dir=$(dirname "$file_path")

    is_tracking_allowed "$dir"
}
