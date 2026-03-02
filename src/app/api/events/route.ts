import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, requireUserOrPublic } from '@/lib/auth'
import { getLeagueScoringConfig } from '@/lib/scoring'
import { getLeagueSettings } from '@/lib/league-settings'
import { EventType } from '@prisma/client'
import { notifyEventSubmitted } from '@/lib/slack'
import { createEventSchema, eventQuerySchema, formatZodError } from '@/lib/validation'

// GET /api/events - List events
export async function GET(req: NextRequest) {
  try {
    await requireUserOrPublic()
    const searchParams = req.nextUrl.searchParams

    // Validate query parameters (convert null to undefined for Zod)
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
        submittedBy: {
          select: { id: true, name: true },
        },
        approvedBy: {
          select: { id: true, name: true },
        },
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

// POST /api/events - Submit a new event
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
    const validationResult = createEventSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: formatZodError(validationResult.error) },
        { status: 400 }
      )
    }

    const { type, contestantId, week, description } = validationResult.data

    // Validate contestant exists
    const contestant = await db.contestant.findUnique({
      where: { id: contestantId },
    })

    if (!contestant) {
      return NextResponse.json({ error: 'Contestant not found' }, { status: 404 })
    }

    // Calculate points based on event type using league config
    const pointValues = await getLeagueScoringConfig()
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
        submittedBy: {
          select: { id: true, name: true },
        },
      },
    })

    // Send Slack notification
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
