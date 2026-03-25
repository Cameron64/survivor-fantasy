import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { getCurrentUser, requireUser } from '@/lib/auth'
import { deriveEvents, type TribalCouncilData } from '@/lib/event-derivation'
import { getEffectivePoints } from '@/lib/scoring'
import { parseGameSettings } from '@/lib/game-settings'
import { notifyGameEventSubmitted } from '@/lib/slack'
import { createGameEventSchema, formatZodError } from '@/lib/validation'
import { getLeagueBySlug } from '@/lib/league-context'
import { EventType } from '@prisma/client'

interface RouteParams {
  params: Promise<{ leagueSlug: string }>
}

// GET /api/[leagueSlug]/game-events
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
    const week = searchParams.get('week')
    const approvedOnly = searchParams.get('approved') === 'true'
    const pendingOnly = searchParams.get('pending') === 'true'

    const gameEvents = await db.gameEvent.findMany({
      where: {
        ...(week && { week: parseInt(week) }),
        ...(approvedOnly && { isApproved: true }),
        ...(pendingOnly && { isApproved: false }),
      },
      include: {
        events: {
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
          },
        },
        submittedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
      orderBy: [{ week: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json(gameEvents)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching game events:', error)
    return NextResponse.json({ error: 'Failed to fetch game events' }, { status: 500 })
  }
}

// POST /api/[leagueSlug]/game-events
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

    const validationResult = createGameEventSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: formatZodError(validationResult.error) },
        { status: 400 }
      )
    }

    const { type, week, data } = validationResult.data

    const overrides = league.scoringConfig as Partial<Record<EventType, number>> | null
    const pointValues = getEffectivePoints(overrides)
    const gameSettings = parseGameSettings(league.gameSettings)

    const derivedEvents = deriveEvents(type, data, pointValues, gameSettings)

    const structuralEventTypes: string[] = ['TRIBE_SWAP']
    const isZeroEventTribal = type === 'TRIBAL_COUNCIL' &&
      (data as TribalCouncilData).eliminationMethod &&
      ['rock_draw', 'default', 'consensus'].includes((data as TribalCouncilData).eliminationMethod!)

    if (derivedEvents.length === 0 && !structuralEventTypes.includes(type) && !isZeroEventTribal) {
      return NextResponse.json(
        { error: 'No scoring events could be derived from this game event' },
        { status: 400 }
      )
    }

    const contestantIds = Array.from(new Set(derivedEvents.map((e) => e.contestantId)))
    const contestants = await db.contestant.findMany({
      where: { id: { in: contestantIds } },
      select: { id: true, name: true },
    })
    const validIds = new Set(contestants.map((c) => c.id))
    const invalidIds = contestantIds.filter((id) => !validIds.has(id))

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: `Invalid contestant IDs: ${invalidIds.join(', ')}` },
        { status: 400 }
      )
    }

    const gameEvent = await db.$transaction(async (tx) => {
      const maxSeq = await tx.gameEvent.aggregate({
        where: { week },
        _max: { sequenceInEpisode: true },
      })
      const nextSeq = (maxSeq._max.sequenceInEpisode ?? -1) + 1

      const ge = await tx.gameEvent.create({
        data: {
          type,
          week,
          data: data as object,
          settingsSnapshot: gameSettings as object,
          sequenceInEpisode: nextSeq,
          isApproved: false,
          submittedById: user.id,
        },
      })

      for (const event of derivedEvents) {
        await tx.event.create({
          data: {
            type: event.type,
            contestantId: event.contestantId,
            week,
            description: event.description,
            points: event.points,
            voteRound: event.voteRound,
            isApproved: false,
            submittedById: user.id,
            gameEventId: ge.id,
          },
        })
      }

      return tx.gameEvent.findUnique({
        where: { id: ge.id },
        include: {
          events: { include: { contestant: true } },
          submittedBy: { select: { id: true, name: true } },
        },
      })
    })

    const contestantNameMap = Object.fromEntries(contestants.map((c) => [c.id, c.name]))
    await notifyGameEventSubmitted({
      type,
      week,
      data,
      contestantNames: contestantNameMap,
      submittedBy: user.name,
      eventCount: derivedEvents.length,
    })

    return NextResponse.json(gameEvent, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A conflicting event already exists. This tribal council may have been submitted already.' },
        { status: 409 }
      )
    }
    console.error('Error creating game event:', error)
    return NextResponse.json({ error: 'Failed to create game event' }, { status: 500 })
  }
}
