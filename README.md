# Claude Code Analytics

A comprehensive analytics system for tracking Claude Code usage, including tool executions, file modifications, git operations, and token usage.

## Features

- **Session Tracking**: Track session duration and frequency
- **Tool Usage**: Monitor which tools are used most (Write, Edit, Read, Bash, etc.)
- **File Changes**: Track files modified, lines added/removed
- **Git Operations**: Count commits, pushes, PRs, and other git commands
- **Token Usage**: Via OpenTelemetry integration (optional)
- **CLI Dashboard**: Beautiful terminal-based analytics viewer
- **Grafana Dashboard**: Web-based visualization (optional)

## Quick Start

### Installation

```bash
cd /path/to/tokenscope
chmod +x install.sh
./install.sh
```

This will:
1. Install hooks to `~/.claude/analytics/`
2. Install the CLI to `~/.local/bin/cc-analytics`
3. Configure Claude Code hooks in `~/.claude/settings.json`
4. Initialize the SQLite database

### Usage

After installation, use the CLI to view your analytics:

```bash
# Show summary dashboard
cc-analytics

# List recent sessions
cc-analytics sessions

# Show tool usage (last 7 days)
cc-analytics tools

# Show most modified files
cc-analytics files

# Show git operations
cc-analytics git

# Show daily trends
cc-analytics daily

# Show projects by activity
cc-analytics projects

# Export to JSON
cc-analytics export my-analytics.json

# Show help
cc-analytics help
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                 Claude Code Session                  │
├─────────────────────────────────────────────────────┤
│  Hooks (PostToolUse, SessionStart, SessionEnd)      │
│  • Capture file edits, git commands, tool usage     │
└──────────────────────┬──────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        ▼                             ▼
┌───────────────────┐    ┌────────────────────────────┐
│ Local SQLite DB   │    │ OpenTelemetry (Optional)   │
│ • Tool executions │    │ • Tokens (in/out/cache)    │
│ • Git commands    │    │ • Cost tracking            │
│ • File changes    │    │ • Lines of code            │
└─────────┬─────────┘    └──────────┬─────────────────┘
          │                         │
          ▼                         ▼
   ┌────────────┐          ┌─────────────────┐
   │ cc-analytics│          │ Grafana Dashboard│
   │    CLI     │          │   (optional)    │
   └────────────┘          └─────────────────┘
```

## Data Collected

### From Hooks (Stored in SQLite)

| Data | Source | Description |
|------|--------|-------------|
| Sessions | SessionStart/End | Start time, duration, project |
| Tool Uses | PostToolUse | Tool name, success/failure |
| File Changes | Write/Edit tools | File path, lines added/removed |
| Git Operations | Bash tool | Command type, exit code |
| User Prompts | UserPromptSubmit | Prompt length |

### From OpenTelemetry (Optional)

| Metric | Description |
|--------|-------------|
| `claude_code.token.usage` | Input/output/cache tokens |
| `claude_code.lines_of_code.count` | Lines added/removed |
| `claude_code.commit.count` | Git commits |
| `claude_code.pull_request.count` | PRs created |
| `claude_code.cost.usage` | Estimated cost in USD |

## OpenTelemetry Setup (Optional)

For token usage tracking, set up the OpenTelemetry stack:

### Using Docker Compose

```bash
docker-compose up -d
```

This starts:
- **OpenTelemetry Collector**: Receives metrics from Claude Code
- **Prometheus**: Stores metrics
- **Grafana**: Visualization at http://localhost:3000 (admin/admin)

### Configure Claude Code

Add to `~/.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_ENABLE_TELEMETRY": "1",
    "OTEL_METRICS_EXPORTER": "otlp",
    "OTEL_EXPORTER_OTLP_ENDPOINT": "http://localhost:4317"
  }
}
```

## File Structure

```
tokenscope/
├── bin/
│   └── cc-analytics          # CLI tool
├── hooks/
│   └── analytics-hook.sh     # Main hook script
├── lib/
│   └── db.sh                 # Database functions
├── config/
│   ├── claude-settings.json  # Hook configuration
│   ├── otel-collector-config.yaml
│   ├── prometheus.yml
│   └── grafana/
│       ├── provisioning/
│       └── dashboards/
├── docker-compose.yaml
├── install.sh
└── README.md
```

## Database Location

Analytics are stored in:
```
~/.claude/analytics/analytics.db
```

You can query it directly with SQLite:
```bash
sqlite3 ~/.claude/analytics/analytics.db "SELECT * FROM sessions LIMIT 10;"
```

## Uninstall

```bash
# Remove installed files
rm -rf ~/.claude/analytics
rm ~/.local/bin/cc-analytics

# Remove hooks from settings (edit manually)
# Edit ~/.claude/settings.json and remove the hooks section
```

## Privacy

All data is stored locally on your machine. No data is sent to external servers unless you configure the OpenTelemetry stack with external exporters.

## License

MIT
