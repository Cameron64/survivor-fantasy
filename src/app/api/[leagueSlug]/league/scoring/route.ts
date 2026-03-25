import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, requireAdmin } from '@/lib/auth'
import { getEffectivePoints } from '@/lib/scoring'
import { EVENT_POINTS } from '@/lib/constants/scoring-constants'
import { EventType, Prisma } from '@prisma/client'
import { getLeagueBySlug } from '@/lib/league-context'

interface RouteParams {
  params: Promise<{ leagueSlug: string }>
}

// GET /api/[leagueSlug]/league/scoring
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { leagueSlug } = await params
    const league = await getLeagueBySlug(leagueSlug)
    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
    }

    const user = await getCurrentUser()
    if (!user && !league.isPublic) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const overrides = league.scoringConfig as Partial<Record<EventType, number>> | null
    const effective = getEffectivePoints(overrides)

    return NextResponse.json({
      defaults: EVENT_POINTS,
      overrides: overrides || {},
      effective,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching scoring config:', error)
    return NextResponse.json({ error: 'Failed to fetch scoring config' }, { status: 500 })
  }
}

// PATCH /api/[leagueSlug]/league/scoring
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    const { leagueSlug } = await params

    const body = await req.json()
    const { overrides } = body as { overrides: Partial<Record<EventType, number>> }

    if (!overrides || typeof overrides !== 'object') {
      return NextResponse.json({ error: 'Missing overrides object' }, { status: 400 })
    }

    const validTypes = Object.values(EventType)
    for (const key of Object.keys(overrides)) {
      if (!validTypes.includes(key as EventType)) {
        return NextResponse.json({ error: `Invalid event type: ${key}` }, { status: 400 })
      }
      const val = overrides[key as EventType]
      if (typeof val !== 'number' || !Number.isInteger(val)) {
        return NextResponse.json(
          { error: `Point value for ${key} must be an integer` },
          { status: 400 }
        )
      }
    }

    const cleanOverrides: Partial<Record<EventType, number>> = {}
    for (const [key, value] of Object.entries(overrides)) {
      if (value !== EVENT_POINTS[key as EventType]) {
        cleanOverrides[key as EventType] = value
      }
    }

    const league = await getLeagueBySlug(leagueSlug)
    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
    }

    const scoringConfig = Object.keys(cleanOverrides).length > 0 ? cleanOverrides : null

    await db.league.update({
      where: { id: league.id },
      data: {
        scoringConfig: scoringConfig
          ? (cleanOverrides as unknown as Prisma.InputJsonValue)
          : Prisma.DbNull,
      },
    })

    const effective = getEffectivePoints(scoringConfig)

    for (const eventType of validTypes) {
      await db.event.updateMany({
        where: { type: eventType as EventType },
        data: { points: effective[eventType as EventType] },
      })
    }

    return NextResponse.json({
      defaults: EVENT_POINTS,
      overrides: scoringConfig || {},
      effective,
      recalculated: true,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Error updating scoring config:', error)
    return NextResponse.json({ error: 'Failed to update scoring config' }, { status: 500 })
  }
}
