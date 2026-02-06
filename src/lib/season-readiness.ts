import { db } from './db'

export interface SeasonReadiness {
  isReady: boolean
  checks: {
    hasContestants: boolean
    hasTribes: boolean
    allContestantsAssigned: boolean
    hasEpisodes: boolean
  }
  details: {
    contestantCount: number
    tribeCount: number
    unassignedCount: number
    episodeCount: number
  }
}

export async function checkSeasonReadiness(): Promise<SeasonReadiness> {
  const league = await db.league.findFirst({
    where: { isActive: true },
    select: { id: true },
  })

  if (!league) {
    return {
      isReady: false,
      checks: {
        hasContestants: false,
        hasTribes: false,
        allContestantsAssigned: false,
        hasEpisodes: false,
      },
      details: {
        contestantCount: 0,
        tribeCount: 0,
        unassignedCount: 0,
        episodeCount: 0,
      },
    }
  }

  const [contestantCount, tribeCount, episodeCount, assignedCount] =
    await Promise.all([
      db.contestant.count(),
      db.tribe.count({ where: { leagueId: league.id } }),
      db.episode.count({ where: { leagueId: league.id } }),
      db.contestant.count({
        where: {
          tribeMemberships: {
            some: { toWeek: null },
          },
        },
      }),
    ])

  const unassignedCount = contestantCount - assignedCount

  const hasContestants = contestantCount > 0
  const hasTribes = tribeCount > 0
  const allContestantsAssigned = hasContestants && unassignedCount === 0
  const hasEpisodes = episodeCount > 0

  return {
    // Tribes are NOT required — they're formed in episode 1, after drafting
    isReady: hasContestants && hasEpisodes,
    checks: {
      hasContestants,
      hasTribes,
      allContestantsAssigned,
      hasEpisodes,
    },
    details: {
      contestantCount,
      tribeCount,
      unassignedCount,
      episodeCount,
    },
  }
}
