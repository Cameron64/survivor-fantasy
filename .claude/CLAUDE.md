# Survivor Fantasy League - Full Reference

> **On arrival: read `AGENTS.md` first** for environment status, current sprint, and orientation before diving into this reference.

## Business Context

See `BUSINESS.md` in the repo root for the full product vision.

**TL;DR:** This app is becoming **Castaway**, a multi-tenant Survivor Fantasy SaaS. Commissioners pay to run leagues; players join free. Every commissioner brings 8–15 players at zero acquisition cost. Show expansion (Big Brother, The Traitors) is the growth multiplier. S51 premiere (Sep/Oct 2026) is the go-to-market forcing function — self-serve league creation must be live before then.

## Invariants

1. **Scores are never stored.** All points derive from `EVENT_POINTS` in `src/lib/scoring.ts`. The leaderboard queries approved `Event` rows and sums at runtime.
2. **Two sources of truth for point values.** `src/lib/scoring.ts` (app) and `src/simulation/engine/data-mapper.ts` (`BASE_EVENT_POINTS`). These must stay in sync manually. The simulation engine has zero app imports by design.
3. **GameEvents derive Events.** Users submit structured `GameEvent` (e.g. Tribal Council with votes/eliminated/idol data). `src/lib/event-derivation.ts` `deriveEvents()` explodes it into individual `Event` rows (CORRECT_VOTE, ZERO_VOTES_RECEIVED, etc.). Approving a GameEvent approves all its derived Events.
4. **Clerk is the auth source of truth.** Users sync to Prisma via webhook (`src/app/api/webhooks/clerk/route.ts`). Roles live in Clerk `publicMetadata.role` and sync to `User.role` in the DB.

## Point Values (EVENT_POINTS)

```
INDIVIDUAL_IMMUNITY_WIN: 5    CORRECT_VOTE: 2           ZERO_VOTES_RECEIVED: 1
REWARD_CHALLENGE_WIN: 3       IDOL_PLAY_SUCCESS: 5      SURVIVED_WITH_VOTES: 2
TEAM_CHALLENGE_WIN: 1         IDOL_FIND: 3              CAUSED_BLINDSIDE: 2
                              FIRE_MAKING_WIN: 5
MADE_JURY: 5                  VOTED_OUT_WITH_IDOL: -3
FINALIST: 10                  QUIT: -10
WINNER: 20
```

## Database Models (prisma/schema.prisma)

| Model | Purpose | Key Relations |
|---|---|---|
| `User` | Clerk-synced users | `clerkId` (unique), has one `Team`, submits/approves `Event`s |
| `Contestant` | Survivor S50 players | `isEliminated`, `eliminatedWeek`, has `Event`s, `TribeMembership`s |
| `Team` | Fantasy team (1:1 User) | Contains `TeamContestant[]` join records |
| `TeamContestant` | User's drafted contestant | `draftOrder`, unique on `[teamId, contestantId]` and `[teamId, draftOrder]` |
| `Event` | Individual scoring event | `type` (EventType enum), `contestantId`, `week`, `points`, `isApproved`, optional `gameEventId` |
| `GameEvent` | Structured game event | `type` (GameEventType enum), `data` (JSON), derives `Event[]` on approval |
| `League` | Season config (singleton-ish) | `season`, `draftStartDate`, `slackWebhook`, has `Tribe[]`, `Episode[]` |
| `Tribe` | Tribe in the season | `name`, `color` (hex), `isMerge` flag |
| `TribeMembership` | Contestant-tribe timeline | `fromWeek`, `toWeek` (null = current) |
| `Episode` | Episode schedule entry | `number`, `title`, `airDate` |
| `Draft` | Draft state machine | `currentPick`, `currentRound`, `draftOrder` (JSON array), `isComplete` |

**Enums:** `Role` (ADMIN, MODERATOR, USER), `EventType` (15 values), `GameEventType` (7 values)

## Auth Pattern

```typescript
// Server components & API routes:
import { getCurrentUser, requireUser, requireAdmin, requireModerator } from '@/lib/auth'

// getCurrentUser() - returns user with team+contestants or null
// requireUser()    - throws 'Unauthorized' if not logged in
// requireAdmin()   - throws 'Forbidden' if not ADMIN
// requireModerator() - throws 'Forbidden' if not ADMIN or MODERATOR
```

