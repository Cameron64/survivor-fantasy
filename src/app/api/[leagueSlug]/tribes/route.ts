import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, requireAdmin } from '@/lib/auth'
import { getLeagueBySlug } from '@/lib/league-context'

interface RouteParams {
  params: Promise<{ leagueSlug: string }>
}

// GET /api/[leagueSlug]/tribes
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireUser()
    const { leagueSlug } = await params

    const league = await getLeagueBySlug(leagueSlug)
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

// POST /api/[leagueSlug]/tribes
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    const { leagueSlug } = await params

    const league = await getLeagueBySlug(leagueSlug)
    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
    }

    const body = await req.json()
    const { name, color, isMerge, buffImage } = body

    if (!name || !color) {
      return NextResponse.json({ error: 'Name and color are required' }, { status: 400 })
    }

    const tribe = await db.tribe.create({
      data: {
        name,
        color,
        buffImage: buffImage || null,
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
