import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { FeatureFlags } from '@/lib/feature-flags'
import { DEFAULT_FLAGS } from '@/lib/feature-flags'
import { ensureFeatureFlagColumns } from '@/lib/ensure-feature-flag-columns'

/**
 * GET /api/feature-flags
 * Returns the current feature flags from the active league.
 */
export async function GET() {
  try {
    await ensureFeatureFlagColumns()
  } catch (e) {
    console.error('[Feature Flags] ensureColumns failed:', e)
  }

  try {
    // Use $queryRawUnsafe (same as PATCH read-back which works)
    const rows = await db.$queryRawUnsafe<FeatureFlags[]>(
      'SELECT "enableTribeSwap", "enableSwapMode", "enableDissolutionMode", "enableExpansionMode", "enableTribeMerge" FROM "League" WHERE "isActive" = true LIMIT 1'
    )

    if (!rows.length) {
      return NextResponse.json(DEFAULT_FLAGS)
    }

    const row = rows[0]
    const flags: FeatureFlags = {
      enableTribeSwap: row.enableTribeSwap ?? false,
      enableSwapMode: row.enableSwapMode ?? false,
      enableDissolutionMode: row.enableDissolutionMode ?? false,
      enableExpansionMode: row.enableExpansionMode ?? false,
      enableTribeMerge: row.enableTribeMerge ?? false,
    }

    return NextResponse.json(flags)
  } catch (error) {
    // Return the actual error so we can debug, not silent defaults
    console.error('[Feature Flags] Query failed:', error)
    return NextResponse.json(
      { error: String(error), defaults: DEFAULT_FLAGS },
      { status: 500 }
    )
  }
}
