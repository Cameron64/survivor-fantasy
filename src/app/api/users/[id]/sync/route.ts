import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/users/[id]/sync — Check Clerk sync status for a user
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, clerkId: true, email: true, name: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const isPending = user.clerkId.startsWith('pending_')

  // Try to find Clerk account by email
  let clerkAccount: { id: string; email: string; firstName: string | null; lastName: string | null } | null = null
  let clerkLinked = false
  let emailMatch = false

  try {
    const clerk = await clerkClient()

    if (!isPending) {
      // Check if the stored clerkId is valid
      try {
        const clerkUser = await clerk.users.getUser(user.clerkId)
        clerkAccount = {
          id: clerkUser.id,
          email: clerkUser.emailAddresses[0]?.emailAddress ?? '',
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
        }
        clerkLinked = true
        emailMatch = clerkAccount.email === user.email
      } catch {
        // clerkId doesn't resolve — stale reference
        clerkLinked = false
      }
    }

    // If pending or stale, look up by email
    if (!clerkLinked) {
      const results = await clerk.users.getUserList({ emailAddress: [user.email] })
      if (results.data.length > 0) {
        const found = results.data[0]
        clerkAccount = {
          id: found.id,
          email: found.emailAddresses[0]?.emailAddress ?? '',
          firstName: found.firstName,
          lastName: found.lastName,
        }
        emailMatch = clerkAccount.email === user.email
      }
    }
  } catch {
    return NextResponse.json({
      status: 'clerk-unreachable',
      dbClerkId: user.clerkId,
      isPending,
      error: 'Could not reach Clerk API',
    })
  }

  let status: string
  if (clerkLinked && emailMatch) {
    status = 'linked'
  } else if (clerkLinked && !emailMatch) {
    status = 'email-mismatch'
  } else if (isPending && clerkAccount) {
    status = 'pending-can-link'
  } else if (isPending && !clerkAccount) {
    status = 'pending-no-clerk'
  } else if (!isPending && !clerkLinked && clerkAccount) {
    status = 'stale-can-link'
  } else {
    status = 'no-clerk-account'
  }

  return NextResponse.json({
    status,
    dbClerkId: user.clerkId,
    isPending,
    clerkAccount,
    emailMatch,
  })
}

// POST /api/users/[id]/sync — Re-link user to their Clerk account
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const { action } = body

  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, clerkId: true, email: true, name: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (action === 'relink') {
    // Auto-link: find Clerk account by email and update clerkId
    const clerk = await clerkClient()
    const results = await clerk.users.getUserList({ emailAddress: [user.email] })

    if (results.data.length === 0) {
      return NextResponse.json({ error: 'No Clerk account found for this email' }, { status: 404 })
    }

    const clerkUser = results.data[0]
    await db.user.update({
      where: { id },
      data: { clerkId: clerkUser.id },
    })

    return NextResponse.json({ success: true, clerkId: clerkUser.id })
  }

  if (action === 'manual-link') {
    const { clerkId } = body
    if (!clerkId || typeof clerkId !== 'string') {
      return NextResponse.json({ error: 'clerkId is required' }, { status: 400 })
    }

    await db.user.update({
      where: { id },
      data: { clerkId },
    })

    return NextResponse.json({ success: true, clerkId })
  }

  if (action === 'resend-invite') {
    const clerk = await clerkClient()
    const redirectUrl = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/sign-up`
      : undefined

    try {
      const invitation = await clerk.invitations.createInvitation({
        emailAddress: user.email,
        redirectUrl,
      })
      return NextResponse.json({ success: true, invitationId: invitation.id })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to send invitation'
      return NextResponse.json({ error: message }, { status: 502 })
    }
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
