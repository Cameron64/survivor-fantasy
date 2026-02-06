import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { Role } from '@prisma/client'

interface RouteParams {
  params: Promise<{ id: string }>
}

// PATCH /api/users/[id] - Update a user (admin only)
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await req.json()

    const { role, isPaid } = body

    const existingUser = await db.user.findUnique({
      where: { id },
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Validate role if provided
    if (role && !Object.values(Role).includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const user = await db.user.update({
      where: { id },
      data: {
        ...(role !== undefined && { role }),
        ...(isPaid !== undefined && { isPaid }),
      },
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
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error updating user:', error)
    if (error instanceof Error && error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}
