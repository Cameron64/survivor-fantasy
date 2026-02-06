import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// GET /api/users - List all users (admin only)
export async function GET(_req: NextRequest) {
  try {
    await requireAdmin()

    const users = await db.user.findMany({
      include: {
        team: {
          include: {
            contestants: {
              include: {
                contestant: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
        invitedBy: {
          select: { id: true, name: true },
        },
        _count: {
          select: {
            invitees: true,
            eventSubmissions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    if (error instanceof Error && error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}
