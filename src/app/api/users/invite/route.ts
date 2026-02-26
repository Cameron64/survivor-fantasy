import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// POST /api/users/invite - Send email invite via Clerk
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
    const body = await req.json()
    const { email } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const trimmedEmail = email.trim().toLowerCase()

    // Check for existing user in DB
    const existingUser = await db.user.findUnique({
      where: { email: trimmedEmail },
    })
    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      )
    }

    // Check for existing pending invite in Clerk
    const clerk = await clerkClient()
    const existingInvitations = await clerk.invitations.getInvitationList()
    const pendingDuplicate = existingInvitations.data.find(
      (inv) => inv.emailAddress === trimmedEmail && inv.status === 'pending'
    )
    if (pendingDuplicate) {
      return NextResponse.json(
        { error: 'An invitation is already pending for this email' },
        { status: 409 }
      )
    }

    const redirectUrl = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/sign-up`
      : undefined

    const invitation = await clerk.invitations.createInvitation({
      emailAddress: trimmedEmail,
      redirectUrl,
    })

    return NextResponse.json({
      id: invitation.id,
      emailAddress: invitation.emailAddress,
      status: invitation.status,
      createdAt: invitation.createdAt,
    })
  } catch (error) {
    console.error('Error creating invitation:', error)
    if (error instanceof Error && error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
  }
}
