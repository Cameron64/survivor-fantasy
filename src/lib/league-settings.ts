import { db } from './db'

export async function getLeagueSettings() {
  const league = await db.league.findFirst({
    select: { isPublic: true, allowGuestEvents: true },
  })
  return {
    isPublic: league?.isPublic ?? false,
    allowGuestEvents: league?.allowGuestEvents ?? false,
  }
}
