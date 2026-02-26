import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireModerator } from '@/lib/auth'
import { notifyGameEventApproved } from '@/lib/slack'
import { TribalCouncilData, QuitMedevacData, GameEventData } from '@/lib/event-derivation'

interface RouteParams {
  params: Promise<{ id: string }>
}

// PATCH /api/game-events/[id] - Approve/reject a game event (moderator only)
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireModerator()
    const { id } = await params
    const body = await req.json()

    const { isApproved } = body

    if (typeof isApproved !== 'boolean') {
      return NextResponse.json({ error: 'isApproved must be a boolean' }, { status: 400 })
    }

    const existingGameEvent = await db.gameEvent.findUnique({
      where: { id },
      include: {
        events: {
          include: { contestant: true },
        },
      },
    })

    if (!existingGameEvent) {
      return NextResponse.json({ error: 'Game event not found' }, { status: 404 })
    }

    // Update GameEvent + all derived events in a transaction
    const gameEvent = await db.$transaction(async (tx) => {
      // Update the game event
      const ge = await tx.gameEvent.update({
        where: { id },
        data: {
          isApproved,
          approvedById: isApproved ? user.id : null,
        },
      })

      // Update all derived events
      await tx.event.updateMany({
        where: { gameEventId: id },
        data: {
          isApproved,
          approvedById: isApproved ? user.id : null,
        },
      })

      const data = ge.data as unknown as GameEventData

      if (isApproved) {
        // On approval: auto-eliminate contestants
        if (ge.type === 'TRIBAL_COUNCIL') {
          const tribalData = data as TribalCouncilData
          await tx.contestant.update({
            where: { id: tribalData.eliminated },
            data: {
              isEliminated: true,
              eliminatedWeek: ge.week,
            },
          })
        }

        if (ge.type === 'QUIT_MEDEVAC') {
          const quitData = data as QuitMedevacData
          await tx.contestant.update({
            where: { id: quitData.contestant },
            data: {
              isEliminated: true,
              eliminatedWeek: ge.week,
            },
          })
        }
      } else {
        // On unapproval: reverse elimination if this event caused it
        if (ge.type === 'TRIBAL_COUNCIL') {
          const tribalData = data as TribalCouncilData
          await tx.contestant.update({
            where: { id: tribalData.eliminated },
            data: {
              isEliminated: false,
              eliminatedWeek: null,
            },
          })
        }

        if (ge.type === 'QUIT_MEDEVAC') {
          const quitData = data as QuitMedevacData
          await tx.contestant.update({
            where: { id: quitData.contestant },
            data: {
              isEliminated: false,
              eliminatedWeek: null,
            },
          })
        }
      }

      return tx.gameEvent.findUnique({
        where: { id: ge.id },
        include: {
          events: {
            include: { contestant: true },
          },
          submittedBy: {
            select: { id: true, name: true },
          },
          approvedBy: {
            select: { id: true, name: true },
          },
        },
      })
    })

    // Send Slack notification for approved game events
    if (isApproved && gameEvent) {
      const contestants = await db.contestant.findMany({
        where: {
          id: { in: existingGameEvent.events.map((e) => e.contestantId) },
        },
        select: { id: true, name: true },
      })
      const contestantNameMap = Object.fromEntries(contestants.map((c) => [c.id, c.name]))

      await notifyGameEventApproved({
        type: existingGameEvent.type,
        week: existingGameEvent.week,
        data: existingGameEvent.data as unknown as GameEventData,
        contestantNames: contestantNameMap,
        approvedBy: user.name,
        eventCount: existingGameEvent.events.length,
      })
    }

    return NextResponse.json(gameEvent)
  } catch (error) {
    console.error('Error updating game event:', error)
    if (error instanceof Error && error.message === 'Forbidden: Moderator access required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to update game event' }, { status: 500 })
  }
}

// DELETE /api/game-events/[id] - Delete a game event and its derived events (moderator only)
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    await requireModerator()
    const { id } = await params

    const existingGameEvent = await db.gameEvent.findUnique({
      where: { id },
    })

    if (!existingGameEvent) {
      return NextResponse.json({ error: 'Game event not found' }, { status: 404 })
    }

    await db.$transaction(async (tx) => {
      // Reverse elimination if this approved event caused one
      if (existingGameEvent.isApproved) {
        const data = existingGameEvent.data as unknown as GameEventData

        if (existingGameEvent.type === 'TRIBAL_COUNCIL') {
          const tribalData = data as TribalCouncilData
          await tx.contestant.update({
            where: { id: tribalData.eliminated },
            data: {
              isEliminated: false,
              eliminatedWeek: null,
            },
          })
        }

        if (existingGameEvent.type === 'QUIT_MEDEVAC') {
          const quitData = data as QuitMedevacData
          await tx.contestant.update({
            where: { id: quitData.contestant },
            data: {
              isEliminated: false,
              eliminatedWeek: null,
            },
          })
        }
      }

      // Cascade delete handles derived events (onDelete: Cascade in schema)
      await tx.gameEvent.delete({
        where: { id },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting game event:', error)
    if (error instanceof Error && error.message === 'Forbidden: Moderator access required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to delete game event' }, { status: 500 })
  }
}
