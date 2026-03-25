import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, requireAdmin } from '@/lib/auth'
import { draftActionSchema, formatZodError } from '@/lib/validation'
import { getLeagueBySlug } from '@/lib/league-context'

interface RouteParams {
  params: Promise<{ leagueSlug: string }>
}

// GET /api/[leagueSlug]/draft
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireUser()
    const { leagueSlug } = await params

    const league = await getLeagueBySlug(leagueSlug)
    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
    }

    const draft = await db.draft.findUnique({ where: { leagueId: league.id } })

    if (!draft) {
      return NextResponse.json({
        status: 'not_started',
        message: 'Draft has not been initialized',
      })
    }

    const draftOrder = draft.draftOrder as string[]
    const users = await db.user.findMany({
      where: { id: { in: draftOrder } },
      select: {
        id: true,
        name: true,
        team: {
          include: {
            contestants: {
              include: {
                contestant: { select: { id: true, name: true, tribe: true } },
              },
              orderBy: { draftOrder: 'asc' },
            },
          },
        },
      },
    })

    const orderedUsers = draftOrder.map((userId) => {
      const user = users.find((u) => u.id === userId)
      return {
        userId,
        name: user?.name || 'Unknown',
        picks: user?.team?.contestants.map((tc) => tc.contestant) || [],
      }
    })

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

// POST /api/[leagueSlug]/draft
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireUser()
    const { leagueSlug } = await params
    const body = await req.json()

    const validationResult = draftActionSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: formatZodError(validationResult.error) },
        { status: 400 }
      )
    }

    const action = validationResult.data

    if (action.action === 'initialize') {
      await requireAdmin()
      const { draftOrder: newDraftOrder } = action

      const league = await getLeagueBySlug(leagueSlug)
      if (!league) {
        return NextResponse.json({ error: 'League not found' }, { status: 404 })
      }

      await db.draft.deleteMany({ where: { leagueId: league.id } })

      const draft = await db.draft.create({
        data: {
          draftOrder: newDraftOrder,
          currentPick: 1,
          currentRound: 1,
          isComplete: false,
          leagueId: league.id,
        },
      })

      return NextResponse.json(draft, { status: 201 })
    }

    if (action.action === 'pick') {
      const { contestantId } = action

      const league = await getLeagueBySlug(leagueSlug)
      if (!league) {
        return NextResponse.json({ error: 'League not found' }, { status: 404 })
      }

      const draft = await db.draft.findUnique({ where: { leagueId: league.id } })

      if (!draft) {
        return NextResponse.json({ error: 'Draft has not been initialized' }, { status: 400 })
      }

      if (draft.isComplete) {
        return NextResponse.json({ error: 'Draft is complete' }, { status: 400 })
      }

      const draftOrder = draft.draftOrder as string[]

      const currentUserIndex =
        draft.currentRound % 2 === 1
          ? (draft.currentPick - 1) % draftOrder.length
          : draftOrder.length - 1 - ((draft.currentPick - 1) % draftOrder.length)

      if (draftOrder[currentUserIndex] !== user.id) {
        return NextResponse.json({ error: 'Not your turn to pick' }, { status: 403 })
      }

      const existingPick = await db.teamContestant.findFirst({ where: { contestantId } })
      if (existingPick) {
        return NextResponse.json({ error: 'Contestant already drafted' }, { status: 400 })
      }

      let team = await db.team.findUnique({ where: { userId: user.id } })
      if (!team) {
        team = await db.team.create({ data: { userId: user.id, leagueId: league.id } })
      }

      const userPicks = await db.teamContestant.count({ where: { teamId: team.id } })
      if (userPicks >= 2) {
        return NextResponse.json({ error: 'You have already made your maximum picks' }, { status: 400 })
      }

      await db.teamContestant.create({
        data: { teamId: team.id, contestantId, draftOrder: userPicks + 1 },
      })

      const newPick = draft.currentPick + 1
      const totalPicks = draftOrder.length * 2
      const newRound = Math.ceil(newPick / draftOrder.length)

      await db.draft.update({
        where: { id: draft.id },
        data: { currentPick: newPick, currentRound: newRound, isComplete: newPick > totalPicks },
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
