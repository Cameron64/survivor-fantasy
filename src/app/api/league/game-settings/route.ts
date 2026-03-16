import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { gameSettingsSchema, parseGameSettings } from '@/lib/game-settings'

// GET /api/league/game-settings - Get current game settings
export async function GET() {
  try {
    await requireAdmin()

    const league = await db.league.findFirst({
      where: { isActive: true },
      select: { gameSettings: true },
    })

    return NextResponse.json(parseGameSettings(league?.gameSettings))
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to fetch game settings' }, { status: 500 })
  }
}

// PUT /api/league/game-settings - Update game settings
export async function PUT(req: NextRequest) {
  try {
    await requireAdmin()

    const body = await req.json()
    const result = gameSettingsSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues.map(i => i.message).join(', ') },
        { status: 400 }
      )
    }

    const league = await db.league.findFirst({
      where: { isActive: true },
    })

    if (!league) {
      return NextResponse.json({ error: 'No active league found' }, { status: 404 })
    }

    await db.league.update({
      where: { id: league.id },
      data: { gameSettings: result.data as object },
    })

    return NextResponse.json(result.data)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to update game settings' }, { status: 500 })
  }
}
