# Local Development Environment

## Prerequisites

- Node.js 22+
- pnpm (`corepack enable && corepack prepare pnpm@latest --activate`)
- PostgreSQL running locally (do NOT point at staging or prod)
- Clerk account (use the test keys from staging — same Clerk instance is fine for local)

## Required Environment Variables

Create `.env.local` in the repo root:

```env
# PostgreSQL — LOCAL instance only. Never use staging/prod URLs here.
DATABASE_URL="postgresql://postgres:<password>@localhost:5432/castaway_local"

# Clerk — get from Railway dashboard → Castaway Staging → Variables
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
CLERK_WEBHOOK_SECRET="whsec_..."

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Optional
SLACK_WEBHOOK_URL=""
```

To get the Clerk keys: Railway dashboard → Castaway Staging → survivor-fantasy service → Variables.

**Never copy `DATABASE_URL` from Railway.** That points at the staging DB. Use a local Postgres URL.

## Setup (first time)

```bash
# 1. Install dependencies
pnpm install

# 2. Generate Prisma client
npx prisma generate

# 3. Push schema to local DB (creates all tables)
pnpm db:push

# 4. Seed with S50 data
npx tsx scripts/seed-staging.ts
```

The seed script creates: Show, Season, League, 24 contestants, 3 tribes, 13 episodes, and sets up Cam's user as ADMIN (matched by Clerk user ID `user_39GSIvoMnjUWta9k0Vj8frUdCtg`).

## Running

```bash
pnpm dev
```

App runs at http://localhost:3000.

## Useful Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Start dev server with hot reload |
| `pnpm build` | Production build (catches TypeScript errors) |
| `npx tsc --noEmit` | TypeScript check without building |
| `pnpm db:push` | Push schema changes to local DB |
| `npx prisma studio` | Open Prisma Studio (DB GUI) at localhost:5555 |
| `npx tsx scripts/seed-staging.ts` | Seed local DB with S50 data (idempotent) |
| `pnpm test` | Run unit tests |

## Notes

- Clerk webhooks don't work locally unless you use a tunnel (ngrok/cloudflare). User sync to DB won't fire automatically — use `scripts/seed-staging.ts` to create users directly, or create them via Prisma Studio.
- The PWA service worker (`/sw.js`) only activates in production builds. Local dev has no SW.
- Feature flags (`enableTribeSwap`, etc.) default to `false` — toggle via Prisma Studio or direct SQL if testing flag-gated features.
- If you change `prisma/schema.prisma`, run `pnpm db:push` to apply and `npx prisma generate` to regenerate the client (or just `pnpm db:push` — it runs generate automatically via postinstall).
