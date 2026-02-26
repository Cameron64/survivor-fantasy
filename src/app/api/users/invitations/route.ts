import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { requireAdmin } from '@/lib/auth'

// GET /api/users/invitations - List pending invitations
export async function GET(_req: NextRequest) {
  try {
    await requireAdmin()

    const clerk = await clerkClient()
    const invitations = await clerk.invitations.getInvitationList()

    const pending = invitations.data
      .filter((inv) => inv.status === 'pending')
      .map((inv) => ({
        id: inv.id,
        emailAddress: inv.emailAddress,
        status: inv.status,
        createdAt: inv.createdAt,
      }))

    return NextResponse.json(pending)
  } catch (error) {
    console.error('Error fetching invitations:', error)
    if (error instanceof Error && error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 })
  }
}
