import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, requireAdmin } from '@/lib/auth'

// GET /api/episodes - List episodes for active league
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

    const episodes = await db.episode.findMany({
      where: { leagueId: league.id },
      orderBy: { number: 'asc' },
    })

    return NextResponse.json(episodes)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching episodes:', error)
    return NextResponse.json({ error: 'Failed to fetch episodes' }, { status: 500 })
  }
}

// POST /api/episodes - Create an episode (admin only)
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
    const { number, title, airDate } = body

    if (!number || !airDate) {
      return NextResponse.json({ error: 'Number and airDate are required' }, { status: 400 })
    }

    const episode = await db.episode.create({
      data: {
        number,
        title: title || null,
        airDate: new Date(airDate),
        leagueId: league.id,
      },
    })

    return NextResponse.json(episode, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Error creating episode:', error)
    return NextResponse.json({ error: 'Failed to create episode' }, { status: 500 })
  }
}
