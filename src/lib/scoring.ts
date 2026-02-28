import { EventType, Event } from '@prisma/client'
import { db } from './db'
import { EVENT_POINTS } from './constants/scoring-constants'

/**
 * Get the point value for an event type (uses hardcoded defaults)
 */
export function getEventPoints(eventType: EventType): number {
  return EVENT_POINTS[eventType]
}

/**
 * Merge default EVENT_POINTS with optional overrides.
 * Returns a full Record<EventType, number> with overrides applied on top of defaults.
 */
export function getEffectivePoints(
  overrides?: Partial<Record<EventType, number>> | null
): Record<EventType, number> {
  if (!overrides) return { ...EVENT_POINTS }
  return { ...EVENT_POINTS, ...overrides }
}

/**
 * Read the active league's scoringConfig from the DB and return the effective merged points map.
 */
export async function getLeagueScoringConfig(): Promise<Record<EventType, number>> {
  const league = await db.league.findFirst({
    where: { isActive: true },
    select: { scoringConfig: true },
  })
  const overrides = league?.scoringConfig as Partial<Record<EventType, number>> | null
  return getEffectivePoints(overrides)
}

/**
 * Calculate total points from a list of approved events
 */
export function calculateTotalPoints(events: Pick<Event, 'points' | 'isApproved'>[]): number {
  return events
    .filter((event) => event.isApproved)
    .reduce((total, event) => total + event.points, 0)
}

/**
 * Calculate points grouped by week
 */
export function calculatePointsByWeek(
  events: Pick<Event, 'week' | 'points' | 'isApproved'>[]
): Record<number, number> {
  return events
    .filter((event) => event.isApproved)
    .reduce(
      (acc, event) => {
        acc[event.week] = (acc[event.week] || 0) + event.points
        return acc
      },
      {} as Record<number, number>
    )
}

/**
 * Calculate points for a contestant from their events
 */
export function calculateContestantPoints(
  events: Pick<Event, 'points' | 'isApproved'>[]
): number {
  return calculateTotalPoints(events)
}

/**
 * Calculate total team score from all contestants' events
 */
export function calculateTeamScore(
  contestantEvents: Array<{
    contestantId: string
    events: Pick<Event, 'points' | 'isApproved'>[]
  }>
): number {
  return contestantEvents.reduce(
    (total, { events }) => total + calculateContestantPoints(events),
    0
  )
}

/**
 * Get human-readable event type label
 */
export function getEventTypeLabel(eventType: EventType): string {
  const labels: Record<EventType, string> = {
    INDIVIDUAL_IMMUNITY_WIN: 'Individual Immunity Win',
    REWARD_CHALLENGE_WIN: 'Reward Challenge Win',
    TEAM_CHALLENGE_WIN: 'Team Challenge Win',
    CORRECT_VOTE: 'Correct Vote',
    IDOL_PLAY_SUCCESS: 'Successful Idol Play',
    IDOL_FIND: 'Found Idol',
    FIRE_MAKING_WIN: 'Fire Making Win',
    ZERO_VOTES_RECEIVED: 'Zero Votes Received',
    SURVIVED_WITH_VOTES: 'Survived with Votes',
    CAUSED_BLINDSIDE: 'Caused Blindside',
    MADE_JURY: 'Made Jury',
    FINALIST: 'Finalist',
    WINNER: 'Winner',
    VOTED_OUT_WITH_IDOL: 'Voted Out with Idol',
    QUIT: 'Quit',
    MEDEVAC: 'Medevac',
  }
  return labels[eventType]
}

/**
 * Get event types grouped by category for UI display
 */
export function getEventTypesByCategory(): Record<string, EventType[]> {
  return {
    'Challenge Performance': [
      'INDIVIDUAL_IMMUNITY_WIN',
      'REWARD_CHALLENGE_WIN',
      'TEAM_CHALLENGE_WIN',
    ],
    'Tribal Council & Strategy': [
      'CORRECT_VOTE',
      'IDOL_PLAY_SUCCESS',
      'IDOL_FIND',
      'FIRE_MAKING_WIN',
    ],
    'Social & Game': ['ZERO_VOTES_RECEIVED', 'SURVIVED_WITH_VOTES', 'CAUSED_BLINDSIDE'],
    Endgame: ['MADE_JURY', 'FINALIST', 'WINNER'],
    Deductions: ['VOTED_OUT_WITH_IDOL', 'QUIT'],
    Neutral: ['MEDEVAC'],
  }
}

/**
 * Validate event points match expected value for event type
 */
export function validateEventPoints(eventType: EventType, points: number): boolean {
  return EVENT_POINTS[eventType] === points
}
