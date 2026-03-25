import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, requireUser } from '@/lib/auth'
import { getEffectivePoints } from '@/lib/scoring'
import { EventType } from '@prisma/client'
import { notifyEventSubmitted } from '@/lib/slack'
import { createEventSchema, eventQuerySchema, formatZodError } from '@/lib/validation'
import { getLeagueBySlug } from '@/lib/league-context'

interface RouteParams {
  params: Promise<{ leagueSlug: string }>
}

// GET /api/[leagueSlug]/events
export async function GET(req: NextRequest, { params }: RouteParams) {
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

    const searchParams = req.nextUrl.searchParams

    const queryResult = eventQuerySchema.safeParse({
      week: searchParams.get('week') || undefined,
      contestantId: searchParams.get('contestantId') || undefined,
      approved: searchParams.get('approved') || undefined,
      pending: searchParams.get('pending') || undefined,
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { error: formatZodError(queryResult.error) },
        { status: 400 }
      )
    }

    const { week, contestantId, approved, pending } = queryResult.data

    const events = await db.event.findMany({
      where: {
        ...(week && { week }),
        ...(contestantId && { contestantId }),
        ...(approved === 'true' && { isApproved: true }),
        ...(pending === 'true' && { isApproved: false }),
      },
      include: {
        contestant: {
          include: {
            tribeMemberships: {
              where: { toWeek: null },
              include: { tribe: { select: { id: true, name: true, color: true, buffImage: true } } },
              take: 1,
            },
          },
        },
        submittedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
      orderBy: [{ week: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json(events)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching events:', error)
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }
}

// POST /api/[leagueSlug]/events
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireUser()
    const { leagueSlug } = await params

    const league = await getLeagueBySlug(leagueSlug)
    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
    }

    if (!league.allowUserEvents && user.role !== 'ADMIN' && user.role !== 'MODERATOR') {
      return NextResponse.json({ error: 'Event submissions are currently disabled' }, { status: 403 })
    }

    const body = await req.json()

    const validationResult = createEventSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: formatZodError(validationResult.error) },
        { status: 400 }
      )
    }

    const { type, contestantId, week, description } = validationResult.data

    const contestant = await db.contestant.findUnique({ where: { id: contestantId } })
    if (!contestant) {
      return NextResponse.json({ error: 'Contestant not found' }, { status: 404 })
    }

    const overrides = league.scoringConfig as Partial<Record<EventType, number>> | null
    const pointValues = getEffectivePoints(overrides)
    const points = pointValues[type as EventType]

    const event = await db.event.create({
      data: {
        type,
        contestantId,
        week,
        description,
        points,
        isApproved: false,
        submittedById: user.id,
      },
      include: {
        contestant: true,
        submittedBy: { select: { id: true, name: true } },
      },
    })

    await notifyEventSubmitted({
      contestantName: contestant.name,
      eventType: type,
      week,
      submittedBy: user.name,
    })

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error creating event:', error)
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
  }
}
