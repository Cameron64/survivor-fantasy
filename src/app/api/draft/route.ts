import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, requireAdmin } from '@/lib/auth'

// GET /api/draft - Get draft status
export async function GET(_req: NextRequest) {
  try {
    await requireUser()

    const draft = await db.draft.findFirst({
      orderBy: { createdAt: 'desc' },
    })

    if (!draft) {
      return NextResponse.json({
        status: 'not_started',
        message: 'Draft has not been initialized',
      })
    }

    // Get all users in draft order
    const draftOrder = draft.draftOrder as string[]
    const users = await db.user.findMany({
      where: {
        id: { in: draftOrder },
      },
      select: {
        id: true,
        name: true,
        team: {
          include: {
            contestants: {
              include: {
                contestant: {
                  select: { id: true, name: true, tribe: true },
                },
              },
              orderBy: { draftOrder: 'asc' },
            },
          },
        },
      },
    })

    // Map users to draft order
    const orderedUsers = draftOrder.map((userId) => {
      const user = users.find((u) => u.id === userId)
      return {
        userId,
        name: user?.name || 'Unknown',
        picks: user?.team?.contestants.map((tc) => tc.contestant) || [],
      }
    })

    // Calculate whose turn it is
    const currentUserIndex =
      draft.currentRound % 2 === 1
        ? (draft.currentPick - 1) % draftOrder.length
        : draftOrder.length - 1 - ((draft.currentPick - 1) % draftOrder.length)

    return NextResponse.json({
      status: draft.isComplete ? 'complete' : 'in_progress',
      currentPick: draft.currentPick,
      currentRound: draft.currentRound,
      currentUserId: draftOrder[currentUserIndex],
      draftOrder: orderedUsers,
      isComplete: draft.isComplete,
    })
  } catch (error) {
    console.error('Error fetching draft:', error)
    return NextResponse.json({ error: 'Failed to fetch draft' }, { status: 500 })
  }
}

// POST /api/draft - Initialize or make a pick
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const body = await req.json()

    const { action, contestantId, draftOrder: newDraftOrder } = body

    // Initialize draft (admin only)
    if (action === 'initialize') {
      await requireAdmin()

      if (!newDraftOrder || !Array.isArray(newDraftOrder)) {
        return NextResponse.json({ error: 'Draft order is required' }, { status: 400 })
      }

      // Delete any existing draft
      await db.draft.deleteMany()

      const draft = await db.draft.create({
        data: {
          draftOrder: newDraftOrder,
          currentPick: 1,
          currentRound: 1,
          isComplete: false,
        },
      })

      return NextResponse.json(draft, { status: 201 })
    }

    // Make a pick
    if (action === 'pick') {
      if (!contestantId) {
        return NextResponse.json({ error: 'Contestant ID is required' }, { status: 400 })
      }

      const draft = await db.draft.findFirst({
        orderBy: { createdAt: 'desc' },
      })

      if (!draft) {
        return NextResponse.json({ error: 'Draft has not been initialized' }, { status: 400 })
      }

      if (draft.isComplete) {
        return NextResponse.json({ error: 'Draft is complete' }, { status: 400 })
      }

      const draftOrder = draft.draftOrder as string[]

      // Calculate whose turn it is (snake draft)
      const currentUserIndex =
        draft.currentRound % 2 === 1
          ? (draft.currentPick - 1) % draftOrder.length
          : draftOrder.length - 1 - ((draft.currentPick - 1) % draftOrder.length)

      if (draftOrder[currentUserIndex] !== user.id) {
        return NextResponse.json({ error: 'Not your turn to pick' }, { status: 403 })
      }

      // Check if contestant is already drafted
      const existingPick = await db.teamContestant.findFirst({
        where: { contestantId },
      })

      if (existingPick) {
        return NextResponse.json({ error: 'Contestant already drafted' }, { status: 400 })
      }

      // Get or create team for user
      let team = await db.team.findUnique({
        where: { userId: user.id },
      })

      if (!team) {
        team = await db.team.create({
          data: { userId: user.id },
        })
      }

      // Check if user already has 2 picks
      const userPicks = await db.teamContestant.count({
        where: { teamId: team.id },
      })

      if (userPicks >= 2) {
        return NextResponse.json({ error: 'You have already made your maximum picks' }, { status: 400 })
      }

      // Make the pick
      await db.teamContestant.create({
        data: {
          teamId: team.id,
          contestantId,
          draftOrder: userPicks + 1,
        },
      })

      // Update draft state
      const newPick = draft.currentPick + 1
      const totalPicks = draftOrder.length * 2 // 2 picks per player
      const newRound = Math.ceil(newPick / draftOrder.length)

      await db.draft.update({
        where: { id: draft.id },
        data: {
          currentPick: newPick,
          currentRound: newRound,
          isComplete: newPick > totalPicks,
        },
      })

      return NextResponse.json({ success: true, pick: draft.currentPick })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error in draft:', error)
    if (error instanceof Error && error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to process draft action' }, { status: 500 })
  }
}
