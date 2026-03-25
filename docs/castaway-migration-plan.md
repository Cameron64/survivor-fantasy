# Castaway — Technical SaaS Migration Plan

> `survivor-fantasy` → multi-tenant SaaS platform

**March 2026 | Internal Engineering Document**

---

## 1. Migration Overview

This document outlines every technical change required to transform `survivor-fantasy` from a single-tenant, single-league app into Castaway — a multi-tenant SaaS platform supporting multiple leagues, multiple shows, and paying commissioners.

> **The core domain logic (scoring engine, draft system, tribe tracking, event derivation) is production-ready and does NOT need to change.** The migration is a structural wrapper around existing functionality.

### The Core Problem

The app was built with a single League in mind. This assumption is baked into **28 places** where `db.league.findFirst()` is called with no filtering. Every API route, auth check, and page assumes one global league. Multi-tenancy requires scoping every data access to a specific league, identified by the authenticated user's membership.

### Migration Approach

Rather than a big-bang rewrite, the migration is sequenced as four discrete sprints that can be shipped and tested independently. The existing league data is preserved as `slug = 'legacy'` throughout.

| Sprint | Focus | Duration | Deliverable |
|--------|-------|----------|-------------|
| 1 | Schema & Data Model | 5–7 days | Multi-tenant DB, passing tests |
| 2 | Auth & Routing | 4–5 days | League-scoped URLs, role system |
| 3 | Stripe & Onboarding | 4–5 days | Self-serve creation + payments |
| 4 | Show Generalization | 3–4 days | Show/Season models, admin seeding |

---

## 2. Schema Changes

### 2.1 New Models

#### `Show`

Top-level entity representing a reality TV show. Sits above Season.

```prisma
model Show {
  id          String   @id @default(cuid())
  slug        String   @unique  // 'survivor', 'big-brother'
  name        String            // 'Survivor'
  description String?
  isActive    Boolean  @default(true)
  seasons     Season[]
  createdAt   DateTime @default(now())
}
```

#### `Season`

Replaces the hardcoded "Season 50" reference on League. Contestants are tied to a Season, not a League — multiple leagues can run on the same season's cast.

```prisma
model Season {
  id             String       @id @default(cuid())
  show           Show         @relation(fields: [showId], references: [id])
  showId         String
  number         Int          // 50, 51, etc.
  name           String?      // 'Season 50: Back to Basics'
  premiereDate   DateTime?
  finaleDate     DateTime?
  isActive       Boolean      @default(false)
  contestants    Contestant[]
  leagues        League[]
  createdAt      DateTime     @default(now())
  @@unique([showId, number])
}
```

#### `LeagueMembership`

Replaces the implicit "user is in the league" assumption. A user can belong to multiple leagues with different roles. The `COMMISSIONER` role replaces the current `ADMIN` role for league-level permissions.

```prisma
model LeagueMembership {
  id        String     @id @default(cuid())
  user      User       @relation(fields: [userId], references: [id])
  userId    String
  league    League     @relation(fields: [leagueId], references: [id])
  leagueId  String
  role      LeagueRole @default(PLAYER)
  joinedAt  DateTime   @default(now())
  @@unique([userId, leagueId])
}

enum LeagueRole {
  COMMISSIONER
  MODERATOR
  PLAYER
}
```

#### `LeagueInvite`

Replaces the `inviteCode` field on `User`. Invites are now league-scoped with optional expiry and usage limits.

```prisma
model LeagueInvite {
  id         String    @id @default(cuid())
  league     League    @relation(fields: [leagueId], references: [id])
  leagueId   String
  code       String    @unique @default(cuid())
  maxUses    Int?      // null = unlimited
  usedCount  Int       @default(0)
  expiresAt  DateTime?
  createdAt  DateTime  @default(now())
}
```

### 2.2 Modified Models

#### `League` — additions

```prisma
model League {
  // ... existing fields ...

  // NEW
  slug              String    @unique  // URL-safe: 'rodriguez-s51'
  season            Season?   @relation(fields: [seasonId], references: [id])
  seasonId          String?
  tier              LeagueTier @default(FREE)
  stripeCustomerId  String?
  stripePriceId     String?
  paidUntil         DateTime?
  memberships       LeagueMembership[]
  invites           LeagueInvite[]
}

enum LeagueTier {
  FREE
  COMMISSIONER
  COMMUNITY
}
```

