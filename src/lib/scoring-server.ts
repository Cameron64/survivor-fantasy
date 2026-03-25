import { EventType } from '@prisma/client'
import { getLegacyLeague } from './league-context'
import { getEffectivePoints } from './scoring'
import { type GameSettings, parseGameSettings } from './game-settings'

/**
 * Read the active league's scoringConfig from the DB and return the effective merged points map.
 */
export async function getLeagueScoringConfig(): Promise<Record<EventType, number>> {
  const league = await getLegacyLeague()
  const overrides = league?.scoringConfig as Partial<Record<EventType, number>> | null
  return getEffectivePoints(overrides)
}

/**
 * Read the active league's gameSettings from the DB and return validated settings.
 */
export async function getLeagueGameSettings(): Promise<GameSettings> {
  const league = await getLegacyLeague()
  return parseGameSettings(league?.gameSettings)
}
