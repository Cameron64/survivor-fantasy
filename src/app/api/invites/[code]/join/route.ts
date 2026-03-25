import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{ code: string }>
}

// POST /api/invites/[code]/join — join a league via invite code
export async function POST(req: NextRequest, { params }: RouteParams) {
  let user: Awaited<ReturnType<typeof requireUser>>
  try {
    user = await requireUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { code } = await params

  const invite = await db.leagueInvite.findUnique({
    where: { code },
    include: { league: { select: { id: true, name: true, slug: true } } },
  })

  if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 })

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Invite has expired' }, { status: 410 })
  }

  if (invite.maxUses !== null && invite.usedCount >= invite.maxUses) {
    return NextResponse.json({ error: 'Invite has reached its maximum uses' }, { status: 410 })
  }

  // Already a member — idempotent, return success
  const existing = await db.leagueMembership.findFirst({
    where: { leagueId: invite.leagueId, userId: user.id },
  })
  if (existing) {
    return NextResponse.json({ league: invite.league, alreadyMember: true })
  }

  // Create membership and increment usedCount atomically
  await db.$transaction([
    db.leagueMembership.create({
      data: { leagueId: invite.leagueId, userId: user.id, role: 'PLAYER' },
    }),
    db.leagueInvite.update({
      where: { id: invite.id },
      data: { usedCount: { increment: 1 } },
    }),
  ])

  return NextResponse.json({ league: invite.league }, { status: 201 })
}
