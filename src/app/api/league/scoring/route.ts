import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUserOrPublic, requireAdmin } from '@/lib/auth'
import { getEffectivePoints } from '@/lib/scoring'
import { EVENT_POINTS } from '@/lib/constants/scoring-constants'
import { EventType, Prisma } from '@prisma/client'

// GET /api/league/scoring - Returns effective point values (merged defaults + overrides)
export async function GET() {
  try {
    await requireUserOrPublic()

    const league = await db.league.findFirst({
      where: { isActive: true },
      select: { scoringConfig: true },
    })

    const overrides = league?.scoringConfig as Partial<Record<EventType, number>> | null
    const effective = getEffectivePoints(overrides)

    return NextResponse.json({
      defaults: EVENT_POINTS,
      overrides: overrides || {},
      effective,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching scoring config:', error)
    return NextResponse.json({ error: 'Failed to fetch scoring config' }, { status: 500 })
  }
}

// PATCH /api/league/scoring - Save scoring config and recalculate all Event.points
export async function PATCH(req: Request) {
  try {
    await requireAdmin()

    const body = await req.json()
    const { overrides } = body as { overrides: Partial<Record<EventType, number>> }

    if (!overrides || typeof overrides !== 'object') {
      return NextResponse.json({ error: 'Missing overrides object' }, { status: 400 })
    }

    // Validate all keys are valid EventType values
    const validTypes = Object.values(EventType)
    for (const key of Object.keys(overrides)) {
      if (!validTypes.includes(key as EventType)) {
        return NextResponse.json({ error: `Invalid event type: ${key}` }, { status: 400 })
      }
      const val = overrides[key as EventType]
      if (typeof val !== 'number' || !Number.isInteger(val)) {
        return NextResponse.json(
          { error: `Point value for ${key} must be an integer` },
          { status: 400 }
        )
      }
    }

    // Strip overrides that match defaults (only store actual differences)
    const cleanOverrides: Partial<Record<EventType, number>> = {}
    for (const [key, value] of Object.entries(overrides)) {
      if (value !== EVENT_POINTS[key as EventType]) {
        cleanOverrides[key as EventType] = value
      }
    }

    // Save to league
    const league = await db.league.findFirst({ where: { isActive: true } })
    if (!league) {
      return NextResponse.json({ error: 'No active league found' }, { status: 404 })
    }

    const scoringConfig = Object.keys(cleanOverrides).length > 0 ? cleanOverrides : null

    await db.league.update({
      where: { id: league.id },
      data: {
        scoringConfig: scoringConfig
          ? (cleanOverrides as unknown as Prisma.InputJsonValue)
          : Prisma.DbNull,
      },
    })

    // Recalculate all Event.points based on new effective config
    const effective = getEffectivePoints(scoringConfig)

    for (const eventType of validTypes) {
      await db.event.updateMany({
        where: { type: eventType as EventType },
        data: { points: effective[eventType as EventType] },
      })
    }

    return NextResponse.json({
      defaults: EVENT_POINTS,
      overrides: scoringConfig || {},
      effective,
      recalculated: true,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Error updating scoring config:', error)
    return NextResponse.json({ error: 'Failed to update scoring config' }, { status: 500 })
  }
}
