#!/bin/sh
set -e

echo "==> Pushing database schema..."
npx prisma db push --accept-data-loss || echo "WARNING: prisma db push failed"

echo "==> Regenerating Prisma Client..."
npx prisma generate || echo "WARNING: prisma generate failed"

echo "==> Starting Next.js server..."
exec next start -H 0.0.0.0
