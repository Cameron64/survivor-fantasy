import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, requireAdmin } from '@/lib/auth'

// GET /api/tribe-memberships - List memberships (filter by contestantId or tribeId)
export async function GET(req: NextRequest) {
  try {
    await requireUser()

    const searchParams = req.nextUrl.searchParams
    const contestantId = searchParams.get('contestantId')
    const tribeId = searchParams.get('tribeId')

    const memberships = await db.tribeMembership.findMany({
      where: {
        ...(contestantId && { contestantId }),
        ...(tribeId && { tribeId }),
      },
      include: {
        contestant: { select: { id: true, name: true } },
        tribe: { select: { id: true, name: true, color: true } },
      },
      orderBy: { fromWeek: 'asc' },
    })

    return NextResponse.json(memberships)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching tribe memberships:', error)
    return NextResponse.json({ error: 'Failed to fetch memberships' }, { status: 500 })
  }
}

// POST /api/tribe-memberships - Create membership (auto-closes existing open one)
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
    const body = await req.json()
    const { contestantId, tribeId, fromWeek } = body

    if (!contestantId || !tribeId) {
      return NextResponse.json({ error: 'contestantId and tribeId are required' }, { status: 400 })
    }

    // Close any existing open membership for this contestant
    await db.tribeMembership.updateMany({
      where: {
        contestantId,
        toWeek: null,
      },
      data: {
        toWeek: (fromWeek || 1) - 1 || 1,
      },
    })

    const membership = await db.tribeMembership.create({
      data: {
        contestantId,
        tribeId,
        fromWeek: fromWeek || 1,
      },
      include: {
        contestant: { select: { id: true, name: true } },
        tribe: { select: { id: true, name: true, color: true } },
      },
    })

    return NextResponse.json(membership, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Error creating tribe membership:', error)
    return NextResponse.json({ error: 'Failed to create membership' }, { status: 500 })
  }
}
