import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { getLeagueBySlug } from '@/lib/league-context'

interface RouteParams {
  params: Promise<{ leagueSlug: string }>
}

// POST /api/[leagueSlug]/episodes/bulk
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    const { leagueSlug } = await params

    const league = await getLeagueBySlug(leagueSlug)
    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
    }

    const body = await req.json()
    const { startDate, count } = body

    if (!startDate || !count) {
      return NextResponse.json({ error: 'startDate and count are required' }, { status: 400 })
    }

    const start = new Date(startDate)
    const episodes = []

    for (let i = 0; i < count; i++) {
      const airDate = new Date(start)
      airDate.setDate(airDate.getDate() + i * 7)

      episodes.push({
        number: i + 1,
        airDate,
        leagueId: league.id,
      })
    }

    await db.episode.deleteMany({ where: { leagueId: league.id } })

    const created = await db.episode.createMany({
      data: episodes,
    })

    return NextResponse.json({ created: created.count }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Error bulk creating episodes:', error)
    return NextResponse.json({ error: 'Failed to create episodes' }, { status: 500 })
  }
}
