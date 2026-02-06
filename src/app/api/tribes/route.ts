import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, requireAdmin } from '@/lib/auth'

// GET /api/tribes - List tribes for active league
export async function GET() {
  try {
    await requireUser()

    const league = await db.league.findFirst({
      where: { isActive: true },
      select: { id: true },
    })

    if (!league) {
      return NextResponse.json([])
    }

    const tribes = await db.tribe.findMany({
      where: { leagueId: league.id },
      include: {
        _count: {
          select: {
            members: { where: { toWeek: null } },
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(tribes)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching tribes:', error)
    return NextResponse.json({ error: 'Failed to fetch tribes' }, { status: 500 })
  }
}

// POST /api/tribes - Create a tribe (admin only)
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()

    const league = await db.league.findFirst({
      where: { isActive: true },
      select: { id: true },
    })

    if (!league) {
      return NextResponse.json({ error: 'No active league' }, { status: 400 })
    }

    const body = await req.json()
    const { name, color, isMerge } = body

    if (!name || !color) {
      return NextResponse.json({ error: 'Name and color are required' }, { status: 400 })
    }

    const tribe = await db.tribe.create({
      data: {
        name,
        color,
        isMerge: isMerge || false,
        leagueId: league.id,
      },
    })

    return NextResponse.json(tribe, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Error creating tribe:', error)
    return NextResponse.json({ error: 'Failed to create tribe' }, { status: 500 })
  }
}
