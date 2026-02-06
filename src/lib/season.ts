// Season 50 premiere date — update this each season
const SEASON_PREMIERE = new Date('2025-02-26T20:00:00-05:00')

/**
 * Get the current week number based on the season premiere date.
 * Week 1 starts on premiere day. Returns at least 1, at most 14.
 */
export function getCurrentWeek(): number {
  const now = new Date()
  if (now < SEASON_PREMIERE) return 1
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  const weeksSincePremiere = Math.floor(
    (now.getTime() - SEASON_PREMIERE.getTime()) / msPerWeek
  )
  return Math.min(Math.max(weeksSincePremiere + 1, 1), 14)
}
