import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// PATCH /api/tribe-memberships/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await req.json()
    const { tribeId, fromWeek, toWeek } = body

    const membership = await db.tribeMembership.update({
      where: { id },
      data: {
        ...(tribeId !== undefined && { tribeId }),
        ...(fromWeek !== undefined && { fromWeek }),
        ...(toWeek !== undefined && { toWeek }),
      },
      include: {
        contestant: { select: { id: true, name: true } },
        tribe: { select: { id: true, name: true, color: true } },
      },
    })

    return NextResponse.json(membership)
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Error updating tribe membership:', error)
    return NextResponse.json({ error: 'Failed to update membership' }, { status: 500 })
  }
}

// DELETE /api/tribe-memberships/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params

    await db.tribeMembership.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Error deleting tribe membership:', error)
    return NextResponse.json({ error: 'Failed to delete membership' }, { status: 500 })
  }
}