**Proxy** (`src/proxy.ts`): Clerk's `clerkMiddleware` (exported as `proxy` for Next.js 16) protects all routes except `/`, `/sign-in(.*)`, `/sign-up(.*)`, `/invite/(.*)`, `/api/webhooks/(.*)`.

## Validation Pattern

```typescript
// API routes - import schemas and validate
import { createEventSchema, formatZodError } from '@/lib/validation'

export async function POST(req: NextRequest) {
  const body = await req.json()

  const validationResult = createEventSchema.safeParse(body)
  if (!validationResult.success) {
    return NextResponse.json(
      { error: formatZodError(validationResult.error) },
      { status: 400 }
    )
  }

  const { type, contestantId, week } = validationResult.data // Type-safe!
  // ... proceed with validated data
}
```

**See:** `src/lib/validation/README.md` for complete documentation, `.claude/PHASE_3_VALIDATION.md` for quick reference.

## API Routes (src/app/api/)

### Core CRUD
| Route | Methods | Auth | Purpose |
|---|---|---|---|
| `contestants/` | GET, POST | User / Admin | List all, create new |
| `contestants/[id]/` | GET, PATCH, DELETE | User / Admin | Single contestant ops |
| `events/` | GET, POST | User | List (filterable by week/contestant), submit |
| `events/[id]/` | PATCH, DELETE | Mod+ | Approve/reject, delete |
| `game-events/` | POST | User | Submit structured game event (derives scoring events) |
| `game-events/[id]/` | PATCH, DELETE | Mod+ | Approve (cascades to derived events), delete |
| `scores/` | GET | User | Leaderboard calculation |
| `draft/` | POST, PATCH | Admin | Initialize draft, make pick |
| `users/` | GET | Admin | List all users |
| `users/[id]/` | PATCH | Admin | Update role, isPaid |
| `users/me/` | GET | User | Current user info |

### Season Management
| Route | Methods | Auth | Purpose |
|---|---|---|---|
| `episodes/` | GET, POST | User / Admin | List, create |
| `episodes/[id]/` | PATCH, DELETE | Admin | Update, delete |
| `episodes/bulk/` | POST | Admin | Bulk create episodes |
| `tribes/` | GET, POST | User / Admin | List, create |
| `tribes/[id]/` | PATCH, DELETE | Admin | Update, delete |
| `tribe-memberships/` | GET, POST | User / Admin | List, create |
| `tribe-memberships/[id]/` | PATCH, DELETE | Admin | Update, delete |
| `tribe-memberships/bulk/` | POST | Admin | Bulk create |
| `season-readiness/` | GET | User | Check if season setup is complete |

### Commissioner Flow (multi-league)
| Route | Methods | Auth | Purpose |
|---|---|---|---|
| `leagues/` | POST | User | Create a new league; caller becomes COMMISSIONER via LeagueMembership |
| `leagues/[slug]/invites/` | GET, POST | Commissioner / Admin | Get latest invite or generate a new invite code |
| `invites/[code]/` | GET | Public | Resolve invite code → league info (valid, name, slug) |
| `invites/[code]/join/` | POST | User | Join league via invite code; creates LeagueMembership(PLAYER) |

**Commissioner UI pages:**
| Route | Purpose |
|---|---|
| `/leagues/new` | Form to create a new league (inside dashboard layout) |
| `/leagues/[slug]/invite` | Shows invite link with copy button (server page + client display) |
| `/join/[code]` | Public invite landing page — sign in or join league |

### Other
| Route | Methods | Purpose |
|---|---|---|
| `simulation/{seasons,preview,run,batch,compare,explore}/` | GET/POST | Simulation API (admin) |
| `webhooks/clerk/` | POST | Clerk user sync (public, verified by webhook secret) |
| `health/` | GET | Railway health check |

## File Map

### Core Logic (src/lib/)
| File | What It Does | When to Touch |
|---|---|---|
| `scoring.ts` | `EVENT_POINTS`, `calculateTotalPoints()`, `calculatePointsByWeek()`, `getEventTypeLabel()`, `getEventTypesByCategory()` | Adding/changing event types or point values |
| `event-derivation.ts` | `deriveEvents()` - GameEvent -> Event[] mapping, data interfaces for each GameEventType | Adding new GameEventType or changing derivation rules |
| `auth.ts` | `getCurrentUser()`, `requireUser()`, `requireAdmin()`, `requireModerator()`, `syncUserFromClerk()` | Changing auth logic or user sync |
| `db.ts` | Prisma 7 client singleton with PrismaPg driver adapter | Changing DB config or connection pooling |
| `utils.ts` | `cn()` (tailwind merge), `formatDate()`, `generateInviteCode()` | Adding general utilities |
| `validation/` | **Zod schemas for type-safe validation** - `schemas.ts` (20+ schemas), `index.ts` (exports), `README.md` (docs) | Adding/modifying API validation, integrating with forms |
| `slack.ts` | Slack webhook notifications on event submit/approve | Changing notification format |
| `season.ts` | Season context utilities | Season-related logic |
| `season-readiness.ts` | Checks if all setup is done (contestants, tribes, episodes exist) | Changing what "ready" means |

