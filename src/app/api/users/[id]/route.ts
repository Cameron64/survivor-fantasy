import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { Role } from '@prisma/client'

const devBypass = process.env.NODE_ENV === 'development' && !!process.env.DEV_USER_ID

interface RouteParams {
  params: Promise<{ id: string }>
}

const userInclude = {
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
} as const

// PATCH /api/users/[id] - Update a user (admin only)
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await req.json()

    const { role, isPaid, name, email, adminNotes, tags } = body

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

    const clerk = devBypass ? null : await clerkClient()

    // If email is being replaced (user replacement flow):
    // Delete old Clerk account, update DB email, send invitation to new person.
    // When they sign up, the webhook re-links via email match.
    if (email !== undefined && typeof email === 'string' && email.trim()) {
      const newEmail = email.trim().toLowerCase()

      if (newEmail !== existingUser.email) {
        const duplicate = await db.user.findUnique({ where: { email: newEmail } })
        if (duplicate) {
          return NextResponse.json(
            { error: 'A user with this email already exists' },
            { status: 409 }
          )
        }

        // Delete old Clerk account (skip if it doesn't exist, e.g. test users)
        try {
          if (clerk) await clerk.users.deleteUser(existingUser.clerkId)
        } catch (clerkError: unknown) {
          const isNotFound =
            clerkError &&
            typeof clerkError === 'object' &&
            'status' in clerkError &&
            clerkError.status === 404
          if (!isNotFound) {
            console.error('Failed to delete old Clerk account:', clerkError)
            return NextResponse.json(
              { error: 'Failed to delete old Clerk account' },
              { status: 502 }
            )
          }
        }

        // Send invitation to new email
        try {
          const redirectUrl = process.env.NEXT_PUBLIC_APP_URL
            ? `${process.env.NEXT_PUBLIC_APP_URL}/sign-up`
            : undefined
          if (clerk) await clerk.invitations.createInvitation({
            emailAddress: newEmail,
            redirectUrl,
          })
        } catch (inviteError) {
          console.error('Failed to send invitation:', inviteError)
          // Non-fatal: DB update still proceeds, admin can resend manually
        }

        // Update DB — clear clerkId placeholder until webhook re-links
        const user = await db.user.update({
          where: { id },
          data: {
            clerkId: `pending_${id}`,
            email: newEmail,
            ...(name !== undefined && { name: name.trim() }),
            ...(role !== undefined && { role }),
            ...(isPaid !== undefined && { isPaid }),
            ...(adminNotes !== undefined && { adminNotes: adminNotes || null }),
            ...(tags !== undefined && { tags }),
          },
          include: userInclude,
        })

        return NextResponse.json(user)
      }
    }

    // If name is being updated, sync to Clerk (non-blocking — DB update proceeds even if Clerk fails)
    if (name !== undefined && typeof name === 'string' && name.trim() && clerk) {
      try {
        const parts = name.trim().split(/\s+/)
        const firstName = parts[0]
        const lastName = parts.slice(1).join(' ') || undefined
        await clerk.users.updateUser(existingUser.clerkId, { firstName, lastName })
      } catch (clerkError) {
        console.error('Failed to update name in Clerk (continuing with DB update):', clerkError)
      }
    }

    const user = await db.user.update({
      where: { id },
      data: {
        ...(role !== undefined && { role }),
        ...(isPaid !== undefined && { isPaid }),
        ...(name !== undefined && { name: name.trim() }),
        ...(adminNotes !== undefined && { adminNotes: adminNotes || null }),
        ...(tags !== undefined && { tags }),
      },
      include: userInclude,
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

// DELETE /api/users/[id] - Delete a user (admin only)
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAdmin()
    const { id } = await params

    // Prevent self-deletion
    if (admin.id === id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    const existingUser = await db.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            eventSubmissions: true,
            gameEventSubmissions: true,
          },
        },
      },
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check for FK constraints — events reference submittedById
    const totalEvents =
      existingUser._count.eventSubmissions + existingUser._count.gameEventSubmissions
    if (totalEvents > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete user with event submissions',
          eventCount: existingUser._count.eventSubmissions,
          gameEventCount: existingUser._count.gameEventSubmissions,
          message: `This user has ${totalEvents} event submission(s). Reassign or delete their events before removing the user.`,
        },
        { status: 409 }
      )
    }

    // Delete from Clerk first (skip if not found, e.g. test users)
    try {
      if (!devBypass) {
        const clerk = await clerkClient()
        await clerk.users.deleteUser(existingUser.clerkId)
      }
    } catch (clerkError: unknown) {
      const isNotFound =
        clerkError &&
        typeof clerkError === 'object' &&
        'status' in clerkError &&
        clerkError.status === 404
      if (!isNotFound) {
        console.error('Failed to delete user from Clerk:', clerkError)
        return NextResponse.json(
          { error: 'Failed to delete user from Clerk' },
          { status: 502 }
        )
      }
    }

    // Cascade delete locally: team contestants -> team -> nullify invitedById -> delete user
    await db.$transaction(async (tx) => {
      // Delete team contestants and team
      const team = await tx.team.findUnique({ where: { userId: id } })
      if (team) {
        await tx.teamContestant.deleteMany({ where: { teamId: team.id } })
        await tx.team.delete({ where: { id: team.id } })
      }

      // Nullify invitedById references
      await tx.user.updateMany({
        where: { invitedById: id },
        data: { invitedById: null },
      })

      // Nullify approvedById references on events
      await tx.event.updateMany({
        where: { approvedById: id },
        data: { approvedById: null },
      })
      await tx.gameEvent.updateMany({
        where: { approvedById: id },
        data: { approvedById: null },
      })

      // Delete the user
      await tx.user.delete({ where: { id } })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)
    if (error instanceof Error && error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
