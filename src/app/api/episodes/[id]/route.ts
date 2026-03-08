import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { GamePhase } from '@prisma/client'
import { validatePhaseTransition } from '@/lib/phase-validation'

// PATCH /api/episodes/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await req.json()
    const { number, title, airDate, gamePhase } = body

    // If gamePhase is being updated, validate the transition
    if (gamePhase) {
      const episode = await db.episode.findUnique({
        where: { id },
        select: { number: true, leagueId: true },
      })
      if (!episode) {
        return NextResponse.json({ error: 'Episode not found' }, { status: 404 })
      }

      const episodeNumber = number ?? episode.number
      const validation = await validatePhaseTransition(episode.leagueId, episodeNumber, gamePhase as GamePhase)

      if (!validation.valid) {
        return NextResponse.json({ error: validation.error, warnings: validation.warnings }, { status: 400 })
      }

      // Include warnings in successful response
      const updatedEpisode = await db.episode.update({
        where: { id },
        data: {
          ...(number !== undefined && { number }),
          ...(title !== undefined && { title }),
          ...(airDate !== undefined && { airDate: new Date(airDate) }),
          gamePhase: gamePhase as GamePhase,
          phaseSource: 'MANUAL',
        },
      })

      return NextResponse.json({ ...updatedEpisode, warnings: validation.warnings })
    }

    const episode = await db.episode.update({
      where: { id },
      data: {
        ...(number !== undefined && { number }),
        ...(title !== undefined && { title }),
        ...(airDate !== undefined && { airDate: new Date(airDate) }),
      },
    })

    return NextResponse.json(episode)
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Error updating episode:', error)
    return NextResponse.json({ error: 'Failed to update episode' }, { status: 500 })
  }
}

// DELETE /api/episodes/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params

    await db.episode.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Error deleting episode:', error)
    return NextResponse.json({ error: 'Failed to delete episode' }, { status: 500 })
  }
}