### Pages (src/app/)

**Route groups:**
- `(auth)/` - Public: `sign-in/`, `sign-up/`, `invite/[code]/`
- `(dashboard)/` - Protected user pages: `leaderboard/`, `my-team/`, `contestants/`, `events/`, `events/submit/`, `settings/`
- `admin/` - Admin pages (see `src/app/admin/CLAUDE.md`): dashboard, `contestants/`, `draft/`, `episodes/`, `events/`, `league/`, `tribes/`, `users/`
- `(simulation)/` - Simulation tools: `simulation/`, `simulation/preview/`, `simulation/run/`, `simulation/batch/`, `simulation/compare/`, `simulation/explore/`

### Components (src/components/)
- `ui/` - shadcn/ui primitives (button, card, badge, avatar, select, dialog, tabs, input, label, textarea, checkbox, switch). Standard Radix + Tailwind pattern.
- `shared/pwa-update-notification.tsx` - Service worker update prompt
- `shared/season-setup-gate.tsx` - Blocks UI until season is configured
- `events/event-review.tsx` - Approve/reject UI for admins
- `events/tribal-council-form.tsx` - Structured tribal council submission
- `events/challenge-form.tsx` - Challenge event form
- `events/simple-event-form.tsx` - Generic event submission
- `simulation/` - Season selectors, draft config, point override editor, player search/detail, loading overlay
- `simulation/charts/` - Recharts visualizations (episode scores, comparisons, distributions, contributions, castaway values/trends, event trends)

## Deployment

**Railway** with Nixpacks. Config in `railway.toml`.
- `startCommand`: pushes schema then starts Next.js
- `healthcheckPath`: `/api/health`
- `railway.toml` sets `NIXPACKS_BUILD_CMD` and `NIXPACKS_START_CMD`

**GitHub Actions** (`.github/workflows/`):
- `deploy-prod.yml` - Push to `main` -> Railway production
- `deploy-dev.yml` - Dev branch -> Railway dev
- `test.yml` - Run tests on PR

**Environment:**
```
DATABASE_URL                          # PostgreSQL (required)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY     # Clerk public key (required)
CLERK_SECRET_KEY                      # Clerk secret key (required)
CLERK_WEBHOOK_SECRET                  # Webhook verification (required)
SLACK_WEBHOOK_URL                     # Slack notifications (optional)
NEXT_PUBLIC_APP_URL                   # Public URL (Railway)
```

## Common Multi-File Changes

### Adding a new EventType
1. `prisma/schema.prisma` - Add to `EventType` enum (with point comment)
2. `src/lib/scoring.ts` - Add to `EVENT_POINTS`, `getEventTypeLabel()`, `getEventTypesByCategory()`
3. `src/simulation/engine/data-mapper.ts` - Add to `BASE_EVENT_POINTS`, add mapping in `mapSeasonEvents()`
4. `pnpm db:push`
5. Tests: `tests/unit/scoring.test.ts`, `src/simulation/__tests__/data-mapper.test.ts`

### Adding a new GameEventType
1. `prisma/schema.prisma` - Add to `GameEventType` enum
2. `src/lib/event-derivation.ts` - Add data interface, add case to `deriveEvents()`, implement `derive*()` function, add to `getGameEventTypeLabel()`
3. Add form component in `src/components/events/`
4. Wire into `src/app/(dashboard)/events/submit/page.tsx`
5. `pnpm db:push`

### Adding a new admin page
1. Create `src/app/admin/[page]/page.tsx`
2. Use `requireAdmin()` or `requireModerator()` at top
3. Add navigation link in `src/app/admin/layout.tsx`

## Skills (.claude/skills/)

Pre-built agent workflows: `add-contestant.md`, `deploy.md`, `draft.md`, `e2e-testing.md`, `import-prod-data.md`, `score-event.md`, `simulate.md`, `slack-bot.md`, `telegram-bot.md`
