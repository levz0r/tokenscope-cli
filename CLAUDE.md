# Claude Code Instructions

This file provides instructions for Claude Code when working on this project.

## Project Overview

TokenScope is an open-source tool for tracking Claude Code usage locally, with an optional paid SaaS tier for teams.

## Current Status

**Phase:** 1 - Backend Setup
**Progress:** Not started

Always check `PLAN.md` for the current phase and progress before starting work.

## How to Work on This Project

### Before Starting Any Work

1. Read `PLAN.md` to understand current phase and checklist
2. Check which tasks are completed (marked with `[x]`)
3. Start with the next uncompleted task

### When Completing a Task

1. Mark the task as complete in `PLAN.md` by changing `[ ]` to `[x]`
2. Update the "Last Updated" date at the top of `PLAN.md`
3. If completing a phase, update the phase status from 🔴 to 🟢

### Phase Status Indicators

- 🔴 Not Started
- 🟡 In Progress
- 🟢 Completed

### When Starting a New Phase

1. Update the "Current Phase" in `PLAN.md`
2. Change the phase status to 🟡 In Progress
3. Announce to user: "Starting Phase X: [Phase Name]"

### When Completing a Phase

1. Mark all checklist items as `[x]`
2. Change phase status to 🟢 Completed
3. Update "Current Phase" to next phase
4. Announce: "Phase X completed. Ready for Phase Y."

## Key Files

| File | Purpose |
|------|---------|
| `PLAN.md` | Master plan with phases and checklists |
| `CLAUDE.md` | These instructions (you are here) |
| `README.md` | Public documentation |
| `bin/tokenscope` | CLI tool |
| `hooks/analytics-hook.sh` | Claude Code hook |
| `lib/db.sh` | Database functions |
| `web/` | Next.js SaaS app (to be created) |

## Tech Stack

- **CLI:** Bash + SQLite
- **Web:** Next.js + TypeScript + Tailwind + shadcn/ui
- **Database:** Supabase (Postgres)
- **Auth:** Supabase Auth
- **Billing:** Stripe
- **Hosting:** Vercel

## Commands Reference

```bash
# Run CLI locally
./bin/tokenscope

# Start web dev server (once created)
cd web && npm run dev

# Deploy to Vercel
cd web && vercel
```

## UI Styling Conventions

**ALWAYS use shared styles from `web/src/lib/styles.ts` when styling buttons and inputs.**

```typescript
import { buttonStyles, inputStyles } from '@/lib/styles'

// Buttons - use with variant="outline"
<Button variant="outline" className={buttonStyles.primary}>Click me</Button>

// Inputs
<Input className={inputStyles.default} />
```

Available styles:
- `buttonStyles.primary` - Main action buttons (slate background, white text)
- `buttonStyles.destructive` - Delete/remove actions (red tinted)
- `buttonStyles.ghost` - Minimal buttons
- `inputStyles.default` - Standard input fields

**Do NOT use blue (`bg-blue-600`) for buttons.** The app uses a slate/gray theme.

## Supabase Query Best Practices

**NEVER fetch all rows just to count them.** Supabase has a default limit of 1000 rows.

```typescript
// BAD - will max out at 1000
const { data } = await supabase.from('tool_uses').select('*')
const count = data?.length // Max 1000!

// GOOD - use count query
const { count } = await supabase
  .from('tool_uses')
  .select('*', { count: 'exact', head: true })
```

For dashboard numbers and statistics:
- Use `{ count: 'exact', head: true }` to get counts without fetching data
- Only fetch actual row data when needed for display (charts, lists)
- Limit data fetches to what's needed (e.g., `.limit(5000)` for chart data)

## Important Notes

1. **Always update PLAN.md** when completing tasks
2. **Test locally** before marking tasks complete
3. **Commit frequently** with descriptive messages
4. **Keep costs low** - use free tiers where possible
5. **Privacy first** - local data stays local unless user opts into sync
6. **Use shared styles** - Always import from `@/lib/styles` for buttons/inputs
7. **Keep install.sh files in sync** - There are two install.sh files that must stay synchronized:
   - `tokenscope-cli/install.sh` - Local install (copies files)
   - `tokenscope-landing/public/install.sh` - Web install (downloads from GitHub)
   When adding/removing lib files, update BOTH install scripts.

## Git Workflow

1. Work on `main` branch for now (MVP phase)
2. Commit after completing each task
3. Push to GitHub after completing each phase
4. Create releases for major milestones

## Questions?

If unclear about implementation details:
1. Check `PLAN.md` for specifics
2. Ask the user for clarification
3. Document decisions in the Notes section of `PLAN.md`
