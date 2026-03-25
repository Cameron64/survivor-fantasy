# Castaway — Agent Command Center

> Last updated: 2026-03-25 by Claude (sharp-dirac session)

## Orient Yourself (read this first)

Castaway is a multi-tenant Survivor Fantasy SaaS. Commissioners pay to run private fantasy leagues; players join free. Every commissioner brings 8–15 players at zero acquisition cost. The current live app runs Survivor S50 for ~20 real users. We're building self-serve league creation (commissioner flow) before the S51 premiere (Sep/Oct 2026). See [BUSINESS.md](BUSINESS.md) for the full roadmap and product vision.

## Environment Status

| Environment | URL | Last Deployed | Branch | Schema State | Seed State | Access Rules |
|---|---|---|---|---|---|---|
| Production | https://survivor-fantasy.up.railway.app | 2026-02-26 | main | Stable (pre-multi-league) | Real users — 20 users, 17 teams, 138 events | **READ ONLY. Never write. Never seed. Never run db push.** |
| Staging | https://castawayleagues.com | 2026-03-25 (in progress) | claude/sharp-dirac | Multi-league schema (Show/Season/LeagueMembership/LeagueInvite) — db push runs at startup | S50 data + Cam as ADMIN — run seed-staging.ts to populate | Safe to deploy, seed, and test |
| Local | localhost:3000 | — | any | Must match schema.prisma — run `pnpm db:push` | Run `npx tsx scripts/seed-staging.ts` against local DB | Safe for everything |

## Signpost Map

| Task | Read |
|---|---|
| Understand the business model / roadmap | [BUSINESS.md](BUSINESS.md) |
| Understand data models, API routes, auth patterns, file map | [.claude/CLAUDE.md](.claude/CLAUDE.md) |
| Deploy to staging | [environments/staging.md](environments/staging.md) |
| Run locally | [environments/local.md](environments/local.md) |
| Prod access rules and backup location | [environments/prod.md](environments/prod.md) |
| Seed a database | `scripts/seed-staging.ts` (idempotent, safe to re-run) |
| Add a new EventType | .claude/CLAUDE.md → Common Multi-File Changes |
| Add a new GameEventType | .claude/CLAUDE.md → Common Multi-File Changes |
| Add a new admin page | .claude/CLAUDE.md → Common Multi-File Changes |
| Understand commissioner flow (multi-league) | .claude/CLAUDE.md → Commissioner Flow API routes |
| Understand the user flow (built vs TODO) | [docs/user-flows.mmd](docs/user-flows.mmd) |
| Understand what pages need to be built | [docs/page-specs.md](docs/page-specs.md) |

## Agent Update Protocol

**You are responsible for keeping this file current.** Update `AGENTS.md` whenever you:

- **Deploy to any environment** → update the Environment Status row (Last Deployed, Branch, Schema State, Seed State)
- **Seed a database** → update Seed State in the relevant row
- **Add or change an API route** → update the route table in `.claude/CLAUDE.md`
- **Change the schema** → update Schema State column + note what changed
- **Complete a sprint milestone** → update BUSINESS.md roadmap status

Do not ask Cam to update docs. You changed it — you update it.

## Current Sprint (as of 2026-03-25)

**Goal:** POC the commissioner flow on staging — commissioner signs in → creates league → gets invite link → players join → see leaderboard.

**Status:**
- [x] Schema synced to staging DB (Show, Season, LeagueMembership, LeagueInvite models)
- [x] `scripts/seed-staging.ts` written (idempotent, S50 data + Cam ADMIN)
- [x] Commissioner API routes built (`/api/leagues`, `/api/leagues/[slug]/invites`, `/api/invites/[code]`, `/api/invites/[code]/join`)
- [x] Commissioner UI pages built (`/leagues/new`, `/leagues/[slug]/invite`, `/join/[code]`)
- [x] Multi-league routing (`/leagues/[slug]/*` with membership gate)
- [x] TypeScript clean — `tsc --noEmit` passes
- [ ] Staging deploy — build passes but server startup failing (db push issue with NOT NULL migration) — fix in progress via railway-start.sh patch
- [ ] Seed staging DB after successful deploy
