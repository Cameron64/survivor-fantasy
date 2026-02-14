import { auth } from '@clerk/nextjs/server'

/**
 * Auth check for simulation routes.
 * Requires any authenticated user.
 */
export async function requireSimUser() {
  const { userId } = await auth()
  if (!userId) {
    throw new Error('Unauthorized')
  }

  return { userId }
}
