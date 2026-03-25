import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{ code: string }>
}

// GET /api/invites/[code] — resolve an invite code (public, no auth required)
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { code } = await params

  const invite = await db.leagueInvite.findUnique({
    where: { code },
    include: {
      league: {
        select: { id: true, name: true, slug: true, season: true },
      },
    },
  })

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found', valid: false }, { status: 404 })
  }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Invite has expired', valid: false }, { status: 410 })
  }

  if (invite.maxUses !== null && invite.usedCount >= invite.maxUses) {
    return NextResponse.json({ error: 'Invite has reached its maximum uses', valid: false }, { status: 410 })
  }

  return NextResponse.json({
    valid: true,
    league: invite.league,
    invite: {
      code: invite.code,
      expiresAt: invite.expiresAt,
      maxUses: invite.maxUses,
      usedCount: invite.usedCount,
    },
  })
}
