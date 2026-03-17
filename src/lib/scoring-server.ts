import { EventType } from '@prisma/client'
import { db } from './db'
import { getEffectivePoints } from './scoring'
import { type GameSettings, parseGameSettings } from './game-settings'

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
 * Read the active league's gameSettings from the DB and return validated settings.
 */
export async function getLeagueGameSettings(): Promise<GameSettings> {
  const league = await db.league.findFirst({
    where: { isActive: true },
    select: { gameSettings: true },
  })
  return parseGameSettings(league?.gameSettings)
}
