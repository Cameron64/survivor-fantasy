# Sprint Status

_Last updated: 2026-03-23_

---

## Sprint 1 — Schema & Foundation ✅ DONE

- Multi-tenant Prisma schema: `Show`, `Season`, `League`, `LeagueMembership`, `LeagueInvite`
- Backfill migrations applied
- Local Docker Postgres dev environment (`docker-compose.dev.yml`)
- `prisma/seed.ts` seeds Show + Season 50 + League + Contestants + Episodes + Users
- `scripts/seed-multitenant.ts` backfill for multi-tenant structure
- `scripts/seed-season51.ts` stub for Season 51
- **116 unit tests passing** across scoring, event derivation, simulation engine, validation, and phase logic

---

## Sprint 2 — Auth & Routing Multi-Tenancy ✅ DONE

- `src/lib/league-context.ts` — `getLeagueBySlug()`, `getLegacyLeague()`, `requireLeagueBySlug()` helpers
- `src/lib/auth-helpers.ts` — shared auth utilities
- `src/lib/league-provider.tsx` — React context for league data in client components
- `src/app/[leagueSlug]/layout.tsx` — scoped layout resolving league from URL slug
- `src/app/[leagueSlug]/error.tsx`, `not-found.tsx` — error boundaries
- `src/app/dashboard/page.tsx` — post-login hub redirecting to the user's league
- All 28 API routes migrated from `db.league.findFirst()` to `getLegacyLeague()` (Sprint 2 compat layer)
- `src/app/create/page.tsx` — create a new league UI (Sprint 4 entry point)

---

## Sprint 3 — Payments / Billing ⏸ STUBBED

- Stripe integration stubbed — schema has `isPaid` / `stripeCustomerId` fields on `User`
- **Needs**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in `.env.local`
- Nothing else blocks Sprints 1/2/4

---

## Sprint 4 — Multi-Tenant League Flows ✅ DONE

- `prisma/schema.prisma` — full multi-tenant schema with `Show`/`Season`/`League`/`LeagueMembership`
- `src/app/create/page.tsx` — new league creation flow
- `src/app/admin/shows/page.tsx` — read-only admin view of all Shows and their Seasons
- `scripts/seed-season51.ts` — Season 51 seed stub for future use
- League slug routing fully wired via `[leagueSlug]` dynamic segment

---

## Sprint 2.5 — Page Migration ✅ DONE

All league-scoped user-facing pages ported from `src/app/(dashboard)/` into `src/app/[leagueSlug]/`.

### Pages migrated

| New path | Notes |
|---|---|
| `[leagueSlug]/leaderboard/page.tsx` | Uses `requireLeagueBySlug(leagueSlug)` for `showLastPlace`; params awaited per Next.js 16 |
| `[leagueSlug]/my-team/page.tsx` | Accepts `params: Promise<{ leagueSlug }>` — no league DB call needed (reads authed user's team) |
| `[leagueSlug]/contestants/page.tsx` | Pure DB query; no league scoping needed at this tier |
| `[leagueSlug]/events/page.tsx` | Client component; derives `leagueSlug` from `usePathname()` for navigation links |
| `[leagueSlug]/events/submit/` (full subtree) | All `router.push()` calls updated to `/${leagueSlug}/...`; `_lib/wizard-header.tsx` and `_lib/tribal-steps.tsx` use `pathname.split('/')[1]` to derive slug |
| `[leagueSlug]/settings/page.tsx` | Pure client component; no league-specific data needed |
| `[leagueSlug]/page.tsx` | Redirects to `/${leagueSlug}/leaderboard` as default league home |

### What was NOT changed
- `src/app/(dashboard)/` group is left intact for backward compatibility
- API routes unchanged — still serve the legacy league for now

### Verification
- `npx tsc --noEmit` — 0 errors
- `npx vitest run` — 116/116 tests passing

---

## Next Steps for Cam

1. **Wire `[leagueSlug]` pages** — DONE (Sprint 2.5). Pages are live under `src/app/[leagueSlug]/`.

2. **Season 51 seed** — `scripts/seed-season51.ts` exists but likely needs contestant data filled in once the cast is announced.

3. **Stripe** — add keys to `.env.local` and Railway env to activate billing. The schema and `isPaid` flag are ready.

4. **Create league flow** — `src/app/create/page.tsx` exists; verify it fully creates a `League` + `LeagueMembership` (COMMISSIONER) record and redirects to `/{slug}`.

5. **Deploy** — push to `main` triggers Railway production deploy. Run `pnpm typecheck && pnpm test` before pushing.
