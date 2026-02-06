import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { GameEventType } from '@prisma/client'
import { deriveEvents, GameEventData } from '@/lib/event-derivation'
import { notifyGameEventSubmitted } from '@/lib/slack'

// GET /api/game-events - List game events
export async function GET(req: NextRequest) {
  try {
    await requireUser()
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
            contestant: true,
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
    const body = await req.json()

    const { type, week, data } = body as {
      type: GameEventType
      week: number
      data: GameEventData
    }

    if (!type || !week || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: type, week, data' },
        { status: 400 }
      )
    }

    // Validate game event type
    if (!Object.values(GameEventType).includes(type)) {
      return NextResponse.json({ error: 'Invalid game event type' }, { status: 400 })
    }

    // Derive individual scoring events
    const derivedEvents = deriveEvents(type, data)

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
