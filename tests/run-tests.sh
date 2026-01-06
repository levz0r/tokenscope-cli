#!/bin/bash
# Run TokenScope CLI installation tests in Docker
#
# Usage:
#   ./tests/run-tests.sh              # Test production install
#   ./tests/run-tests.sh --local      # Test local files

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"

# Parse arguments
INSTALL_SOURCE="production"
if [[ "$1" == "--local" ]]; then
    INSTALL_SOURCE="local"
fi

echo "Building test container..."
docker build -t tokenscope-test "$SCRIPT_DIR"

echo ""
echo "Running installation tests (source: $INSTALL_SOURCE)..."
echo ""

if [[ "$INSTALL_SOURCE" == "local" ]]; then
    # Mount local repo for testing local changes
    docker run --rm \
        -e INSTALL_SOURCE=local \
        -v "$REPO_DIR:/repo:ro" \
        tokenscope-test
else
    # Test production installation
    docker run --rm \
        -e INSTALL_SOURCE=production \
        tokenscope-test
fi
