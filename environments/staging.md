# Staging Environment

**Purpose:** Commissioner demo environment. This is where commissioners are sent to "try it." Treat it as a live demo — keep data clean and representative of the real product.

## URLs & Project Info

| | |
|---|---|
| **App URL** | https://castawayleagues.com |
| **Railway project** | Castaway Staging (ID: `b5269e8f-1d05-4662-9743-b96f1746e2e7`) |
| **Service** | `survivor-fantasy` (ID: `47180ed3-efcf-4bf4-8d87-61cf61fc1539`) |
| **Postgres service** | `Postgres` (get DATABASE_URL from Railway dashboard → Variables) |
| **Region** | us-west2 |

## Deploying

### Option A — Railway MCP (preferred in agent sessions)

```
# Already linked to Castaway Staging project. Just run:
mcp__railway__deploy(workspacePath, environment="production", service="survivor-fantasy")
```

If the link is wrong, re-link first:
```bash
railway link --project b5269e8f-1d05-4662-9743-b96f1746e2e7 --environment production --service survivor-fantasy
```

### Option B — CLI

```bash
cd /path/to/worktree
railway link --project b5269e8f-1d05-4662-9743-b96f1746e2e7 --environment production --service survivor-fantasy
railway up
```

### Option C — Dashboard

Railway dashboard → Castaway Staging → survivor-fantasy → Deployments → Deploy → select branch

## Startup Sequence (railway-start.sh)

The start script runs automatically at every deploy:

1. `npx prisma generate` — regenerates Prisma client
2. SQL data patch — creates Show/Season rows, fills NULL `seasonId` on Contestants, sets `slug` on Leagues (idempotent)
3. `npx prisma db push --accept-data-loss` — applies schema to DB
4. SQL to add feature-flag columns to League (idempotent)
5. `next start` — starts the server

The data patch step exists because we migrated to a multi-league schema (Show → Season → League → Contestant) and existing rows needed backfilled values before NOT NULL constraints could be applied.

## Seeding

After a fresh deploy (or whenever data needs reset):

```bash
# Get DATABASE_URL from Railway dashboard → Castaway Staging → Postgres → Variables
DATABASE_URL="postgresql://..." npx tsx scripts/seed-staging.ts
```

The seed script is **idempotent** — safe to re-run. It upserts:
- Show: `show_survivor` (Survivor)
- Season: `season_survivor_50` (S50 — In the Hands of the Fans)
- League: slug `legacy`, linked to S50
- 24 S50 contestants
- 3 tribes (Cila, Vatu, Kalo)
- 13 episodes (Feb–May 2026)
- Cam's user (`cameronrodriguez1@gmail.com`) as ADMIN

## Current State (2026-03-25)

- **Schema:** Multi-league branch (`claude/sharp-dirac`) — Show/Season/LeagueMembership/LeagueInvite models applied via `db push` at startup
- **Seed state:** Deploy in progress — seed not yet run on latest deploy. Previous state from `staging-deploy` branch had basic S50 data.
- **Last successful deploy:** 2026-03-24, commit `437b837` from `staging-deploy` branch
- **Active deployment:** `claude/sharp-dirac` — build passing, startup fix in progress

## Known Limitations

- `seasonId` was a new NOT NULL field on `Contestant` — the startup script patches this before `db push` to avoid migration failures
- Clerk is configured with test keys (`pk_test_*`) — Clerk instance is shared with prod's test environment
- No Slack webhook configured on staging
- Commissioner flow (create league, invite, join) is new as of this branch — not yet tested end-to-end on staging

## After Successful Deploy — Verify

1. Hit `https://castawayleagues.com/api/health` → should return `{ "status": "ok" }`
2. Sign in as `cameronrodriguez1@gmail.com` → should land on leaderboard
3. Check admin access: go to `/admin` → should work with ADMIN role
4. Test commissioner flow: `/leagues/new` → create league → get invite link → open in incognito → sign up → join
