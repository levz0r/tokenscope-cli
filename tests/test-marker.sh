#!/bin/bash
# TokenScope Marker File Tests
# Tests the .tokenscope marker functionality for privacy-first tracking

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Source the utils.sh to get the tracking functions
source "$PROJECT_DIR/lib/utils.sh"

# Create temp directory for tests
TEST_DIR=$(mktemp -d)
trap "rm -rf $TEST_DIR; rm -f /tmp/tokenscope-marker-cache-$$" EXIT

echo "═══════════════════════════════════════════════════════════"
echo " TokenScope Marker Tests"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Test directory: $TEST_DIR"
echo ""

# ============================================
# Test: No marker file
# ============================================
echo "Test 1: Directory without .tokenscope marker"
mkdir -p "$TEST_DIR/no-marker/subdir"

if is_tracking_allowed "$TEST_DIR/no-marker"; then
    fail "Tracking should NOT be allowed without marker"
else
    pass "Tracking correctly denied without marker"
fi

if is_tracking_allowed "$TEST_DIR/no-marker/subdir"; then
    fail "Tracking should NOT be allowed in subdir without marker"
else
    pass "Tracking correctly denied in subdir without marker"
fi

# ============================================
# Test: Marker in project root
# ============================================
echo ""
echo "Test 2: Directory with .tokenscope marker"
mkdir -p "$TEST_DIR/with-marker/subdir/deep"
touch "$TEST_DIR/with-marker/.tokenscope"

if is_tracking_allowed "$TEST_DIR/with-marker"; then
    pass "Tracking allowed in directory with marker"
else
    fail "Tracking should be allowed with marker"
fi

if is_tracking_allowed "$TEST_DIR/with-marker/subdir"; then
    pass "Tracking allowed in subdir (inherits from parent)"
else
    fail "Tracking should be allowed in subdir"
fi

if is_tracking_allowed "$TEST_DIR/with-marker/subdir/deep"; then
    pass "Tracking allowed in deep subdir (inherits from ancestor)"
else
    fail "Tracking should be allowed in deep subdir"
fi

# ============================================
# Test: Marker in parent, not in current
# ============================================
echo ""
echo "Test 3: Marker in parent directory only"
mkdir -p "$TEST_DIR/parent-marker/project/src/components"
touch "$TEST_DIR/parent-marker/.tokenscope"

if is_tracking_allowed "$TEST_DIR/parent-marker/project/src/components"; then
    pass "Tracking allowed when marker is in ancestor"
else
    fail "Tracking should be allowed when marker is in ancestor"
fi

# ============================================
# Test: Empty directory path
# ============================================
echo ""
echo "Test 4: Edge cases"

if is_tracking_allowed ""; then
    fail "Tracking should NOT be allowed for empty path"
else
    pass "Tracking correctly denied for empty path"
fi

# ============================================
# Test: Relative path handling
# ============================================
echo ""
echo "Test 5: Relative path handling"
mkdir -p "$TEST_DIR/relative-test"
touch "$TEST_DIR/relative-test/.tokenscope"

cd "$TEST_DIR/relative-test"
if is_tracking_allowed "."; then
    pass "Tracking allowed with relative path '.'"
else
    fail "Tracking should work with relative paths"
fi
cd - > /dev/null

# ============================================
# Test: Marker file content (should work even if empty)
# ============================================
echo ""
echo "Test 6: Marker file variants"
mkdir -p "$TEST_DIR/empty-marker"
touch "$TEST_DIR/empty-marker/.tokenscope"

if is_tracking_allowed "$TEST_DIR/empty-marker"; then
    pass "Empty marker file works"
else
    fail "Empty marker file should work"
fi

mkdir -p "$TEST_DIR/content-marker"
echo '{"team": "my-team"}' > "$TEST_DIR/content-marker/.tokenscope"

if is_tracking_allowed "$TEST_DIR/content-marker"; then
    pass "Marker file with content works"
else
    fail "Marker file with content should work"
