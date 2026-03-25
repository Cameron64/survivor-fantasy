import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, requireAdmin } from '@/lib/auth'
import { draftActionSchema, formatZodError } from '@/lib/validation'
import { fetchDraftState, getCurrentPickerIndex } from './_lib'
import { broadcastDraftUpdate } from './stream/route'

// GET /api/draft?leagueId=<id> — Get full draft state
export async function GET(req: NextRequest) {
  try {
    await requireUser()

    const leagueId = req.nextUrl.searchParams.get('leagueId') ?? undefined
    const state = await fetchDraftState(leagueId)

    if (!state) {
      return NextResponse.json({
        status: 'not_started',
        message: 'Draft has not been initialized',
      })
    }

    return NextResponse.json(state)
  } catch (error) {
    console.error('Error fetching draft:', error)
    return NextResponse.json({ error: 'Failed to fetch draft' }, { status: 500 })
  }
}

// POST /api/draft — Initialize, start, or make a pick
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const body = await req.json()

    const validationResult = draftActionSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: formatZodError(validationResult.error) },
        { status: 400 }
      )
    }

    const action = validationResult.data

    // ── Initialize draft (admin only) ──────────────────────────────────────
    if (action.action === 'initialize') {
      await requireAdmin()

      const { draftOrder: newDraftOrder, leagueId: requestedLeagueId, picksPerUser, pickTimeoutSecs } = action

      // Resolve league — explicit leagueId wins, falls back to the singleton league
      let resolvedLeagueId = requestedLeagueId
      if (!resolvedLeagueId) {
        const league = await db.league.findFirst({ select: { id: true } })
        if (!league) {
          return NextResponse.json({ error: 'No league found' }, { status: 400 })
        }
        resolvedLeagueId = league.id
      }

      // Replace any existing draft for this league
      await db.draft.deleteMany({ where: { leagueId: resolvedLeagueId } })

      const draft = await db.draft.create({
        data: {
          leagueId: resolvedLeagueId,
          draftOrder: newDraftOrder,
          currentPick: 1,
          currentRound: 1,
          isComplete: false,
          picksPerUser: picksPerUser ?? 2,
          pickTimeoutSecs: pickTimeoutSecs ?? null,
        },
      })

      const newState = await fetchDraftState(resolvedLeagueId)
      if (newState) broadcastDraftUpdate(newState)

      return NextResponse.json(draft, { status: 201 })
    }

    // ── Start draft (admin only, WAITING → ACTIVE) ─────────────────────────
    if (action.action === 'start') {
      await requireAdmin()

      const { leagueId: requestedLeagueId } = action
      let resolvedLeagueId = requestedLeagueId
      if (!resolvedLeagueId) {
        const league = await db.league.findFirst({ select: { id: true } })
        if (!league) {
          return NextResponse.json({ error: 'No league found' }, { status: 400 })
        }
        resolvedLeagueId = league.id
      }

      const draft = await db.draft.findFirst({
        where: { leagueId: resolvedLeagueId },
      })

      if (!draft) {
        return NextResponse.json({ error: 'Draft has not been initialized' }, { status: 400 })
      }

      if (draft.status !== 'WAITING') {
        return NextResponse.json(
          { error: `Draft is already ${draft.status.toLowerCase()}` },
          { status: 400 }
        )
      }

      await db.draft.update({
        where: { id: draft.id },
        data: { status: 'ACTIVE', startedAt: new Date() },
      })

      const newState = await fetchDraftState(resolvedLeagueId)
      if (newState) broadcastDraftUpdate(newState)

      return NextResponse.json({ success: true })
    }

    // ── Make a pick ────────────────────────────────────────────────────────
    if (action.action === 'pick') {
      const { contestantId, leagueId: requestedLeagueId } = action

      let resolvedLeagueId = requestedLeagueId
      if (!resolvedLeagueId) {
        const league = await db.league.findFirst({ select: { id: true } })
        if (!league) {
          return NextResponse.json({ error: 'No league found' }, { status: 400 })
        }
        resolvedLeagueId = league.id
      }

      const draft = await db.draft.findFirst({
        where: { leagueId: resolvedLeagueId },
      })

      if (!draft) {
        return NextResponse.json({ error: 'Draft has not been initialized' }, { status: 400 })
      }

      if (draft.status === 'WAITING') {
        return NextResponse.json({ error: 'Draft has not started yet' }, { status: 400 })
      }

      if (draft.isComplete) {
        return NextResponse.json({ error: 'Draft is complete' }, { status: 400 })
      }

      const draftOrderIds = draft.draftOrder as string[]
      const currentUserIndex = getCurrentPickerIndex(
        draft.currentPick,
        draft.currentRound,
        draftOrderIds.length
      )

      if (draftOrderIds[currentUserIndex] !== user.id) {
        return NextResponse.json({ error: 'Not your turn to pick' }, { status: 403 })
      }

      // Wrap check + create in a transaction to prevent TOCTOU race
      await db.$transaction(async (tx) => {
        const existing = await tx.teamContestant.findFirst({ where: { contestantId } })
        if (existing) throw new Error('Contestant already drafted')

        let team = await tx.team.findUnique({ where: { userId: user.id } })
        if (!team) {
          team = await tx.team.create({ data: { userId: user.id } })
        }

        const userPicks = await tx.teamContestant.count({ where: { teamId: team.id } })
        if (userPicks >= draft.picksPerUser) {
          throw new Error('Maximum picks reached')
        }

        await tx.teamContestant.create({
          data: {
            teamId: team.id,
            contestantId,
            draftOrder: userPicks + 1,
            globalPickNumber: draft.currentPick,
          },
        })
      })

      // Advance draft state
      const newPick = draft.currentPick + 1
      const totalPicks = draftOrderIds.length * draft.picksPerUser
      const newRound = Math.ceil(newPick / draftOrderIds.length)
      const isNowComplete = newPick > totalPicks

      await db.draft.update({
        where: { id: draft.id },
        data: {
          currentPick: newPick,
          currentRound: newRound,
          isComplete: isNowComplete,
          status: isNowComplete ? 'COMPLETE' : 'ACTIVE',
          completedAt: isNowComplete ? new Date() : undefined,
        },
      })

      const newState = await fetchDraftState(resolvedLeagueId)
      if (newState) broadcastDraftUpdate(newState)

      return NextResponse.json({ success: true, pick: draft.currentPick })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Forbidden: Admin access required') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (error.message === 'Contestant already drafted') {
        return NextResponse.json({ error: 'Contestant already drafted' }, { status: 400 })
      }
      if (error.message === 'Maximum picks reached') {
        return NextResponse.json({ error: 'You have already made your maximum picks' }, { status: 400 })
      }
    }
    console.error('Error in draft:', error)
    return NextResponse.json({ error: 'Failed to process draft action' }, { status: 500 })
  }
}
