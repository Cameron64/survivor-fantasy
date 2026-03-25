import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import { getLeagueBySlug } from '@/lib/league-context'

interface RouteParams {
  params: Promise<{ leagueSlug: string }>
}

// PATCH /api/[leagueSlug]/league
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { leagueSlug } = await params
  const body = await req.json()
  const { isPublic, allowGuestEvents, allowUserEvents, showLastPlace } = body

  const league = await getLeagueBySlug(leagueSlug)
  if (!league) {
    return NextResponse.json({ error: 'League not found' }, { status: 404 })
  }

  const data: Record<string, boolean> = {}
  if (typeof isPublic === 'boolean') data.isPublic = isPublic
  if (typeof allowGuestEvents === 'boolean') data.allowGuestEvents = allowGuestEvents
  if (typeof allowUserEvents === 'boolean') data.allowUserEvents = allowUserEvents
  if (typeof showLastPlace === 'boolean') data.showLastPlace = showLastPlace

  if (isPublic === false) data.allowGuestEvents = false

  const updated = await db.league.update({
    where: { id: league.id },
    data,
  })

  return NextResponse.json({
    isPublic: updated.isPublic,
    allowGuestEvents: updated.allowGuestEvents,
    allowUserEvents: updated.allowUserEvents,
    showLastPlace: updated.showLastPlace,
  })
}
