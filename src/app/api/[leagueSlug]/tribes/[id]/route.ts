import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ leagueSlug: string; id: string }>
}

// PATCH /api/[leagueSlug]/tribes/[id]
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await req.json()
    const { name, color, isMerge, buffImage } = body

    const tribe = await db.tribe.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(color !== undefined && { color }),
        ...(isMerge !== undefined && { isMerge }),
        ...(buffImage !== undefined && { buffImage: buffImage || null }),
      },
    })

    return NextResponse.json(tribe)
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Error updating tribe:', error)
    return NextResponse.json({ error: 'Failed to update tribe' }, { status: 500 })
  }
}

// DELETE /api/[leagueSlug]/tribes/[id]
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    const { id } = await params

    await db.tribe.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Error deleting tribe:', error)
    return NextResponse.json({ error: 'Failed to delete tribe' }, { status: 500 })
  }
}
