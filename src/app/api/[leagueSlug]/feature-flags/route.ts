import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { FeatureFlags } from '@/lib/feature-flags'
import { DEFAULT_FLAGS } from '@/lib/feature-flags'
import { ensureFeatureFlagColumns } from '@/lib/ensure-feature-flag-columns'
import { getLeagueBySlug } from '@/lib/league-context'

interface RouteParams {
  params: Promise<{ leagueSlug: string }>
}

// GET /api/[leagueSlug]/feature-flags
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await ensureFeatureFlagColumns()
  } catch (e) {
    console.error('[Feature Flags] ensureColumns failed:', e)
  }

  try {
    const { leagueSlug } = await params
    const league = await getLeagueBySlug(leagueSlug)
    if (!league) {
      return NextResponse.json(DEFAULT_FLAGS)
    }

    const rows = await db.$queryRawUnsafe<FeatureFlags[]>(
      'SELECT "enableTribeSwap", "enableSwapMode", "enableDissolutionMode", "enableExpansionMode", "enableTribeMerge" FROM "League" WHERE "id" = $1 LIMIT 1',
      league.id
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
    console.error('[Feature Flags] Query failed:', error)
    return NextResponse.json(
      { error: String(error), defaults: DEFAULT_FLAGS },
      { status: 500 }
    )
  }
}
