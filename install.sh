#!/bin/bash
# Claude Code Analytics - Installation Script
#
# This script installs the analytics hooks and CLI tool for tracking
# Claude Code usage, file modifications, and git operations.

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Installation directories
INSTALL_DIR="$HOME/.claude/analytics"
BIN_DIR="$HOME/.local/bin"
CLAUDE_SETTINGS="$HOME/.claude/settings.json"

echo -e "${BOLD}${CYAN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║           Claude Code Analytics - Installation                ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check dependencies
echo -e "${BLUE}Checking dependencies...${NC}"

if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}Warning: jq is not installed. Installing via Homebrew...${NC}"
    if command -v brew &> /dev/null; then
        brew install jq
    else
        echo -e "${RED}Error: jq is required. Please install it manually:${NC}"
        echo "  brew install jq    # macOS"
        echo "  apt install jq     # Ubuntu/Debian"
        exit 1
    fi
fi

if ! command -v sqlite3 &> /dev/null; then
    echo -e "${RED}Error: sqlite3 is required but not installed.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Dependencies satisfied${NC}"

# Create installation directory
echo -e "${BLUE}Creating installation directory...${NC}"
mkdir -p "$INSTALL_DIR"/{hooks,lib,data}
mkdir -p "$BIN_DIR"

# Copy files
echo -e "${BLUE}Installing analytics files...${NC}"

cp "$SCRIPT_DIR/hooks/analytics-hook.sh" "$INSTALL_DIR/hooks/"
cp "$SCRIPT_DIR/lib/db.sh" "$INSTALL_DIR/lib/"
cp "$SCRIPT_DIR/bin/cc-analytics" "$BIN_DIR/"

# Make scripts executable
chmod +x "$INSTALL_DIR/hooks/analytics-hook.sh"
chmod +x "$INSTALL_DIR/lib/db.sh"
chmod +x "$BIN_DIR/cc-analytics"

echo -e "${GREEN}✓ Files installed${NC}"

# Initialize database
echo -e "${BLUE}Initializing database...${NC}"
source "$INSTALL_DIR/lib/db.sh"
init_db

echo -e "${GREEN}✓ Database initialized${NC}"

# Configure Claude Code hooks
echo -e "${BLUE}Configuring Claude Code hooks...${NC}"

# Create settings file if it doesn't exist
if [[ ! -f "$CLAUDE_SETTINGS" ]]; then
    echo '{}' > "$CLAUDE_SETTINGS"
fi

# Backup existing settings
cp "$CLAUDE_SETTINGS" "$CLAUDE_SETTINGS.backup.$(date +%Y%m%d%H%M%S)"

# Merge hooks configuration using jq
HOOKS_CONFIG=$(cat <<'EOF'
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash $HOME/.claude/analytics/hooks/analytics-hook.sh",
            "timeout": 5000
          }
        ]
      }
    ],
    "SessionEnd": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash $HOME/.claude/analytics/hooks/analytics-hook.sh",
            "timeout": 5000
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash $HOME/.claude/analytics/hooks/analytics-hook.sh",
            "timeout": 5000
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [{"type": "command", "command": "bash $HOME/.claude/analytics/hooks/analytics-hook.sh", "timeout": 5000}]
      },
      {
        "matcher": "Edit",
        "hooks": [{"type": "command", "command": "bash $HOME/.claude/analytics/hooks/analytics-hook.sh", "timeout": 5000}]
      },
      {
        "matcher": "Read",
        "hooks": [{"type": "command", "command": "bash $HOME/.claude/analytics/hooks/analytics-hook.sh", "timeout": 5000}]
      },
      {
        "matcher": "Bash",
        "hooks": [{"type": "command", "command": "bash $HOME/.claude/analytics/hooks/analytics-hook.sh", "timeout": 5000}]
      },
      {
        "matcher": "Glob",
        "hooks": [{"type": "command", "command": "bash $HOME/.claude/analytics/hooks/analytics-hook.sh", "timeout": 5000}]
      },
      {
        "matcher": "Grep",
        "hooks": [{"type": "command", "command": "bash $HOME/.claude/analytics/hooks/analytics-hook.sh", "timeout": 5000}]
      },
      {
        "matcher": "Task",
        "hooks": [{"type": "command", "command": "bash $HOME/.claude/analytics/hooks/analytics-hook.sh", "timeout": 5000}]
      }
    ]
  }
}
EOF
)

# Merge configurations
MERGED=$(jq -s '.[0] * .[1]' "$CLAUDE_SETTINGS" <(echo "$HOOKS_CONFIG"))
echo "$MERGED" > "$CLAUDE_SETTINGS"

echo -e "${GREEN}✓ Hooks configured${NC}"

# Add to PATH if needed
if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
    echo -e "${YELLOW}Adding $BIN_DIR to PATH...${NC}"

    SHELL_RC=""
    if [[ "$SHELL" == *"zsh"* ]]; then
        SHELL_RC="$HOME/.zshrc"
    elif [[ "$SHELL" == *"bash"* ]]; then
        SHELL_RC="$HOME/.bashrc"
    fi

    if [[ -n "$SHELL_RC" ]] && [[ -f "$SHELL_RC" ]]; then
        if ! grep -q "\.local/bin" "$SHELL_RC"; then
            echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$SHELL_RC"
            echo -e "${GREEN}✓ Added to $SHELL_RC${NC}"
        fi
    fi
fi

echo
echo -e "${BOLD}${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${GREEN}                    Installation Complete!                       ${NC}"
echo -e "${BOLD}${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo
echo -e "${BOLD}Files installed:${NC}"
echo -e "  ${DIM}Hooks:${NC}     $INSTALL_DIR/hooks/"
echo -e "  ${DIM}Library:${NC}   $INSTALL_DIR/lib/"
echo -e "  ${DIM}Database:${NC}  $INSTALL_DIR/analytics.db"
echo -e "  ${DIM}CLI:${NC}       $BIN_DIR/cc-analytics"
echo
echo -e "${BOLD}Usage:${NC}"
echo -e "  ${CYAN}cc-analytics${NC}           # Show summary dashboard"
echo -e "  ${CYAN}cc-analytics sessions${NC}  # List recent sessions"
echo -e "  ${CYAN}cc-analytics tools${NC}     # Show tool usage"
echo -e "  ${CYAN}cc-analytics files${NC}     # Show modified files"
echo -e "  ${CYAN}cc-analytics git${NC}       # Show git operations"
echo -e "  ${CYAN}cc-analytics help${NC}      # Show all commands"
echo
echo -e "${YELLOW}Note: Restart your terminal or run 'source ~/.zshrc' to use cc-analytics${NC}"
echo
echo -e "${BOLD}For OpenTelemetry token tracking (optional):${NC}"
echo -e "  See: $SCRIPT_DIR/config/otel-collector-config.yaml"
echo -e "  Or run: docker-compose up -d (from $SCRIPT_DIR)"
echo
