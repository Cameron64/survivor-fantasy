import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ leagueSlug: string }>
}

// POST /api/[leagueSlug]/tribe-memberships/bulk
export async function POST(req: NextRequest, { params: _params }: RouteParams) {
  try {
    await requireAdmin()
    const body = await req.json()

    if (body.mergeToTribeId && body.week) {
      const { mergeToTribeId, week } = body

      const result = await db.$transaction(async (tx) => {
        const openMemberships = await tx.tribeMembership.findMany({
          where: { toWeek: null },
          select: { id: true, contestantId: true },
        })

        await tx.tribeMembership.updateMany({
          where: { toWeek: null },
          data: { toWeek: week - 1 },
        })

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

    if (body.assignments && Array.isArray(body.assignments)) {
      const { assignments, fromWeek = 1 } = body as {
        assignments: Array<{ contestantId: string; tribeId: string }>
        fromWeek?: number
      }

      const result = await db.$transaction(async (tx) => {
        const contestantIds = assignments.map((a) => a.contestantId)
        await tx.tribeMembership.updateMany({
          where: { contestantId: { in: contestantIds }, toWeek: null },
          data: { toWeek: fromWeek > 1 ? fromWeek - 1 : 1 },
        })

        const created = await Promise.all(
          assignments.map((a) =>
            tx.tribeMembership.create({
              data: { contestantId: a.contestantId, tribeId: a.tribeId, fromWeek },
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
