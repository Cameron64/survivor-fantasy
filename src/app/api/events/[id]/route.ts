import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireModerator } from '@/lib/auth'
import { notifyEventApproved } from '@/lib/slack'

interface RouteParams {
  params: Promise<{ id: string }>
}

// PATCH /api/events/[id] - Approve/reject an event (moderator only)
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireModerator()
    const { id } = await params
    const body = await req.json()

    const { isApproved } = body

    if (typeof isApproved !== 'boolean') {
      return NextResponse.json({ error: 'isApproved must be a boolean' }, { status: 400 })
    }

    const existingEvent = await db.event.findUnique({
      where: { id },
      include: { contestant: true },
    })

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const event = await db.event.update({
      where: { id },
      data: {
        isApproved,
        approvedById: isApproved ? user.id : null,
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
    })

    // Send Slack notification for approved events
    if (isApproved) {
      await notifyEventApproved({
        contestantName: existingEvent.contestant.name,
        eventType: existingEvent.type,
        week: existingEvent.week,
        approvedBy: user.name,
      })
    }

    return NextResponse.json(event)
  } catch (error) {
    console.error('Error updating event:', error)
    if (error instanceof Error && error.message === 'Forbidden: Moderator access required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 })
  }
}

// DELETE /api/events/[id] - Delete an event (moderator only)
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    await requireModerator()
    const { id } = await params

    const existingEvent = await db.event.findUnique({
      where: { id },
    })

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    await db.event.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting event:', error)
    if (error instanceof Error && error.message === 'Forbidden: Moderator access required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 })
  }
}
