import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// POST /api/tribe-memberships/bulk - Bulk assign or merge
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
    const body = await req.json()

    // Merge operation: close all open memberships and create new ones on merge tribe
    if (body.mergeToTribeId && body.week) {
      const { mergeToTribeId, week } = body

      const result = await db.$transaction(async (tx) => {
        // Find all contestants with open memberships
        const openMemberships = await tx.tribeMembership.findMany({
          where: { toWeek: null },
          select: { id: true, contestantId: true },
        })

        // Close all open memberships
        await tx.tribeMembership.updateMany({
          where: { toWeek: null },
          data: { toWeek: week - 1 },
        })

        // Create new memberships on the merge tribe
        const created = await Promise.all(
          openMemberships.map((m) =>
            tx.tribeMembership.create({
              data: {
                contestantId: m.contestantId,
                tribeId: mergeToTribeId,
                fromWeek: week,
              },
            })
          )
        )

        return created
      })

      return NextResponse.json({ created: result.length }, { status: 201 })
    }

    // Regular bulk assign
    if (body.assignments && Array.isArray(body.assignments)) {
      const { assignments, fromWeek = 1 } = body as {
        assignments: Array<{ contestantId: string; tribeId: string }>
        fromWeek?: number
      }

      const result = await db.$transaction(async (tx) => {
        // Close existing open memberships for these contestants
        const contestantIds = assignments.map((a) => a.contestantId)
        await tx.tribeMembership.updateMany({
          where: {
            contestantId: { in: contestantIds },
            toWeek: null,
          },
          data: { toWeek: fromWeek > 1 ? fromWeek - 1 : 1 },
        })

        // Create new memberships
        const created = await Promise.all(
          assignments.map((a) =>
            tx.tribeMembership.create({
              data: {
                contestantId: a.contestantId,
                tribeId: a.tribeId,
                fromWeek,
              },
            })
          )
        )

        return created
      })

      return NextResponse.json({ created: result.length }, { status: 201 })
    }

    return NextResponse.json(
      { error: 'Must provide assignments array or mergeToTribeId + week' },
      { status: 400 }
    )
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Error in bulk tribe membership operation:', error)
    return NextResponse.json({ error: 'Failed to process bulk operation' }, { status: 500 })
  }
}
