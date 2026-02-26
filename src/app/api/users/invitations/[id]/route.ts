import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { requireAdmin } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

// DELETE /api/users/invitations/[id] - Revoke a pending invitation
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    const { id } = await params

    const clerk = await clerkClient()
    await clerk.invitations.revokeInvitation(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error revoking invitation:', error)
    if (error instanceof Error && error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to revoke invitation' }, { status: 500 })
  }
}
