import { db } from '@/lib/db'

let columnsEnsured = false

/**
 * Ensure feature flag columns exist on the League table.
 * Uses the app's live DB connection ($executeRaw) which is guaranteed to work
 * even when prisma db push / CLI tools fail during deployment.
 *
 * Runs once per server lifecycle, then caches the result.
 */
export async function ensureFeatureFlagColumns() {
  if (columnsEnsured) return

  await db.$executeRaw`
    ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "enableTribeSwap" BOOLEAN NOT NULL DEFAULT false
  `
  await db.$executeRaw`
    ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "enableSwapMode" BOOLEAN NOT NULL DEFAULT false
  `
  await db.$executeRaw`
    ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "enableDissolutionMode" BOOLEAN NOT NULL DEFAULT false
  `
  await db.$executeRaw`
    ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "enableExpansionMode" BOOLEAN NOT NULL DEFAULT false
  `
  await db.$executeRaw`
    ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "enableTribeMerge" BOOLEAN NOT NULL DEFAULT false
  `

  columnsEnsured = true
}
