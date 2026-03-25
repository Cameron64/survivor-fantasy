import { auth } from '@clerk/nextjs/server'
import { db } from './db'

export class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized')
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends Error {
  constructor() {
    super('Forbidden')
    this.name = 'ForbiddenError'
  }
}

export async function requireLeagueMember(slug: string) {
  const { userId } = await auth()
  if (!userId) throw new UnauthorizedError()

  const membership = await db.leagueMembership.findFirst({
    where: {
      league: { slug },
      user: { clerkId: userId },
    },
    include: { league: true, user: true },
  })
  if (!membership) throw new ForbiddenError()
  return { league: membership.league, role: membership.role, userId: membership.user.id }
}

export async function requireLeagueAdmin(slug: string) {
  const result = await requireLeagueMember(slug)
  if (result.role === 'PLAYER') throw new ForbiddenError()
  return result
}
