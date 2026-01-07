#!/bin/bash
# Utility functions for TokenScope
# Version: 1.0.0

# Marker file name for opting into tracking
TOKENSCOPE_MARKER=".tokenscope"

# Check if tracking is allowed for a directory
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

    # Walk up directory tree looking for .tokenscope
    while [[ "$dir" != "/" && -n "$dir" ]]; do
        if [[ -f "$dir/$TOKENSCOPE_MARKER" ]]; then
            return 0  # Marker found, tracking allowed
        fi
        dir="$(dirname "$dir")"
    done

    # Check root directory too
    if [[ -f "/$TOKENSCOPE_MARKER" ]]; then
        return 0
    fi

    return 1  # No marker found, tracking not allowed
}