fi

# ============================================
# Test: is_file_tracking_allowed function
# ============================================
echo ""
echo "Test 7: File path tracking (is_file_tracking_allowed)"

mkdir -p "$TEST_DIR/tracked-project/src"
touch "$TEST_DIR/tracked-project/.tokenscope"
mkdir -p "$TEST_DIR/untracked-project/src"

# File in tracked project
if is_file_tracking_allowed "$TEST_DIR/tracked-project/src/main.js"; then
    pass "File in tracked project is allowed"
else
    fail "File in tracked project should be allowed"
fi

# File in untracked project
if is_file_tracking_allowed "$TEST_DIR/untracked-project/src/main.js"; then
    fail "File in untracked project should NOT be allowed"
else
    pass "File in untracked project correctly denied"
fi

# Empty file path
if is_file_tracking_allowed ""; then
    fail "Empty file path should NOT be allowed"
else
    pass "Empty file path correctly denied"
fi

# ============================================
# Test: Cross-project file operations
# ============================================
echo ""
echo "Test 8: Cross-project scenarios (CWD vs file path)"

mkdir -p "$TEST_DIR/project-a"
touch "$TEST_DIR/project-a/.tokenscope"
mkdir -p "$TEST_DIR/project-b"
# project-b has no marker

# CWD in tracked project, file in untracked project
if is_tracking_allowed "$TEST_DIR/project-a"; then
    pass "CWD in project-a is tracked"
else
    fail "CWD in project-a should be tracked"
fi

if is_file_tracking_allowed "$TEST_DIR/project-b/file.txt"; then
    fail "File in project-b should NOT be tracked (no marker)"
else
    pass "File in project-b correctly not tracked"
fi

# CWD in untracked project, file in tracked project
if is_tracking_allowed "$TEST_DIR/project-b"; then
    fail "CWD in project-b should NOT be tracked"
else
    pass "CWD in project-b correctly not tracked"
fi

if is_file_tracking_allowed "$TEST_DIR/project-a/file.txt"; then
    pass "File in project-a is tracked (has marker)"
else
    fail "File in project-a should be tracked"
fi

# ============================================
# Test: Caching behavior
# ============================================
echo ""
echo "Test 9: Caching behavior"

# Clear cache
rm -f "$MARKER_CACHE_FILE"

mkdir -p "$TEST_DIR/cache-test"
touch "$TEST_DIR/cache-test/.tokenscope"

# First call should populate cache
is_tracking_allowed "$TEST_DIR/cache-test"
if [[ -f "$MARKER_CACHE_FILE" ]]; then
    pass "Cache file created after first check"
else
    fail "Cache file should be created"
fi

# Check cache contains the directory
if grep -q "$TEST_DIR/cache-test" "$MARKER_CACHE_FILE" 2>/dev/null; then
    pass "Directory cached after check"
else
    fail "Directory should be in cache"
fi

# ============================================
# Test: Nested markers (child overrides parent - NOT supported, just inherits)
# ============================================
echo ""
echo "Test 10: Nested project structure"

mkdir -p "$TEST_DIR/workspace/project1/src"
mkdir -p "$TEST_DIR/workspace/project2/src"
touch "$TEST_DIR/workspace/.tokenscope"

# Both projects should be tracked (inherit from workspace)
if is_tracking_allowed "$TEST_DIR/workspace/project1/src"; then
    pass "Project1 tracked (inherits from workspace)"
else
    fail "Project1 should be tracked"
fi

if is_tracking_allowed "$TEST_DIR/workspace/project2/src"; then
    pass "Project2 tracked (inherits from workspace)"
else
    fail "Project2 should be tracked"
fi

# ============================================
# Summary
# ============================================
echo ""
echo "═══════════════════════════════════════════════════════════"
echo " Results: $PASSED passed, $FAILED failed"
echo "═══════════════════════════════════════════════════════════"

if [[ $FAILED -gt 0 ]]; then
    exit 1
fi

exit 0
