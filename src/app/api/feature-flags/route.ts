import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { FeatureFlags } from '@/lib/feature-flags'
import { DEFAULT_FLAGS } from '@/lib/feature-flags'

/**
 * GET /api/feature-flags
 * Returns the current feature flags from the active league.
 *
 * Uses raw SQL to avoid Prisma Client cache issues with new columns.
 */
export async function GET() {
  try {
    const rows = await db.$queryRaw<FeatureFlags[]>`
      SELECT "enableTribeSwap", "enableSwapMode", "enableDissolutionMode",
             "enableExpansionMode", "enableTribeMerge"
      FROM "League"
      WHERE "isActive" = true
      LIMIT 1
    `

    if (!rows.length) {
      return NextResponse.json(DEFAULT_FLAGS)
    }

    // Ensure all flags have boolean values (null-safe)
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
    console.error('[Feature Flags] Error:', error)
    return NextResponse.json(DEFAULT_FLAGS)
  }
}
