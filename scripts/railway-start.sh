#!/bin/bash
set -e

echo "🔄 Pushing database schema..."
npx prisma db push --accept-data-loss

echo "🔧 Regenerating Prisma Client..."
npx prisma generate

echo "🚀 Starting Next.js server..."
exec next start -H 0.0.0.0
