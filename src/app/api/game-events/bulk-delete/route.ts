import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// POST /api/game-events/bulk-delete - Bulk delete game events and their derived events (admin only)
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
    const body = await req.json()

    const { ids } = body

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 })
    }

    // Cascade delete handles derived events (onDelete: Cascade in schema)
    const result = await db.gameEvent.deleteMany({
      where: { id: { in: ids } },
    })

    return NextResponse.json({ deleted: result.count })
  } catch (error) {
    console.error('Error bulk deleting game events:', error)
    if (error instanceof Error && error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to delete game events' }, { status: 500 })
  }
}
