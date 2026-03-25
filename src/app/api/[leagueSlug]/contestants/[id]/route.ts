import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, requireAdmin } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ leagueSlug: string; id: string }>
}

// GET /api/[leagueSlug]/contestants/[id]
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    await requireUser()
    const { id } = await params

    const contestant = await db.contestant.findUnique({
      where: { id },
      include: {
        events: {
          where: { isApproved: true },
          orderBy: { week: 'desc' },
        },
        teams: {
          include: {
            team: {
              include: {
                user: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
    })

    if (!contestant) {
      return NextResponse.json({ error: 'Contestant not found' }, { status: 404 })
    }

    return NextResponse.json(contestant)
  } catch (error) {
    console.error('Error fetching contestant:', error)
    return NextResponse.json({ error: 'Failed to fetch contestant' }, { status: 500 })
  }
}

// PATCH /api/[leagueSlug]/contestants/[id]
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await req.json()

    const { name, nickname, tribe, imageUrl, originalImageUrl, originalSeasons, isEliminated, eliminatedWeek } = body

    const existingContestant = await db.contestant.findUnique({ where: { id } })
    if (!existingContestant) {
      return NextResponse.json({ error: 'Contestant not found' }, { status: 404 })
    }

    const contestant = await db.contestant.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(nickname !== undefined && { nickname }),
        ...(tribe !== undefined && { tribe }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(originalImageUrl !== undefined && { originalImageUrl }),
        ...(originalSeasons !== undefined && { originalSeasons }),
        ...(isEliminated !== undefined && { isEliminated }),
        ...(eliminatedWeek !== undefined && { eliminatedWeek }),
      },
    })

    return NextResponse.json(contestant)
  } catch (error) {
    console.error('Error updating contestant:', error)
    if (error instanceof Error && error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to update contestant' }, { status: 500 })
  }
}

// DELETE /api/[leagueSlug]/contestants/[id]
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    const { id } = await params

    const existingContestant = await db.contestant.findUnique({ where: { id } })
    if (!existingContestant) {
      return NextResponse.json({ error: 'Contestant not found' }, { status: 404 })
    }

    await db.event.deleteMany({ where: { contestantId: id } })
    await db.teamContestant.deleteMany({ where: { contestantId: id } })
    await db.contestant.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting contestant:', error)
    if (error instanceof Error && error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to delete contestant' }, { status: 500 })
  }
}
