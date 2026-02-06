import { describe, it, expect } from 'vitest'
import { simulateDraft } from '../engine/draft-simulator'
import type { SimSeason, DraftConfig } from '../engine/types'

function makeSeason(numCastaways: number): SimSeason {
  return {
    season: 1,
    name: 'Test Season',
    numCastaways,
    numEpisodes: 13,
    castaways: Array.from({ length: numCastaways }, (_, i) => ({
      id: `C${i + 1}`,
      name: `Castaway ${i + 1}`,
      tribe: i < numCastaways / 2 ? 'TribeA' : 'TribeB',
      placement: numCastaways - i,
      isJury: i < numCastaways / 2,
      isFinalist: i < 3,
      isWinner: i === 0,
    })),
    events: [
      { type: 'WINNER', castawayId: 'C1', episode: 13, points: 20, description: 'Won' },
      { type: 'FINALIST', castawayId: 'C1', episode: 13, points: 10, description: 'Finalist' },
      { type: 'FINALIST', castawayId: 'C2', episode: 13, points: 10, description: 'Finalist' },
      { type: 'MADE_JURY', castawayId: 'C4', episode: 10, points: 5, description: 'Jury' },
      { type: 'INDIVIDUAL_IMMUNITY_WIN', castawayId: 'C1', episode: 8, points: 5, description: 'Win' },
    ],
  }
}

describe('draft-simulator', () => {
  it('drafts the correct number of picks per player', () => {
    const season = makeSeason(20)
    const config: DraftConfig = { numPlayers: 4, picksPerPlayer: 2, mode: 'random' }
    const result = simulateDraft(season, config)

    for (let i = 0; i < 4; i++) {
      expect(result.teams[i]).toHaveLength(2)
    }
  })

  it('total picks equals numPlayers * picksPerPlayer', () => {
    const season = makeSeason(20)
    const config: DraftConfig = { numPlayers: 5, picksPerPlayer: 3, mode: 'random' }
    const result = simulateDraft(season, config)

    expect(result.picks).toHaveLength(15)
  })

  it('with maxOwners=1, no castaway is drafted twice', () => {
    const season = makeSeason(20)
    const config: DraftConfig = { numPlayers: 5, picksPerPlayer: 3, mode: 'random', maxOwnersPerContestant: 1 }
    const result = simulateDraft(season, config)

    const allDrafted = result.picks.map(([, , , id]) => id)
    expect(new Set(allDrafted).size).toBe(allDrafted.length)
  })

  it('with maxOwners=2, a castaway can appear on two different teams', () => {
    // 10 castaways, 20 players x 1 pick = 20 picks. Need maxOwners=2.
    const season = makeSeason(10)
    const config: DraftConfig = { numPlayers: 20, picksPerPlayer: 1, mode: 'random', maxOwnersPerContestant: 2 }
    const result = simulateDraft(season, config)

    expect(result.picks).toHaveLength(20)
    // Each castaway should be drafted exactly 2 times
    const counts = new Map<string, number>()
    for (const [, , , id] of result.picks) {
      counts.set(id, (counts.get(id) || 0) + 1)
    }
    for (const count of Array.from(counts.values())) {
      expect(count).toBeLessThanOrEqual(2)
    }
  })

  it('a player cannot draft the same castaway twice', () => {
    // 5 castaways, 2 players x 4 picks = 8. maxOwners=2 allows 10 slots.
    const season = makeSeason(5)
    const config: DraftConfig = { numPlayers: 2, picksPerPlayer: 4, mode: 'random', maxOwnersPerContestant: 2 }
    const result = simulateDraft(season, config)

    for (let i = 0; i < 2; i++) {
      const team = result.teams[i]
      expect(new Set(team).size).toBe(team.length)
    }
  })

  it('default maxOwners is 2 (from SIM_DEFAULTS)', () => {
    // 18 castaways x 2 max owners = 36 slots. 10 players x 2 picks = 20. Plenty of room.
    const season = makeSeason(18)
    const config: DraftConfig = { numPlayers: 10, picksPerPlayer: 2, mode: 'random' }
    const result = simulateDraft(season, config)

    expect(result.picks).toHaveLength(20)
    // Verify some castaways can be shared (at least one drafted twice)
    const counts = new Map<string, number>()
    for (const [, , , id] of result.picks) {
      counts.set(id, (counts.get(id) || 0) + 1)
    }
    for (const count of Array.from(counts.values())) {
      expect(count).toBeLessThanOrEqual(2)
    }
  })

  it('all drafted castaways exist in the season', () => {
    const season = makeSeason(20)
    const config: DraftConfig = { numPlayers: 4, picksPerPlayer: 2, mode: 'random' }
    const result = simulateDraft(season, config)

    const validIds = new Set(season.castaways.map((c) => c.id))
    for (const [, , , id] of result.picks) {
      expect(validIds.has(id)).toBe(true)
    }
  })

  it('throws when not enough draft slots', () => {
    const season = makeSeason(5)
    // 5 castaways x 1 max owner = 5 slots, but need 6 picks
    const config: DraftConfig = { numPlayers: 3, picksPerPlayer: 2, mode: 'random', maxOwnersPerContestant: 1 }
    expect(() => simulateDraft(season, config)).toThrow('Not enough draft slots')
  })

  it('manual mode drafts specified picks', () => {
    const season = makeSeason(20)
    const config: DraftConfig = {
      numPlayers: 2,
      picksPerPlayer: 2,
      mode: 'manual',
      manualPicks: {
        0: ['C1', 'C2'],
        1: ['C3', 'C4'],
      },
    }
    const result = simulateDraft(season, config)

    expect(result.teams[0]).toContain('C1')
    expect(result.teams[0]).toContain('C2')
    expect(result.teams[1]).toContain('C3')
    expect(result.teams[1]).toContain('C4')
  })

  it('manual mode allows shared picks across players', () => {
    const season = makeSeason(20)
    const config: DraftConfig = {
      numPlayers: 2,
      picksPerPlayer: 1,
      mode: 'manual',
      maxOwnersPerContestant: 2,
      manualPicks: {
        0: ['C1'],
        1: ['C1'],
      },
    }
    const result = simulateDraft(season, config)

    expect(result.teams[0]).toContain('C1')
    expect(result.teams[1]).toContain('C1')
  })

  it('snake draft reverses order in even rounds', () => {
    const season = makeSeason(20)
    const config: DraftConfig = { numPlayers: 3, picksPerPlayer: 2, mode: 'random' }
    const result = simulateDraft(season, config)

    // Round 1: 0, 1, 2
    expect(result.picks[0][2]).toBe(0)
    expect(result.picks[1][2]).toBe(1)
    expect(result.picks[2][2]).toBe(2)

    // Round 2 (snake): 2, 1, 0
    expect(result.picks[3][2]).toBe(2)
    expect(result.picks[4][2]).toBe(1)
    expect(result.picks[5][2]).toBe(0)
  })
})
