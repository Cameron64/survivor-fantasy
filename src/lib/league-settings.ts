import { getLegacyLeague } from './league-context'

export async function getLeagueSettings() {
  const league = await getLegacyLeague()
  return {
    isPublic: league?.isPublic ?? false,
    allowGuestEvents: league?.allowGuestEvents ?? false,
    allowUserEvents: league?.allowUserEvents ?? true,
  }
}
