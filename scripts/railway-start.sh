#!/bin/sh

echo "==> Pushing database schema..."
npx prisma db push --accept-data-loss 2>&1 || true

echo "==> Ensuring feature flag columns exist..."
npx prisma db execute --stdin <<'SQL' || true
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "enableTribeSwap" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "enableSwapMode" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "enableDissolutionMode" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "enableExpansionMode" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "enableTribeMerge" BOOLEAN NOT NULL DEFAULT false;
SQL
echo "==> Column check complete"

echo "==> Starting Next.js server..."
exec next start -H 0.0.0.0
