import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { generateInviteCode } from '@/lib/utils'
import { env } from '@/lib/env'
import { withAuth, successResponse, errorResponse, handleApiError } from '@/lib/api/response-helpers'

// GET /api/users/me - Get current user
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return errorResponse('Not authenticated', 401)
    }

    return successResponse(user)
  } catch (error) {
    return handleApiError(error, 'Failed to fetch user')
  }
}

// PATCH /api/users/me - Update current user (generate invite code)
export const PATCH = withAuth(async (user, req) => {
  try {
    const body = await req!.json()
    const { generateInvite } = body

    // Dev-only: switch user role
    if (body.devRole && env.NODE_ENV === 'development') {
      const validRoles = ['USER', 'MODERATOR', 'ADMIN']
      if (!validRoles.includes(body.devRole)) {
        return errorResponse('Invalid role', 400)
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

      return successResponse(updatedUser)
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

      return successResponse(updatedUser)
    }

    return successResponse(user)
  } catch (error) {
    return handleApiError(error, 'Failed to update user')
  }
})
