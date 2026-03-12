import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ensureFeatureFlagColumns } from '@/lib/ensure-feature-flag-columns'

/**
 * GET /api/admin/feature-flags/debug
 * Diagnostic endpoint to check feature flag column state in production.
 */
export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const results: Record<string, unknown> = {}

  // Step 1: Check if columns exist
  try {
    const columns = await db.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'League'
      AND column_name IN ('enableTribeSwap', 'enableSwapMode', 'enableDissolutionMode', 'enableExpansionMode', 'enableTribeMerge')
    `
    results.existingColumns = columns.map((c) => c.column_name)
  } catch (e) {
    results.columnCheckError = String(e)
  }

  // Step 2: Ensure columns exist
  try {
    await ensureFeatureFlagColumns()
    results.ensureColumnsResult = 'success'
  } catch (e) {
    results.ensureColumnsError = String(e)
  }

  // Step 3: Read current values
  try {
    const rows = await db.$queryRaw<Record<string, unknown>[]>`
      SELECT "id", "isActive", "enableTribeSwap", "enableSwapMode",
             "enableDissolutionMode", "enableExpansionMode", "enableTribeMerge"
      FROM "League"
      LIMIT 5
    `
    results.leagues = rows
  } catch (e) {
    results.readError = String(e)
  }

  // Step 4: Test update
  try {
    const league = await db.league.findFirst({
      where: { isActive: true },
      select: { id: true },
    })
    if (league) {
      await db.$executeRaw`
        UPDATE "League" SET "enableTribeSwap" = true WHERE "id" = ${league.id}
      `
      const verify = await db.$queryRaw<Record<string, unknown>[]>`
        SELECT "enableTribeSwap" FROM "League" WHERE "id" = ${league.id}
      `
      results.testUpdate = { leagueId: league.id, afterUpdate: verify[0] }

      // Revert
      await db.$executeRaw`
        UPDATE "League" SET "enableTribeSwap" = false WHERE "id" = ${league.id}
      `
      results.testUpdate = { ...results.testUpdate as object, reverted: true }
    } else {
      results.testUpdate = 'no active league found'
    }
  } catch (e) {
    results.testUpdateError = String(e)
  }

  return NextResponse.json(results, { status: 200 })
}
