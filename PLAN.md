# Claude Code Analytics SaaS MVP Plan

## Status: Phase 3 - Web Dashboard

**Last Updated:** 2025-12-24
**Current Phase:** 3 of 5
**Progress:** Ready to start Phase 3

---

## Quick Reference

| Phase | Status | Target |
|-------|--------|--------|
| 1. Backend Setup | 🟢 Complete | Days 1-3 |
| 2. CLI Sync Feature | 🟢 Complete | Days 4-6 |
| 3. Web Dashboard | 🟡 In Progress | Days 7-10 |
| 4. Billing Integration | 🔴 Not Started | Days 11-13 |
| 5. Polish & Launch | 🔴 Not Started | Days 14-16 |

---

## Overview

Transform the existing local-only analytics CLI into a SaaS product with:
- Cloud sync for cross-device analytics
- Team dashboards for managers
- Stripe billing for monetization

**Tech Stack:** Next.js + Supabase + Vercel + Stripe
**Sync Model:** Background periodic sync (every 5 minutes)
**Timeline:** ~2-3 weeks

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     LOCAL (existing)                         │
│  Claude Code → Hooks → SQLite → cc-analytics CLI            │
└─────────────────────┬───────────────────────────────────────┘
                      │ Background sync daemon
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                     CLOUD (new)                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐ │
│  │ Supabase    │    │ Next.js API │    │ Next.js Web     │ │
│  │ - Auth      │◄──►│ - /api/sync │◄──►│ - Dashboard     │ │
│  │ - Postgres  │    │ - /api/team │    │ - Team mgmt     │ │
│  │ - Realtime  │    │             │    │ - Billing       │ │
│  └─────────────┘    └─────────────┘    └─────────────────┘ │
│                            │                                 │
│                     ┌──────▼──────┐                         │
│                     │   Stripe    │                         │
│                     │  Checkout   │                         │
│                     └─────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Backend Setup (Days 1-3)

### Checklist

- [x] Create Next.js project in `/web`
- [x] Install dependencies (Supabase, shadcn/ui)
- [x] Create Supabase project (manual step - see supabase.com)
- [x] Set up database schema (profiles, teams, sessions, etc.)
- [x] Configure Row Level Security policies
- [x] Create API route: `POST /api/sync`
- [x] Create API route: `GET /api/analytics/summary`
- [x] Create API route: `POST /api/auth/apikey`
- [x] Test API with curl

### Commands to Run

```bash
cd /Users/lev/Dev/claude-code-analytics
npx create-next-app@latest web --typescript --tailwind --app --src-dir
cd web
npx shadcn@latest init
npm install @supabase/supabase-js @supabase/ssr
```

### Database Schema

See `web/supabase/schema.sql` ✅ Created

### Files to Create

| File | Purpose |
|------|---------|
| `web/src/app/api/sync/route.ts` | Receive sync data from CLI |
| `web/src/app/api/auth/apikey/route.ts` | Generate/rotate API keys |
| `web/src/app/api/analytics/summary/route.ts` | Aggregated stats |
| `web/src/lib/supabase/server.ts` | Supabase server client |
| `web/src/lib/supabase/client.ts` | Supabase browser client |

---

## Phase 2: CLI Sync Feature (Days 4-6) ✅

### Checklist

- [x] Add sync tracking columns to SQLite schema
- [x] Create `cc-analytics login` command
- [x] Create `cc-analytics logout` command
- [x] Create `cc-analytics sync` command
- [x] Create `cc-analytics status` command
- [x] Create background sync daemon (`lib/sync-daemon.sh`)
- [x] Create launchd plist for periodic sync
- [x] Update `install.sh` to set up sync
- [x] Test full sync flow

### Files to Modify

| File | Changes |
|------|---------|
| `lib/db.sh` | Add `synced`, `cloud_id` columns, `cloud_auth` table |
| `bin/cc-analytics` | Add `login`, `logout`, `sync`, `status` commands |

### Files to Create

| File | Purpose |
|------|---------|
| `lib/sync-daemon.sh` | Background sync script |
| `config/com.claude-analytics.sync.plist` | launchd config |

---

## Phase 3: Web Dashboard (Days 7-10)

### Checklist

- [x] Set up Supabase Auth UI
- [x] Create landing page (`/`)
- [x] Create login page (`/login`)
- [x] Create dashboard page (`/dashboard`)
- [ ] Create sessions page (`/dashboard/sessions`)
- [ ] Create time analytics page (`/dashboard/time`)
- [ ] Create team dashboard (`/team`)
- [ ] Create team members page (`/team/members`)
- [x] Create settings page (`/settings`)
- [x] Add charts with Recharts
- [ ] Add data tables with TanStack Table

### Components to Create

```
web/src/components/
├── analytics/
│   ├── SummaryCards.tsx
│   ├── ToolUsageChart.tsx
│   ├── ActivityHeatmap.tsx
│   ├── FileChangesTable.tsx
│   └── SessionTimeline.tsx
├── team/
│   ├── TeamSelector.tsx
│   ├── MemberList.tsx
│   └── InviteModal.tsx
└── layout/
    ├── Navbar.tsx
    └── Sidebar.tsx
```

---

## Phase 4: Billing Integration (Days 11-13)

### Checklist

- [ ] Create Stripe account
- [ ] Create product and price ($20/seat/month)
- [ ] Set up Stripe webhook endpoint
- [ ] Create checkout session API route
- [ ] Create customer portal API route
- [ ] Add pricing page (`/pricing`)
- [ ] Add billing section to settings
- [ ] Implement feature gating based on subscription
- [ ] Test full billing flow

### Files to Create

| File | Purpose |
|------|---------|
| `web/src/lib/stripe.ts` | Stripe client |
| `web/src/app/api/checkout/route.ts` | Create checkout |
| `web/src/app/api/webhooks/stripe/route.ts` | Handle webhooks |
| `web/src/app/api/portal/route.ts` | Customer portal |
| `web/src/app/pricing/page.tsx` | Pricing page |

---

## Phase 5: Polish & Launch (Days 14-16)

### Checklist

- [ ] Design landing page with features/pricing
- [ ] Add error monitoring (Sentry)
- [ ] Add analytics (Vercel Analytics)
- [ ] Update README.md with cloud features
- [ ] Create setup documentation
- [ ] Record demo video/GIF
- [ ] Write Show HN post
- [ ] Test full flow end-to-end
- [ ] Deploy to production
- [ ] Submit to Hacker News

### Launch Checklist

- [ ] All tests passing
- [ ] Stripe in live mode
- [ ] Production environment variables set
- [ ] Domain configured
- [ ] SSL working
- [ ] Error monitoring active

---

## Environment Variables

### Local Development (`web/.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Production (Vercel)

Same keys with production values.

---

## Success Metrics

| Metric | Target (30 days post-launch) |
|--------|------------------------------|
| GitHub stars | 300+ |
| Signups | 100+ |
| Paying teams | 5+ |
| MRR | $500+ |

---

## Cost Estimate

| Service | Free Tier | Paid |
|---------|-----------|------|
| Vercel | 100GB bandwidth | $20/mo |
| Supabase | 500MB DB | $25/mo |
| Stripe | 2.9% + $0.30 | - |
| Domain | - | $12/yr |

**Break-even:** 3 paying seats

---

## Notes

_Add notes, blockers, and decisions here as you progress._

