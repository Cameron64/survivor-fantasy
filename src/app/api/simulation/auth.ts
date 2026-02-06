import { auth, clerkClient } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

/**
 * Admin check for simulation routes.
 * Tries Clerk publicMetadata first (no DB needed), falls back to
 * database lookup. If both fail, throws with a clear message.
 */
export async function requireSimAdmin() {
  const { userId } = await auth()
  if (!userId) {
    throw new Error('Unauthorized')
  }

  // Fast path: check Clerk publicMetadata (no DB round-trip)
  const clerk = await clerkClient()
  const clerkUser = await clerk.users.getUser(userId)
  const clerkRole = clerkUser.publicMetadata?.role as string | undefined
  if (clerkRole === 'ADMIN') {
    return { userId, role: clerkRole }
  }

  // Slow path: role might only be in the database
  try {
    const dbUser = await db.user.findUnique({ where: { clerkId: userId } })
    if (dbUser?.role === 'ADMIN') {
      return { userId, role: 'ADMIN' as const }
    }
  } catch {
    // DB is down — if Clerk didn't have ADMIN either, we can't verify
    throw new Error('Forbidden: Could not verify admin role (database unreachable, and Clerk publicMetadata.role is not set to ADMIN)')
  }

  throw new Error('Forbidden: Admin access required')
}
