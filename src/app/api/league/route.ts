import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { isPublic, allowGuestEvents } = body

  const league = await db.league.findFirst()
  if (!league) {
    return NextResponse.json({ error: 'No league found' }, { status: 404 })
  }

  const data: Record<string, boolean> = {}
  if (typeof isPublic === 'boolean') data.isPublic = isPublic
  if (typeof allowGuestEvents === 'boolean') data.allowGuestEvents = allowGuestEvents

  // If turning off public mode, also disable guest events
  if (isPublic === false) data.allowGuestEvents = false

  const updated = await db.league.update({
    where: { id: league.id },
    data,
  })

  return NextResponse.json({
    isPublic: updated.isPublic,
    allowGuestEvents: updated.allowGuestEvents,
  })
}
