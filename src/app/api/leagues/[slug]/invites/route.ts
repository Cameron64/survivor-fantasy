import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { generateInviteCode } from '@/lib/utils'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ slug: string }>
}

const createInviteSchema = z.object({
  maxUses: z.number().int().min(1).optional(),
  expiresAt: z.string().datetime().optional(),
})

// GET /api/leagues/[slug]/invites — return the latest valid invite (or create one)
export async function GET(req: NextRequest, { params }: RouteParams) {
  let user: Awaited<ReturnType<typeof requireUser>>
  try {
    user = await requireUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { slug } = await params
  const league = await db.league.findFirst({ where: { slug } })
  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 })

  await assertCommissioner(user, league.id)
    .catch(() => assertAdmin(user))
    .catch(() => {
      throw new Error('Forbidden')
    })

  const invite = await db.leagueInvite.findFirst({
    where: {
      leagueId: league.id,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!invite) {
    return NextResponse.json({ invite: null })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  return NextResponse.json({ invite, url: `${appUrl}/join/${invite.code}` })
}

// POST /api/leagues/[slug]/invites — generate a new invite code
export async function POST(req: NextRequest, { params }: RouteParams) {
  let user: Awaited<ReturnType<typeof requireUser>>
  try {
    user = await requireUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { slug } = await params
  const league = await db.league.findFirst({ where: { slug } })
  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 })

  // Must be COMMISSIONER of this league, or global ADMIN
  const isCommissioner = await db.leagueMembership.findFirst({
    where: { leagueId: league.id, userId: user.id, role: 'COMMISSIONER' },
  })
  if (!isCommissioner && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const result = createInviteSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0]?.message }, { status: 400 })
  }

  const invite = await db.leagueInvite.create({
    data: {
      leagueId: league.id,
      code: generateInviteCode(),
      maxUses: result.data.maxUses ?? null,
      expiresAt: result.data.expiresAt ? new Date(result.data.expiresAt) : null,
    },
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  return NextResponse.json({ invite, url: `${appUrl}/join/${invite.code}` }, { status: 201 })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function assertCommissioner(user: { id: string }, leagueId: string) {
  const m = await db.leagueMembership.findFirst({
    where: { leagueId, userId: user.id, role: 'COMMISSIONER' },
  })
  if (!m) throw new Error('Not commissioner')
}

async function assertAdmin(user: { role: string }) {
  if (user.role !== 'ADMIN') throw new Error('Not admin')
}
