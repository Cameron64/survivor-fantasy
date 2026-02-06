import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { getEventPoints } from '@/lib/scoring'
import { EventType } from '@prisma/client'
import { notifyEventSubmitted } from '@/lib/slack'

// GET /api/events - List events
export async function GET(req: NextRequest) {
  try {
    await requireUser()
    const searchParams = req.nextUrl.searchParams

    const week = searchParams.get('week')
    const contestantId = searchParams.get('contestantId')
    const approvedOnly = searchParams.get('approved') === 'true'
    const pendingOnly = searchParams.get('pending') === 'true'

    const events = await db.event.findMany({
      where: {
        ...(week && { week: parseInt(week) }),
        ...(contestantId && { contestantId }),
        ...(approvedOnly && { isApproved: true }),
        ...(pendingOnly && { isApproved: false }),
      },
      include: {
        contestant: true,
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
    const body = await req.json()

    const { type, contestantId, week, description } = body

    if (!type || !contestantId || !week) {
      return NextResponse.json(
        { error: 'Missing required fields: type, contestantId, week' },
        { status: 400 }
      )
    }

    // Validate event type
    if (!Object.values(EventType).includes(type)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 })
    }

    // Validate contestant exists
    const contestant = await db.contestant.findUnique({
      where: { id: contestantId },
    })

    if (!contestant) {
      return NextResponse.json({ error: 'Contestant not found' }, { status: 404 })
    }

    // Calculate points based on event type
    const points = getEventPoints(type as EventType)

    const event = await db.event.create({
      data: {
        type: type as EventType,
        contestantId,
        week: parseInt(week),
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
      eventType: type as EventType,
      week: parseInt(week),
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
