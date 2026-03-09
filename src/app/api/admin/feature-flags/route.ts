import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

/**
 * PATCH /api/admin/feature-flags
 * Update feature flags in the active league (admin only)
 */
export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin()

    const body = await req.json()
    console.log('[Feature Flags PATCH] Request body:', body)

    const {
      enableTribeSwap,
      enableSwapMode,
      enableDissolutionMode,
      enableExpansionMode,
      enableTribeMerge,
    } = body

    const league = await prisma.league.findFirst({
      where: { isActive: true },
    })

    if (!league) {
      console.log('[Feature Flags PATCH] No active league found')
      return NextResponse.json(
        { error: 'No active league found' },
        { status: 404 }
      )
    }

    console.log('[Feature Flags PATCH] Found league:', league.id)

    const updateData = {
      ...(typeof enableTribeSwap === 'boolean' && { enableTribeSwap }),
      ...(typeof enableSwapMode === 'boolean' && { enableSwapMode }),
      ...(typeof enableDissolutionMode === 'boolean' && { enableDissolutionMode }),
      ...(typeof enableExpansionMode === 'boolean' && { enableExpansionMode }),
      ...(typeof enableTribeMerge === 'boolean' && { enableTribeMerge }),
    }

    console.log('[Feature Flags PATCH] Update data:', updateData)

    const updated = await prisma.league.update({
      where: { id: league.id },
      data: updateData,
      select: {
        enableTribeSwap: true,
        enableSwapMode: true,
        enableDissolutionMode: true,
        enableExpansionMode: true,
        enableTribeMerge: true,
      },
    })

    console.log('[Feature Flags PATCH] Updated values:', updated)
    return NextResponse.json(updated)
  } catch (error) {
    if (error === 'Unauthorized' || error === 'Forbidden') {
      return NextResponse.json({ error: String(error) }, { status: 403 })
    }

    console.error('Failed to update feature flags:', error)
    return NextResponse.json(
      { error: 'Failed to update feature flags' },
      { status: 500 }
    )
  }
}
