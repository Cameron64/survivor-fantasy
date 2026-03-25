#!/bin/sh

echo "==> Generating Prisma client..."
npx prisma generate 2>&1 || true

echo "==> Patching data for schema migration (idempotent)..."
npx prisma db execute --stdin <<'EOSQL' || true
INSERT INTO "Show" (id, slug, name, "isActive", "createdAt")
  VALUES ('show_survivor', 'survivor', 'Survivor', true, NOW())
  ON CONFLICT (id) DO NOTHING;
INSERT INTO "Season" (id, "showId", number, name, "isActive", "createdAt")
  VALUES ('season_survivor_50', 'show_survivor', 50, 'Survivor: In the Hands of the Fans', false, NOW())
  ON CONFLICT (id) DO NOTHING;
ALTER TABLE "Contestant" ADD COLUMN IF NOT EXISTS "seasonId" TEXT;
UPDATE "Contestant" SET "seasonId" = 'season_survivor_50' WHERE "seasonId" IS NULL;
UPDATE "League" SET "slug" = 'legacy' WHERE "slug" IS NULL OR "slug" = '';
EOSQL
echo "==> Data patch complete"

echo "==> Pushing database schema..."
npx prisma db push --accept-data-loss 2>&1 || true

echo "==> Ensuring feature flag columns exist..."
npx prisma db execute --stdin <<'EOSQL' || true
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "enableTribeSwap" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "enableSwapMode" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "enableDissolutionMode" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "enableExpansionMode" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "enableTribeMerge" BOOLEAN NOT NULL DEFAULT false;
EOSQL
echo "==> Column check complete"

echo "==> Starting Next.js server..."
exec next start -H 0.0.0.0
