import { describe, it, expect } from 'vitest'
import { calculateScores, calculateCastawayScores } from '../engine/score-calculator'
import type { SimSeason, DraftResult } from '../engine/types'

const testSeason: SimSeason = {
  season: 1,
  name: 'Test Season',
  numCastaways: 6,
  numEpisodes: 10,
  castaways: [
    { id: 'C1', name: 'Alice', tribe: 'T1', placement: 1, isJury: false, isFinalist: true, isWinner: true },
    { id: 'C2', name: 'Bob', tribe: 'T1', placement: 2, isJury: false, isFinalist: true, isWinner: false },
    { id: 'C3', name: 'Charlie', tribe: 'T2', placement: 3, isJury: true, isFinalist: false, isWinner: false },
    { id: 'C4', name: 'Diana', tribe: 'T2', placement: 4, isJury: true, isFinalist: false, isWinner: false },
    { id: 'C5', name: 'Eve', tribe: 'T1', placement: 5, isJury: true, isFinalist: false, isWinner: false },
    { id: 'C6', name: 'Frank', tribe: 'T2', placement: 6, isJury: false, isFinalist: false, isWinner: false },
  ],
  events: [
    { type: 'WINNER', castawayId: 'C1', episode: 10, points: 20, description: '' },
    { type: 'FINALIST', castawayId: 'C1', episode: 10, points: 10, description: '' },
    { type: 'FINALIST', castawayId: 'C2', episode: 10, points: 10, description: '' },
    { type: 'INDIVIDUAL_IMMUNITY_WIN', castawayId: 'C1', episode: 7, points: 5, description: '' },
    { type: 'INDIVIDUAL_IMMUNITY_WIN', castawayId: 'C1', episode: 9, points: 5, description: '' },
    { type: 'MADE_JURY', castawayId: 'C3', episode: 8, points: 5, description: '' },
    { type: 'CORRECT_VOTE', castawayId: 'C2', episode: 3, points: 2, description: '' },
    { type: 'CORRECT_VOTE', castawayId: 'C3', episode: 3, points: 2, description: '' },
    { type: 'IDOL_FIND', castawayId: 'C4', episode: 4, points: 3, description: '' },
    { type: 'QUIT', castawayId: 'C6', episode: 5, points: -10, description: '' },
  ],
}

describe('score-calculator', () => {
  describe('calculateScores', () => {
    it('computes correct team totals', () => {
      const draft: DraftResult = {
        teams: { 0: ['C1', 'C3'], 1: ['C2', 'C4'] },
        picks: [],
      }

      const result = calculateScores(testSeason, draft)

      // Player 0: Alice (20+10+5+5=40) + Charlie (5+2=7) = 47
      const p0 = result.scores.find((s) => s.playerIndex === 0)!
      expect(p0.totalScore).toBe(47)

      // Player 1: Bob (10+2=12) + Diana (3) = 15
      const p1 = result.scores.find((s) => s.playerIndex === 1)!
      expect(p1.totalScore).toBe(15)
    })

    it('ranks players by total score descending', () => {
      const draft: DraftResult = {
        teams: { 0: ['C1', 'C3'], 1: ['C2', 'C4'] },
        picks: [],
      }

      const result = calculateScores(testSeason, draft)
      expect(result.rankings[0]).toBe(0) // Player 0 has 47
      expect(result.rankings[1]).toBe(1) // Player 1 has 15
    })

    it('provides per-castaway event breakdown', () => {
      const draft: DraftResult = {
        teams: { 0: ['C1'], 1: ['C6'] },
        picks: [],
      }

      const result = calculateScores(testSeason, draft)
      const alice = result.scores[0].castaways[0]
      expect(alice.eventBreakdown.WINNER).toBe(20)
      expect(alice.eventBreakdown.FINALIST).toBe(10)
      expect(alice.eventBreakdown.INDIVIDUAL_IMMUNITY_WIN).toBe(10)

      const frank = result.scores[1].castaways[0]
      expect(frank.eventBreakdown.QUIT).toBe(-10)
    })

    it('supports point overrides', () => {
      const draft: DraftResult = {
        teams: { 0: ['C1'] },
        picks: [],
      }

      const result = calculateScores(testSeason, draft, { WINNER: 30 })
      const alice = result.scores[0].castaways[0]
      // WINNER: 30 + FINALIST: 10 + 2x INDIVIDUAL_IMMUNITY_WIN: 10 = 50
      expect(alice.score).toBe(50)
    })

    it('provides score by episode', () => {
      const draft: DraftResult = {
        teams: { 0: ['C1'] },
        picks: [],
      }

      const result = calculateScores(testSeason, draft)
      const p0 = result.scores[0]
      expect(p0.scoreByEpisode[10]).toBe(30) // WINNER + FINALIST
      expect(p0.scoreByEpisode[7]).toBe(5) // Immunity
      expect(p0.scoreByEpisode[9]).toBe(5) // Immunity
    })
  })

  describe('calculateCastawayScores', () => {
    it('returns scores for all castaways sorted by point value', () => {
      const scores = calculateCastawayScores(testSeason)
      expect(scores).toHaveLength(6)
    })

    it('Alice has the highest score (winner)', () => {
      const scores = calculateCastawayScores(testSeason)
      const alice = scores.find((s) => s.name === 'Alice')!
      // WINNER:20 + FINALIST:10 + 2x IIC:10 = 40
      expect(alice.totalPoints).toBe(40)
    })

    it('Frank has negative score (quit)', () => {
      const scores = calculateCastawayScores(testSeason)
      const frank = scores.find((s) => s.name === 'Frank')!
      expect(frank.totalPoints).toBe(-10)
    })

    it('respects point overrides', () => {
      const scores = calculateCastawayScores(testSeason, { WINNER: 50 })
      const alice = scores.find((s) => s.name === 'Alice')!
      // WINNER:50 + FINALIST:10 + 2x IIC:10 = 70
      expect(alice.totalPoints).toBe(70)
    })
  })
})
