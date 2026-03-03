# Survivor Fantasy League

A PWA for running a fantasy league around Survivor Season 50. Players draft contestants, and scores are calculated in real-time from approved game events.

## Stack

- **Framework:** Next.js 14 (App Router)
- **Auth:** Clerk
- **Database:** PostgreSQL via Prisma
- **Styling:** Tailwind CSS + shadcn/ui
- **Charts:** Recharts
- **PWA:** next-pwa
- **Deployment:** Railway

## Key Concepts

- **Scores are never stored.** All points are derived at runtime from approved `Event` records using `EVENT_POINTS` in `src/lib/scoring.ts`.
- **Two-layer event model.** Users submit structured `GameEvent`s (tribal council, challenge, etc.) which derive individual `Event` scoring rows via `src/lib/event-derivation.ts`.
- **Draft system.** Snake-draft with configurable round count and player order.
- **Simulation engine.** Monte Carlo season simulator with zero app dependencies for comparing scoring rules and draft strategies.

## Getting Started

```bash
# Install dependencies
pnpm install

# Set up environment variables (see below)
cp .env.example .env

# Push schema to database
pnpm db:push

# Seed data
pnpm db:seed

# Start dev server
pnpm dev
```

## Environment Variables

```
DATABASE_URL                          # PostgreSQL connection string
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY     # Clerk public key
CLERK_SECRET_KEY                      # Clerk secret key
CLERK_WEBHOOK_SECRET                  # Clerk webhook verification
SLACK_WEBHOOK_URL                     # Slack notifications (optional)
NEXT_PUBLIC_APP_URL                   # Public URL
```

## Commands

```bash
pnpm dev              # Dev server
pnpm build            # Production build
pnpm test             # Vitest unit tests
pnpm test:e2e         # Playwright E2E tests
pnpm typecheck        # TypeScript check
pnpm lint             # ESLint
pnpm db:push          # Push schema to DB
pnpm db:migrate       # Run migrations
pnpm db:seed          # Seed production data
pnpm db:studio        # Prisma Studio
pnpm sim:run          # Single draft simulation
pnpm sim:batch        # Monte Carlo batch
pnpm sim:compare      # A/B scoring comparison
```

## Scoring

| Event | Points |
|---|---|
| Individual Immunity Win | 5 |
| Reward Challenge Win | 3 |
| Team Challenge Win | 1 |
| Correct Vote | 2 |
| Idol Play Success | 5 |
| Idol Find | 3 |
| Zero Votes Received | 1 |
| Survived with Votes | 2 |
| Caused Blindside | 2 |
| Fire Making Win | 5 |
| Made Jury | 5 |
| Finalist | 10 |
| Winner | 20 |
| Voted Out with Idol | -3 |
| Quit | -10 |

## Project Structure

```
src/
  app/
    (auth)/          # Sign in, sign up, invite
    (dashboard)/     # Leaderboard, my team, contestants, events
    admin/           # Admin pages (contestants, draft, episodes, events, tribes, users)
    api/             # API routes
  components/
    ui/              # shadcn/ui primitives
    overview/        # Leaderboard & overview components
    events/          # Event cards, forms, review UI
    simulation/      # Simulation charts & controls
  lib/
    scoring.ts       # Point values & calculation
    event-derivation.ts  # GameEvent -> Event[] derivation
    auth.ts          # Auth helpers
    validation/      # Zod schemas
  simulation/        # Monte Carlo engine (zero app deps)
prisma/
  schema.prisma      # Database schema
```