#### `Contestant` — add `seasonId`

Contestants move from global to season-scoped. Multiple leagues can draft from the same contestant pool.

```prisma
model Contestant {
  // ... existing fields ...
  season    Season  @relation(fields: [seasonId], references: [id])
  seasonId  String
}
```

#### `Team` — add `leagueId`

```prisma
model Team {
  // ... existing fields ...
  league    League  @relation(fields: [leagueId], references: [id])
  leagueId  String
}
```

#### `Draft` — add `leagueId`

```prisma
model Draft {
  // ... existing fields ...
  league    League  @relation(fields: [leagueId], references: [id])
  leagueId  String  @unique
}
```

### 2.3 Migration Strategy

A Prisma migration will add all new columns as nullable first, then a data migration script backfills the legacy league's data before applying NOT NULL constraints.

1. Add new nullable columns + new models (additive migration — zero downtime)
2. Run data migration script: create `Show(Survivor)`, `Season(50)`, link existing League, set `seasonId` on all Contestants, create `LeagueMembership` for all existing Users
3. Apply NOT NULL constraints once data is verified
4. Remove deprecated `inviteCode` field from `User` in a follow-up migration

---

## 3. Auth & Routing Changes

### 3.1 League Context Pattern

The fundamental change is replacing the implicit "there is one league" assumption with an explicit "which league is this request for" pattern.

**Current pattern (28 occurrences to fix):**
```ts
const league = await db.league.findFirst()
```

**New pattern — league resolved from URL slug + membership check:**
```ts
// lib/league-context.ts
export async function requireLeagueMember(slug: string) {
  const { userId } = await auth()
  if (!userId) throw new UnauthorizedError()

  const membership = await db.leagueMembership.findFirst({
    where: { league: { slug }, user: { clerkId: userId } },
    include: { league: true }
  })
  if (!membership) throw new ForbiddenError()
  return { league: membership.league, role: membership.role }
}

export async function requireCommissioner(slug: string) {
  const ctx = await requireLeagueMember(slug)
  if (ctx.role !== 'COMMISSIONER') throw new ForbiddenError()
  return ctx
}
```

### 3.2 URL Structure Redesign

All league-scoped routes move under a `[leagueSlug]` dynamic segment.

| Current URL | New URL |
|-------------|---------|
| `/` | `/` (marketing landing) |
| `/leaderboard` | `/[leagueSlug]/leaderboard` |
| `/my-team` | `/[leagueSlug]/my-team` |
| `/contestants` | `/[leagueSlug]/contestants` |
| `/events/submit` | `/[leagueSlug]/events/submit` |
| `/simulation` | `/[leagueSlug]/simulation` |
| `/admin/*` | `/[leagueSlug]/admin/*` |
| *(new)* | `/create` — league creation flow |
| *(new)* | `/dashboard` — user's leagues list |

### 3.3 Role System Changes

| Role Level | Roles | Controls |
|------------|-------|----------|
| Platform (`User.role`) | `SUPER_ADMIN`, `USER` | Platform admin access, billing support |
| League (`LeagueMembership.role`) | `COMMISSIONER`, `MODERATOR`, `PLAYER` | League settings, event approval, draft management |

---

## 4. API Route Changes

### 4.1 Routes to Update

Every existing API route that calls `db.league.findFirst()` must be updated to accept a `leagueSlug` and use `requireLeagueMember()`. There are **28 instances across 10 files**.

| File | Change Required | Complexity |
|------|----------------|------------|
| `api/league/route.ts` | Accept leagueSlug param, scope to league | Low |
| `api/league/scoring/route.ts` | Scope to league | Low |
| `api/league/game-settings/route.ts` | Scope to league | Low |
| `api/contestants/route.ts` | Filter by league's seasonId | Low |
| `api/events/route.ts` | Filter by leagueId via GameEvent | Medium |
| `api/game-events/route.ts` | Add leagueId to create/filter | Medium |
| `api/draft/route.ts` | Scope to league's Draft record | Medium |
| `api/scores/route.ts` | Scope scoring calculation to league | Medium |
| `api/tribe-memberships/bulk/route.ts` | Scope to league | Low |
| `api/season-readiness/route.ts` | Scope to league's season | Low |

