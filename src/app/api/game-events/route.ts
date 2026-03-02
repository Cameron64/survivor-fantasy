import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, requireUserOrPublic } from '@/lib/auth'
import { deriveEvents } from '@/lib/event-derivation'
import { getLeagueSettings } from '@/lib/league-settings'
import { getLeagueScoringConfig } from '@/lib/scoring'
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

    // Read league scoring config for dynamic point values
    const pointValues = await getLeagueScoringConfig()

    // Derive individual scoring events
    const derivedEvents = deriveEvents(type, data, pointValues)

    if (derivedEvents.length === 0) {
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
      const ge = await tx.gameEvent.create({
        data: {
          type,
          week,
          data: data as object,
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
    console.error('Error creating game event:', error)
    return NextResponse.json({ error: 'Failed to create game event' }, { status: 500 })
  }
}
