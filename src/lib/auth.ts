import { auth } from '@clerk/nextjs/server'
import { headers } from 'next/headers'
import { Role } from '@prisma/client'
import { db } from './db'

const userInclude = {
  team: {
    include: {
      contestants: {
        include: {
          contestant: true,
        },
      },
    },
  },
} as const

/**
 * Try to authenticate via BOT_API_KEY + X-Acting-User headers.
 * Returns the acting user's DB record, or null if headers are missing/invalid.
 */
async function getUserFromApiKey() {
  try {
    const apiKey = process.env.BOT_API_KEY
    if (!apiKey) return null

    const hdrs = await headers()
    const authHeader = hdrs.get('authorization')
    const actingUserId = hdrs.get('x-acting-user')

    if (!authHeader || !actingUserId) return null
    if (authHeader !== `Bearer ${apiKey}`) return null

    return db.user.findUnique({
      where: { id: actingUserId },
      include: userInclude,
    })
  } catch {
    return null
  }
}

/**
 * Get the current user's database record.
 * Tries API key auth first (for bot), then falls back to Clerk session.
 */
export async function getCurrentUser() {
  // API key auth (bot service)
  const apiKeyUser = await getUserFromApiKey()
  if (apiKeyUser) return apiKeyUser

  // Clerk session auth (browser)
  let clerkUserId: string | null = null
  try {
    const { userId } = await auth()
    clerkUserId = userId
  } catch {
    return null
  }

  if (!clerkUserId) return null

  const user = await db.user.findUnique({
    where: { clerkId: clerkUserId },
    include: userInclude,
  })

  return user
}

/**
 * Get the current user or throw if not authenticated
 */
export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

/**
 * Check if the current user has admin role
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser()
  return user?.role === Role.ADMIN
}

/**
 * Check if the current user has moderator or admin role
 */
export async function isModerator(): Promise<boolean> {
  const user = await getCurrentUser()
  return user?.role === Role.ADMIN || user?.role === Role.MODERATOR
}

/**
 * Require admin role or throw
 */
export async function requireAdmin() {
  const user = await requireUser()
  if (user.role !== Role.ADMIN) {
    throw new Error('Forbidden: Admin access required')
  }
  return user
}

/**
 * Require moderator or admin role
 */
export async function requireModerator() {
  const user = await requireUser()
  if (user.role !== Role.ADMIN && user.role !== Role.MODERATOR) {
    throw new Error('Forbidden: Moderator access required')
  }
  return user
}

/**
 * Sync user from Clerk to database
 * Called from webhook when user is created/updated
 */
export async function syncUserFromClerk(clerkUser: {
  id: string
  emailAddresses: Array<{ emailAddress: string }>
  firstName?: string | null
  lastName?: string | null
  publicMetadata?: {
    role?: Role
    isPaid?: boolean
  }
}) {
  const email = clerkUser.emailAddresses[0]?.emailAddress
  if (!email) {
    throw new Error('User has no email address')
  }

  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || email.split('@')[0]

  const existingUser = await db.user.findUnique({
    where: { clerkId: clerkUser.id },
  })

  if (existingUser) {
    return db.user.update({
      where: { clerkId: clerkUser.id },
      data: {
        email,
        name,
        role: (clerkUser.publicMetadata?.role as Role) || existingUser.role,
        isPaid: clerkUser.publicMetadata?.isPaid ?? existingUser.isPaid,
      },
    })
  }

  return db.user.create({
    data: {
      clerkId: clerkUser.id,
      email,
      name,
      role: (clerkUser.publicMetadata?.role as Role) || Role.USER,
      isPaid: clerkUser.publicMetadata?.isPaid ?? false,
    },
  })
}

/**
 * Get user by invite code
 */
export async function getUserByInviteCode(inviteCode: string) {
  return db.user.findUnique({
    where: { inviteCode },
  })
}