### 4.2 New API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `api/leagues` | POST | Create a new league (triggers Stripe Checkout) |
| `api/leagues` | GET | List leagues for current user |
| `api/leagues/[slug]` | GET / PATCH / DELETE | League CRUD |
| `api/leagues/[slug]/members` | GET / POST / DELETE | Membership management |
| `api/leagues/[slug]/invites` | POST | Generate invite links |
| `api/webhooks/stripe` | POST | Handle payment events |
| `api/shows` | GET | List available shows |
| `api/shows/[showId]/seasons` | GET | List seasons for a show |
| `api/admin/shows` | POST | Seed a new show (super-admin only) |
| `api/admin/seasons` | POST | Seed a new season + contestants |

---

## 5. Stripe Integration

### 5.1 Payment Flow

Payment is collected at league creation. The commissioner completes Stripe Checkout before the league is activated.

1. User fills out league creation form (name, season, player cap, scoring settings)
2. On submit, `POST /api/leagues` creates a pending League record and initiates a Stripe Checkout session
3. User completes payment on Stripe-hosted checkout page
4. Stripe webhook fires `payment_intent.succeeded` → `POST /api/webhooks/stripe` activates the league (sets `paidUntil`, `tier`)
5. User is redirected to `/[leagueSlug]` — their new league is live

### 5.2 Stripe Objects

| Stripe Object | Purpose |
|---------------|---------|
| Product: Commissioner Season | $49 one-time per season |
| Product: Community Season | $99 one-time per season |
| Customer | Created per commissioner, stored as `League.stripeCustomerId` |
| Checkout Session | Created at league activation, redirect flow |
| Webhook: `payment_intent.succeeded` | Activates league, sets `paidUntil` |
| Webhook: `charge.dispute` | Flag league for review |

### 5.3 Free Tier Enforcement

Free tier limits are enforced at the API level, not just in the UI.

```ts
// lib/tier-gates.ts
export async function checkPlayerCap(leagueId: string) {
  const league = await db.league.findUnique({
    where: { id: leagueId },
    include: { _count: { select: { memberships: true } } }
  })
  const cap = league.tier === 'FREE' ? 4 : league.tier === 'COMMISSIONER' ? 16 : 50
  if (league._count.memberships >= cap) throw new TierLimitError('Player cap reached')
}
```

| Feature | Free | Commissioner | Community |
|---------|------|-------------|-----------|
| Max players per league | 4 | 16 | 50 |
| Custom scoring | No | Yes | Yes |
| Slack bot | No | Yes | Yes |
| Simulation engine | No | Yes | Yes |
| Multiple leagues | 1 | 1 | 3 |
| Public league | No | Yes | Yes |

---

## 6. Show Generalization

### 6.1 What Changes for Multi-Show Support

The core scoring and event system is already mostly show-agnostic — `EventType` and `GameEventType` enums describe game mechanics, not Survivor-specific concepts. The main changes are:

- `Contestant` model gains `seasonId` (covered in schema changes)
- League creation flow adds a show/season picker instead of hardcoding Season 50
- Admin seeding tool can import contestants from JSON for any season
- UI terminology becomes configurable per show ("tribe" vs "alliance" vs "team")
- Scoring event types that are Survivor-specific are tagged with a `showId` filter

### 6.2 Season Seeding Tool

A new admin page at `/admin/seasons/new` allows super-admins to create a Season and import contestants via JSON upload.

```json
{
  "showId": "string",
  "seasonNumber": 51,
  "seasonName": "Survivor 51",
  "premiereDate": "2026-09-17",
  "contestants": [
    {
      "name": "string",
      "nickname": "string (optional)",
      "imageUrl": "string (optional)",
      "originalSeasons": "string (optional, e.g. '13,16')"
    }
  ]
}
```

### 6.3 Launch Scope

For the Season 51 launch, only the Survivor show is implemented. The Show/Season models are built to support future shows — no second show ships until Survivor is proven in production.

> Big Brother Season 27 premieres Summer 2026. If Season 51 launch goes well, Big Brother is the natural second show.

---

## 7. Sprint Plan & Sequencing

> **Total estimated effort: 16–21 engineering days (solo developer, focused).** Target completion: 8–10 weeks before Season 51 premiere to allow 2–3 weeks of beta testing.

### Sprint 1 — Schema & Data Model (Days 1–7)

