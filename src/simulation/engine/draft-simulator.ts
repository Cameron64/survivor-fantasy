import type { SimSeason, SimEvent, DraftConfig, DraftResult, PointOverrides } from './types'
import { BASE_EVENT_POINTS } from './data-mapper'
import { SIM_DEFAULTS } from '../config/defaults'

/**
 * Get total points for a castaway using the given point scheme.
 */
function castawayTotalPoints(
  castawayId: string,
  events: SimEvent[],
  overrides: PointOverrides
): number {
  const pts = { ...BASE_EVENT_POINTS, ...overrides }
  return events
    .filter((e) => e.castawayId === castawayId)
    .reduce((sum, e) => sum + pts[e.type], 0)
}

/**
 * Run a snake draft for the given season data.
 *
 * Each contestant can be drafted up to `maxOwnersPerContestant` times
 * (default: 2), allowing shared rosters when the player count exceeds
 * the castaway count.
 *
 * In `random` mode, picks are weighted by contestant total points + noise
 * to simulate realistic (but not perfect) drafting.
 *
 * In `manual` mode, picks are specified via config.manualPicks.
 *
 * In `hybrid` mode, some players have manual picks, the rest are random.
 */
export function simulateDraft(
  season: SimSeason,
  config: DraftConfig,
  overrides: PointOverrides = {}
): DraftResult {
  const { numPlayers, picksPerPlayer, mode, manualPicks } = config
  const maxOwners = config.maxOwnersPerContestant ?? SIM_DEFAULTS.maxOwnersPerContestant
  const totalPicks = numPlayers * picksPerPlayer
  const totalSlots = season.castaways.length * maxOwners

  if (totalSlots < totalPicks) {
    throw new Error(
      `Not enough draft slots: ${season.castaways.length} castaways x ${maxOwners} max owners = ${totalSlots} slots, but need ${totalPicks} picks (${numPlayers} players x ${picksPerPlayer} picks)`
    )
  }

  const teams: Record<number, string[]> = {}
  for (let i = 0; i < numPlayers; i++) teams[i] = []

  const picks: Array<[number, number, number, string]> = []

  // Track how many times each castaway has been drafted
  const draftCount = new Map<string, number>()

  // Pre-compute castaway values for random drafting
  const castawayValues = new Map<string, number>()
  for (const c of season.castaways) {
    castawayValues.set(c.id, castawayTotalPoints(c.id, season.events, overrides))
  }

  // Generate snake draft order
  const draftOrder: number[] = []
  for (let round = 0; round < picksPerPlayer; round++) {
    const order =
      round % 2 === 0
        ? Array.from({ length: numPlayers }, (_, i) => i)
        : Array.from({ length: numPlayers }, (_, i) => numPlayers - 1 - i)
    draftOrder.push(...order)
  }

  for (let pickIdx = 0; pickIdx < draftOrder.length; pickIdx++) {
    const playerIdx = draftOrder[pickIdx]
    const round = Math.floor(pickIdx / numPlayers) + 1
    const pickInRound = (pickIdx % numPlayers) + 1
    const playerTeam = teams[playerIdx]

    let castawayId: string

    // Check for manual pick
    if (
      (mode === 'manual' || mode === 'hybrid') &&
      manualPicks?.[playerIdx] &&
      manualPicks[playerIdx].length > 0
    ) {
      const nextManual = manualPicks[playerIdx].find(
        (id) => !playerTeam.includes(id) && (draftCount.get(id) || 0) < maxOwners
      )
      if (nextManual) {
        castawayId = nextManual
      } else if (mode === 'manual') {
        throw new Error(`No more manual picks available for player ${playerIdx}`)
      } else {
        // Hybrid: fall back to random
        castawayId = pickRandom(season.castaways, draftCount, maxOwners, playerTeam, castawayValues)
      }
    } else if (mode === 'manual') {
      throw new Error(`No manual picks specified for player ${playerIdx}`)
    } else {
      castawayId = pickRandom(season.castaways, draftCount, maxOwners, playerTeam, castawayValues)
    }

    draftCount.set(castawayId, (draftCount.get(castawayId) || 0) + 1)
    teams[playerIdx].push(castawayId)
    picks.push([round, pickInRound, playerIdx, castawayId])
  }

  return { teams, picks }
}

/**
 * Weighted random pick. Higher-value castaways are more likely to be picked,
 * but noise ensures variety across simulations.
 *
 * A castaway is available if:
 * 1. They haven't reached maxOwners yet
 * 2. They aren't already on this player's team
 */
function pickRandom(
  castaways: SimSeason['castaways'],
  draftCount: Map<string, number>,
  maxOwners: number,
  playerTeam: string[],
  values: Map<string, number>
): string {
  const available = castaways.filter(
    (c) => (draftCount.get(c.id) || 0) < maxOwners && !playerTeam.includes(c.id)
  )
  if (available.length === 0) throw new Error('No castaways available to draft')

  // Add noise to simulate imperfect information
  const weights = available.map((c) => {
    const base = values.get(c.id) ?? 0
    const noise = (Math.random() - 0.5) * 20
    return Math.max(1, base + noise + 30) // +30 ensures no zero weights even for negative-value castaways
  })

  const totalWeight = weights.reduce((a, b) => a + b, 0)
  let roll = Math.random() * totalWeight

  for (let i = 0; i < available.length; i++) {
    roll -= weights[i]
    if (roll <= 0) return available[i].id
  }

  return available[available.length - 1].id
}
