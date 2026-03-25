import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, requireAdmin } from '@/lib/auth'
import { getLeagueBySlug } from '@/lib/league-context'

interface RouteParams {
  params: Promise<{ leagueSlug: string }>
}

// GET /api/[leagueSlug]/episodes
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { leagueSlug } = await params
    const league = await getLeagueBySlug(leagueSlug)
    if (!league) {
      return NextResponse.json([])
    }

    const user = await getCurrentUser()
    if (!user && !league.isPublic) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

// POST /api/[leagueSlug]/episodes
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    const { leagueSlug } = await params

    const league = await getLeagueBySlug(leagueSlug)
    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
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
