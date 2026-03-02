/**
 * Single source of truth for scoring point values.
 *
 * CRITICAL: This file is the ONLY place where point values should be defined.
 * Both the application and simulation engine import from here.
 *
 * When adding a new EventType:
 * 1. Add to EventType enum in prisma/schema.prisma
 * 2. Add point value here
 * 3. Add label in scoring.ts getEventTypeLabel()
 * 4. Add category in scoring.ts getEventTypesByCategory()
 * 5. Add simulation mapping in simulation/engine/data-mapper.ts (if applicable)
 * 6. Run: pnpm db:push
 */

/**
 * Points mapping for each event type.
 * Used by both the application (src/lib/scoring.ts) and
 * simulation engine (src/simulation/engine/data-mapper.ts).
 */
export const EVENT_POINTS = {
  // Challenge Performance
  INDIVIDUAL_IMMUNITY_WIN: 5,
  REWARD_CHALLENGE_WIN: 3,
  TEAM_CHALLENGE_WIN: 1,

  // Tribal Council & Strategy
  CORRECT_VOTE: 2,
  IDOL_PLAY_SUCCESS: 5,
  IDOL_FIND: 3,
  FIRE_MAKING_WIN: 5,

  // Social & Game
  ZERO_VOTES_RECEIVED: 1,
  SURVIVED_WITH_VOTES: 2,
  CAUSED_BLINDSIDE: 0, // deprecated — no longer awarded

  // Endgame
  MADE_JURY: 5,
  FINALIST: 10,
  WINNER: 20,

  // Deductions
  VOTED_OUT_WITH_IDOL: -3,
  QUIT: -10,

  // Neutral
  MEDEVAC: 0,
} as const

/**
 * Type-safe event type from the constants.
 * Ensures TypeScript knows all valid event types.
 */
export type EventTypeKey = keyof typeof EVENT_POINTS

/**
 * Validate that a string is a valid event type key.
 */
export function isValidEventType(key: string): key is EventTypeKey {
  return key in EVENT_POINTS
}
