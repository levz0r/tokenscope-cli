#!/bin/bash
# TokenScope - Installation Script
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
echo "║           TokenScope - Installation                ║"
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
cp "$SCRIPT_DIR/lib/utils.sh" "$INSTALL_DIR/lib/"
cp "$SCRIPT_DIR/lib/db.sh" "$INSTALL_DIR/lib/"
cp "$SCRIPT_DIR/lib/sync-daemon.sh" "$INSTALL_DIR/lib/"
cp "$SCRIPT_DIR/bin/tokenscope" "$BIN_DIR/"

# Make scripts executable
chmod +x "$INSTALL_DIR/hooks/analytics-hook.sh"
chmod +x "$INSTALL_DIR/lib/utils.sh"
chmod +x "$INSTALL_DIR/lib/db.sh"
chmod +x "$INSTALL_DIR/lib/sync-daemon.sh"
chmod +x "$BIN_DIR/tokenscope"

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
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash $HOME/.claude/analytics/hooks/analytics-hook.sh",
            "timeout": 10000
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
      },
      {
        "matcher": "Skill",
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

# Optional: Set up background sync daemon (macOS only)
if [[ "$(uname)" == "Darwin" ]]; then
    echo
    echo -e "${BLUE}Background Sync Setup (Optional)${NC}"
    echo -e "Would you like to enable automatic cloud sync every 5 minutes?"
    echo -e "This requires logging in with: ${CYAN}tokenscope login${NC}"
    read -p "Enable background sync? (y/N): " ENABLE_SYNC

    if [[ "$ENABLE_SYNC" =~ ^[Yy]$ ]]; then
        LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
        PLIST_FILE="com.claude-analytics.sync.plist"

        mkdir -p "$LAUNCH_AGENTS_DIR"

        # Create the plist with expanded $HOME
        cat > "$LAUNCH_AGENTS_DIR/$PLIST_FILE" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.claude-analytics.sync</string>

    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>$HOME/.claude/analytics/lib/sync-daemon.sh</string>
    </array>

    <key>StartInterval</key>
    <integer>300</integer>

    <key>RunAtLoad</key>
    <true/>

    <key>StandardOutPath</key>
    <string>/tmp/claude-analytics-sync.out</string>

    <key>StandardErrorPath</key>
    <string>/tmp/claude-analytics-sync.err</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin</string>
    </dict>
</dict>
</plist>
PLIST

        # Load the launch agent
        launchctl unload "$LAUNCH_AGENTS_DIR/$PLIST_FILE" 2>/dev/null || true
        launchctl load "$LAUNCH_AGENTS_DIR/$PLIST_FILE"

        echo -e "${GREEN}✓ Background sync enabled${NC}"
        echo -e "  Syncs every 5 minutes when logged in"
        echo -e "  Logs: /tmp/claude-analytics-sync.out"
    else
        echo -e "${YELLOW}Skipped background sync setup${NC}"
        echo -e "  You can manually sync with: ${CYAN}tokenscope sync${NC}"
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
echo -e "  ${DIM}CLI:${NC}       $BIN_DIR/tokenscope"
echo
echo -e "${BOLD}Local Analytics:${NC}"
echo -e "  ${CYAN}tokenscope${NC}           # Show summary dashboard"
echo -e "  ${CYAN}tokenscope sessions${NC}  # List recent sessions"
echo -e "  ${CYAN}tokenscope tools${NC}     # Show tool usage"
echo -e "  ${CYAN}tokenscope files${NC}     # Show modified files"
echo -e "  ${CYAN}tokenscope git${NC}       # Show git operations"
echo -e "  ${CYAN}tokenscope times${NC}     # Time analytics"
echo -e "  ${CYAN}tokenscope help${NC}      # Show all commands"
echo
echo -e "${BOLD}Cloud Sync (Optional):${NC}"
echo -e "  ${CYAN}tokenscope login${NC}     # Connect to cloud dashboard"
echo -e "  ${CYAN}tokenscope status${NC}    # Show sync status"
echo -e "  ${CYAN}tokenscope sync${NC}      # Sync data to cloud"
echo -e "  ${CYAN}tokenscope logout${NC}    # Disconnect from cloud"
echo
echo -e "${YELLOW}Note: Restart your terminal or run 'source ~/.zshrc' to use tokenscope${NC}"
echo
echo -e "${BOLD}Cloud Dashboard:${NC}"
echo -e "  Sign up at: ${CYAN}https://tokenscope.dev${NC}"
echo -e "  View team analytics, share with managers, track across devices"
echo
