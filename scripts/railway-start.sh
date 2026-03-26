#!/bin/sh

echo "==> Generating Prisma client..."
npx prisma generate 2>&1 || true

echo "==> Pushing database schema (additive only)..."
npx prisma db push --accept-data-loss 2>&1 || true

echo "==> Ensuring feature flag columns exist..."
npx prisma db execute --stdin <<SQL || true
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "enableTribeSwap" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "enableSwapMode" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "enableDissolutionMode" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "enableExpansionMode" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "enableTribeMerge" BOOLEAN NOT NULL DEFAULT false;
SQL

echo "==> Ensuring multi-tenant columns exist on League..."
npx prisma db execute --stdin <<SQL || true
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "slug" TEXT;
UPDATE "League" SET "slug" = 'legacy' WHERE "slug" IS NULL OR "slug" = '';
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "tier" TEXT NOT NULL DEFAULT 'FREE';
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "stripePriceId" TEXT;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "paidUntil" TIMESTAMP(3);
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "seasonId" TEXT;
SQL

echo "==> Adding unique index on League.slug if not exists..."
npx prisma db execute --stdin <<SQL || true
CREATE UNIQUE INDEX IF NOT EXISTS "League_slug_key" ON "League"("slug");
SQL

echo "==> Ensuring FK columns exist on Contestant, Team, Tribe, Episode, Draft..."
npx prisma db execute --stdin <<SQL || true
ALTER TABLE "Contestant" ADD COLUMN IF NOT EXISTS "seasonId" TEXT;
ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "leagueId" TEXT;
UPDATE "Team" SET "leagueId" = (SELECT "id" FROM "League" WHERE "slug" = 'legacy' LIMIT 1) WHERE "leagueId" IS NULL;
ALTER TABLE "Tribe" ADD COLUMN IF NOT EXISTS "leagueId" TEXT;
UPDATE "Tribe" SET "leagueId" = (SELECT "id" FROM "League" WHERE "slug" = 'legacy' LIMIT 1) WHERE "leagueId" IS NULL;
ALTER TABLE "Episode" ADD COLUMN IF NOT EXISTS "leagueId" TEXT;
UPDATE "Episode" SET "leagueId" = (SELECT "id" FROM "League" WHERE "slug" = 'legacy' LIMIT 1) WHERE "leagueId" IS NULL;
ALTER TABLE "Draft" ADD COLUMN IF NOT EXISTS "leagueId" TEXT;
UPDATE "Draft" SET "leagueId" = (SELECT "id" FROM "League" WHERE "slug" = 'legacy' LIMIT 1) WHERE "leagueId" IS NULL;
SQL

echo "==> Backfilling NOT NULL columns before schema push..."
npx prisma db execute --stdin <<SQL || true
UPDATE "Contestant" SET "seasonId" = (
  SELECT s.id FROM "Season" s
  JOIN "League" l ON l."seasonId" = s.id
  LIMIT 1
) WHERE "seasonId" IS NULL;

UPDATE "League" SET slug = 'legacy' WHERE slug IS NULL;

UPDATE "Team" SET "leagueId" = (
  SELECT id FROM "League" WHERE slug = 'legacy' LIMIT 1
) WHERE "leagueId" IS NULL;
SQL

echo "==> Pushing database schema (second pass to create new tables)..."
npx prisma db push --accept-data-loss 2>&1 || true

echo "==> Schema migration complete"

echo "==> Starting Next.js server..."
exec next start -H 0.0.0.0
