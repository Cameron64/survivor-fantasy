import { GamePhase } from '@prisma/client'
import { db } from './db'

const PHASE_ORDER: Record<GamePhase, number> = {
  PRE_MERGE: 0,
  MERGE_TRANSITION: 1,
  MERGED: 2,
  FINAL_PHASE: 3,
}

export interface PhaseValidationResult {
  valid: boolean
  error?: string
  warnings: string[]
}

/**
 * Validate that a proposed phase transition for an episode is allowed.
 * Uses nearest known timeline neighbors — gaps are treated as unknown.
 */
export async function validatePhaseTransition(
  leagueId: string,
  episodeNumber: number,
  proposedPhase: GamePhase
): Promise<PhaseValidationResult> {
  const warnings: string[] = []

  // Get all episodes ordered by number
  const episodes = await db.episode.findMany({
    where: { leagueId },
    orderBy: { number: 'asc' },
    select: { number: true, gamePhase: true },
  })

  // Find nearest prior and next episodes
  const priorEpisodes = episodes.filter((e) => e.number < episodeNumber)
  const nextEpisodes = episodes.filter((e) => e.number > episodeNumber)
  const priorEpisode = priorEpisodes.length > 0 ? priorEpisodes[priorEpisodes.length - 1] : null
  const nextEpisode = nextEpisodes.length > 0 ? nextEpisodes[0] : null

  // Hard check: phase must be >= prior episode's phase
  if (priorEpisode && PHASE_ORDER[proposedPhase] < PHASE_ORDER[priorEpisode.gamePhase]) {
    return {
      valid: false,
      error: `Cannot set episode ${episodeNumber} to ${proposedPhase} — episode ${priorEpisode.number} is already ${priorEpisode.gamePhase}. Phases can only move forward.`,
      warnings,
    }
  }

  // Hard check: phase must be <= next episode's phase
  if (nextEpisode && PHASE_ORDER[proposedPhase] > PHASE_ORDER[nextEpisode.gamePhase]) {
    return {
      valid: false,
      error: `Cannot set episode ${episodeNumber} to ${proposedPhase} — episode ${nextEpisode.number} is ${nextEpisode.gamePhase}. Would create a phase ordering violation.`,
      warnings,
    }
  }

  // Hard check: can't set PRE_MERGE at or after mergeWeek
  const league = await db.league.findFirst({
    where: { id: leagueId },
    select: { mergeWeek: true },
  })

  if (league?.mergeWeek) {
    if (proposedPhase === 'PRE_MERGE' && episodeNumber >= league.mergeWeek) {
      return {
        valid: false,
        error: `Cannot set PRE_MERGE on episode ${episodeNumber} — merge occurred at week ${league.mergeWeek}.`,
        warnings,
      }
    }
    if (proposedPhase === 'MERGED' && episodeNumber < league.mergeWeek) {
      return {
        valid: false,
        error: `Cannot set MERGED on episode ${episodeNumber} — merge doesn't occur until week ${league.mergeWeek}.`,
        warnings,
      }
    }
  }

  // Soft warnings
  if (priorEpisode && episodeNumber - priorEpisode.number > 1) {
    warnings.push(`Gap between episodes ${priorEpisode.number} and ${episodeNumber} — validation may be incomplete.`)
  }

  return { valid: true, warnings }
}

/**
 * Get the numeric order of a phase for comparison.
 */
export function getPhaseOrder(phase: GamePhase): number {
  return PHASE_ORDER[phase]
}