**Goal:** Multi-tenant database schema with zero data loss. All existing functionality continues to work on the legacy league.

- [ ] Add `Show`, `Season`, `LeagueMembership`, `LeagueInvite` models
- [ ] Add new fields to `League`, `Contestant`, `Team`, `Draft`
- [ ] Write and run data migration script (seed Show, Season, backfill `seasonId`, create memberships)
- [ ] Update db helper functions: replace `findFirst()` with `findUnique({ where: { slug } })`
- [ ] Update all 28 `findFirst()` call sites with league-context-aware equivalents
- [ ] Verify: all existing tests pass, existing league works normally

### Sprint 2 — Auth & Routing (Days 8–12)

**Goal:** League-scoped URLs, role-based access control, user dashboard.

- [ ] Implement `requireLeagueMember()` / `requireCommissioner()` helpers in `lib/league-context.ts`
- [ ] Restructure app router: move `(dashboard)` routes under `[leagueSlug]`
- [ ] Add `/dashboard` — user's league list page
- [ ] Update all `admin/*` routes to use `requireCommissioner()`
- [ ] Update middleware to handle league-scoped auth
- [ ] Verify: existing league works at `/[slug]/*`, all auth checks pass

### Sprint 3 — Stripe & Onboarding (Days 13–17)

**Goal:** Self-serve league creation with payment, free tier enforcement.

- [ ] Install and configure Stripe Node SDK
- [ ] Create Stripe products + prices (Commissioner $49, Community $99)
- [ ] Build `/create` league creation wizard (name, season picker, player cap, scoring)
- [ ] Implement `POST /api/leagues` with Stripe Checkout session initiation
- [ ] Implement `POST /api/webhooks/stripe` (payment confirmation → league activation)
- [ ] Add `lib/tier-gates.ts` with player cap and feature flag enforcement
- [ ] Update league join flow to use `LeagueInvite` codes
- [ ] Verify: end-to-end league creation + payment in Stripe test mode

### Sprint 4 — Show Generalization (Days 18–21)

**Goal:** Show/Season admin tools, league creation picks a season, Season 51 data ready.

- [ ] Build `/admin/seasons/new` — JSON contestant import tool
- [ ] Seed Survivor Show record + Season 51 placeholder
- [ ] Update league creation form to show season picker
- [ ] Implement `/api/shows` and `/api/shows/[id]/seasons` endpoints
- [ ] Smoke test full flow: create league on Season 51, draft contestants, score events
- [ ] Final QA pass with 2–3 beta commissioner leagues

---

## 8. Technical Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| 28 `findFirst()` sites introduce regressions | High | Integration test suite before/after each sprint; feature flags to fall back to legacy path |
| Stripe webhook delivery failures | High | Idempotent webhook handler; retry logic; manual activation escape hatch |
| URL restructure breaks existing bookmarks | Medium | 301 redirects from old paths to `/[legacySlug]/*` during transition |
| Data migration corrupts existing league | High | Full `pg_dump` backup before migration; dry-run against staging copy first |
| Clerk user sync breaks with new membership model | Medium | Move membership creation to Clerk `user.created` webhook handler |
| Railway costs spike with multiple leagues | Medium | Shared DB (single Postgres instance, all leagues scoped by `leagueId`) |

---

## 9. Definition of Done

The migration is complete when all of the following are true:

### Functional
- [ ] A commissioner can create a new league end-to-end: signup → create → pay → invite → draft → score
- [ ] Two separate leagues can coexist with fully isolated data
- [ ] A free-tier league enforces the 4-player cap and disables premium features
- [ ] The legacy Season 50 league continues to work normally throughout
- [ ] Stripe test mode checkout completes and activates a league

### Technical
- [ ] Zero instances of `db.league.findFirst()` without a `where` clause remain in the codebase
- [ ] All API routes use `requireLeagueMember()` or `requireCommissioner()` for auth
- [ ] Prisma migrations are clean and reversible
- [ ] All existing Vitest unit tests pass
- [ ] All existing Playwright E2E tests pass (updated for new URL structure)

### Product
- [ ] `castaway.app` landing page is live with working waitlist form
- [ ] Season 51 contestant data is seeded and ready to draft
- [ ] At least 2 beta commissioner leagues have run a full draft in staging
- [ ] The public-facing product name is "Castaway" with no Survivor branding in domain/product name
