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
      enableTribeSwap: league.enableTribeSwap,
      enableSwapMode: league.enableSwapMode,
      enableDissolutionMode: league.enableDissolutionMode,
      enableExpansionMode: league.enableExpansionMode,
      enableTribeMerge: league.enableTribeMerge,
    }

    return NextResponse.json(flags)
  } catch (error) {
    console.error('Failed to fetch feature flags:', error)
    return NextResponse.json(DEFAULT_FLAGS)
  }
}
