import { z } from 'zod'
import { db } from './db'

export const gameSettingsSchema = z.object({
  extraVoteAwardsCorrectVote: z.boolean().default(true),
})

export type GameSettings = z.infer<typeof gameSettingsSchema>

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  extraVoteAwardsCorrectVote: true,
}

/**
 * Parse and validate gameSettings JSON. Accepts null/undefined/object.
 * Always returns a valid GameSettings — never throws, never returns partial.
 */
export function parseGameSettings(raw: unknown): GameSettings {
  if (raw === null || raw === undefined) return { ...DEFAULT_GAME_SETTINGS }
  const result = gameSettingsSchema.safeParse(raw)
  if (!result.success) return { ...DEFAULT_GAME_SETTINGS }
  return result.data
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
