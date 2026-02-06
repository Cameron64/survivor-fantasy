import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, requireAdmin } from '@/lib/auth'

// GET /api/contestants - List all contestants
export async function GET(req: NextRequest) {
  try {
    await requireUser()

    const searchParams = req.nextUrl.searchParams
    const includeEvents = searchParams.get('includeEvents') === 'true'
    const includeMemberships = searchParams.get('includeMemberships') === 'true'
    const activeOnly = searchParams.get('activeOnly') === 'true'

    const contestants = await db.contestant.findMany({
      where: {
        ...(activeOnly && { isEliminated: false }),
      },
      include: {
        ...(includeEvents && {
          events: {
            where: { isApproved: true },
            orderBy: { week: 'desc' },
          },
        }),
        ...(includeMemberships && {
          tribeMemberships: {
            where: { toWeek: null },
            include: {
              tribe: {
                select: { id: true, name: true, color: true },
              },
            },
          },
        }),
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
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(contestants)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching contestants:', error)
    return NextResponse.json({ error: 'Failed to fetch contestants' }, { status: 500 })
  }
}

// POST /api/contestants - Create a new contestant (admin only)
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
    const body = await req.json()

    const { name, nickname, tribe, imageUrl, originalSeasons } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const contestant = await db.contestant.create({
      data: {
        name,
        nickname,
        tribe,
        imageUrl,
        originalSeasons,
      },
    })

    return NextResponse.json(contestant, { status: 201 })
  } catch (error) {
    console.error('Error creating contestant:', error)
    if (error instanceof Error && error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to create contestant' }, { status: 500 })
  }
}
