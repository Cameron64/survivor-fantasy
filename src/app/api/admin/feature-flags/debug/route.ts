import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ensureFeatureFlagColumns } from '@/lib/ensure-feature-flag-columns'

/**
 * GET /api/admin/feature-flags/debug
 * Diagnostic endpoint — read-only, does not modify data.
 */
export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const results: Record<string, unknown> = {}

  // Step 1: Check columns via information_schema
  try {
    const columns = await db.$queryRawUnsafe<{ column_name: string }[]>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'League' AND column_name IN ('enableTribeSwap', 'enableSwapMode', 'enableDissolutionMode', 'enableExpansionMode', 'enableTribeMerge')`
    )
    results.existingColumns = columns.map((c) => c.column_name)
  } catch (e) {
    results.columnCheckError = String(e)
  }

  // Step 2: Ensure columns
  try {
    await ensureFeatureFlagColumns()
    results.ensureColumnsResult = 'success'
  } catch (e) {
    results.ensureColumnsError = String(e)
  }

  // Step 3: Read current values with $queryRawUnsafe (same as PATCH read-back)
  try {
    const rows = await db.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT "id", "isActive", "enableTribeSwap", "enableSwapMode", "enableDissolutionMode", "enableExpansionMode", "enableTribeMerge" FROM "League" LIMIT 5`
    )
    results.leagues_rawUnsafe = rows
  } catch (e) {
    results.readUnsafeError = String(e)
  }

  // Step 4: Read with $queryRaw tagged template (same as GET endpoint was using)
  try {
    const rows = await db.$queryRaw<Record<string, unknown>[]>`
      SELECT "id", "isActive", "enableTribeSwap", "enableSwapMode",
             "enableDissolutionMode", "enableExpansionMode", "enableTribeMerge"
      FROM "League"
      LIMIT 5
    `
    results.leagues_rawTagged = rows
  } catch (e) {
    results.readTaggedError = String(e)
  }

  return NextResponse.json(results, { status: 200 })
}
