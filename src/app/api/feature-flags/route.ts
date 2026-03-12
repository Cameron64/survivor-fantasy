import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import type { FeatureFlags } from '@/lib/feature-flags'
import { DEFAULT_FLAGS } from '@/lib/feature-flags'

/**
 * GET /api/feature-flags
 * Returns the current feature flags from the active league
 */
export async function GET() {
  try {
    const league = await prisma.league.findFirst({
      where: { isActive: true },
      select: {
        enableTribeSwap: true,
        enableSwapMode: true,
        enableDissolutionMode: true,
        enableExpansionMode: true,
        enableTribeMerge: true,
      },
    })

    if (!league) {
      return NextResponse.json(DEFAULT_FLAGS)
    }

    const flags: FeatureFlags = {
      enableTribeSwap: league.enableTribeSwap ?? DEFAULT_FLAGS.enableTribeSwap,
      enableSwapMode: league.enableSwapMode ?? DEFAULT_FLAGS.enableSwapMode,
      enableDissolutionMode: league.enableDissolutionMode ?? DEFAULT_FLAGS.enableDissolutionMode,
      enableExpansionMode: league.enableExpansionMode ?? DEFAULT_FLAGS.enableExpansionMode,
      enableTribeMerge: league.enableTribeMerge ?? DEFAULT_FLAGS.enableTribeMerge,
    }

    return NextResponse.json(flags)
  } catch (error) {
    console.error('[Feature Flags] Error fetching:', error)
    return NextResponse.json(DEFAULT_FLAGS)
  }
}
