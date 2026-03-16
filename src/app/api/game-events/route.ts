import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { requireUser, requireUserOrPublic } from '@/lib/auth'
import { deriveEvents, type TribalCouncilData } from '@/lib/event-derivation'
import { getLeagueSettings } from '@/lib/league-settings'
import { getLeagueScoringConfig } from '@/lib/scoring'
import { parseGameSettings } from '@/lib/game-settings'
import { notifyGameEventSubmitted } from '@/lib/slack'
import { createGameEventSchema, formatZodError } from '@/lib/validation'

// GET /api/game-events - List game events
export async function GET(req: NextRequest) {
  try {
    await requireUserOrPublic()
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
        submittedBy: {
          select: { id: true, name: true },
        },
        approvedBy: {
          select: { id: true, name: true },
        },
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

// POST /api/game-events - Submit a new game event with derived scoring events
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()

    // Check if regular users are allowed to submit events
    const { allowUserEvents } = await getLeagueSettings()
    if (!allowUserEvents && user.role !== 'ADMIN' && user.role !== 'MODERATOR') {
      return NextResponse.json({ error: 'Event submissions are currently disabled' }, { status: 403 })
    }

    const body = await req.json()

    // Validate request body with Zod
    const validationResult = createGameEventSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: formatZodError(validationResult.error) },
        { status: 400 }
      )
    }

    const { type, week, data } = validationResult.data

    // Read league scoring config and game settings
    const league = await db.league.findFirst({
      where: { isActive: true },
      select: { scoringConfig: true, gameSettings: true },
    })
    const pointValues = await getLeagueScoringConfig()
    const gameSettings = parseGameSettings(league?.gameSettings)

    // Derive individual scoring events
    const derivedEvents = deriveEvents(type, data, pointValues, gameSettings)

    // Structural events and certain tribal council eliminations derive no scoring events — that's valid
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

    // Validate all contestant IDs exist
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

    // Create GameEvent + all derived Events in a transaction
    const gameEvent = await db.$transaction(async (tx) => {
      // Auto-increment sequenceInEpisode within the same week
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

      // Create all derived events
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

      // Return with includes
      return tx.gameEvent.findUnique({
        where: { id: ge.id },
        include: {
          events: {
            include: { contestant: true },
          },
          submittedBy: {
            select: { id: true, name: true },
          },
        },
      })
    })

    // Send Slack notification
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
