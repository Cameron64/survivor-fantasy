import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, getCurrentUser } from '@/lib/auth'
import { generateInviteCode } from '@/lib/utils'

// GET /api/users/me - Get current user
export async function GET(_req: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching current user:', error)
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}

// PATCH /api/users/me - Update current user (generate invite code)
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser()
    const body = await req.json()

    const { generateInvite } = body

    // Dev-only: switch user role
    if (body.devRole && process.env.NODE_ENV === 'development') {
      const validRoles = ['USER', 'MODERATOR', 'ADMIN']
      if (!validRoles.includes(body.devRole)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
      }

      const updatedUser = await db.user.update({
        where: { id: user.id },
        data: { role: body.devRole },
        include: {
          team: {
            include: {
              contestants: {
                include: {
                  contestant: true,
                },
              },
            },
          },
        },
      })

      return NextResponse.json(updatedUser)
    }

    if (generateInvite) {
      // Generate a unique invite code
      let inviteCode = generateInviteCode()

      // Ensure uniqueness
      let attempts = 0
      while (attempts < 10) {
        const existing = await db.user.findUnique({
          where: { inviteCode },
        })
        if (!existing) break
        inviteCode = generateInviteCode()
        attempts++
      }

      const updatedUser = await db.user.update({
        where: { id: user.id },
        data: { inviteCode },
        include: {
          team: {
            include: {
              contestants: {
                include: {
                  contestant: true,
                },
              },
            },
          },
        },
      })

      return NextResponse.json(updatedUser)
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}
