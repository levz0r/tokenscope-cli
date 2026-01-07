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

# Source the utils.sh to get the is_tracking_allowed function
source "$PROJECT_DIR/lib/utils.sh"

# Create temp directory for tests
TEST_DIR=$(mktemp -d)
trap "rm -rf $TEST_DIR" EXIT

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
