import { describe, it, expect } from 'vitest'
import { gini, pearsonCorrelation, analyzeBalance } from '../engine/balance-analyzer'
import type { SimSeason, SimulationResult, DraftResult } from '../engine/types'

describe('balance-analyzer', () => {
  describe('gini', () => {
    it('returns 0 for perfectly equal values', () => {
      expect(gini([10, 10, 10, 10])).toBe(0)
    })

    it('returns high value for highly unequal values', () => {
      const result = gini([0, 0, 0, 100])
      expect(result).toBeGreaterThan(0.5)
    })

    it('returns 0 for empty array', () => {
      expect(gini([])).toBe(0)
    })

    it('returns value between 0 and 1', () => {
      const result = gini([1, 5, 10, 20, 50])
      expect(result).toBeGreaterThanOrEqual(0)
      expect(result).toBeLessThanOrEqual(1)
    })
  })

  describe('pearsonCorrelation', () => {
    it('returns 1 for perfectly correlated data', () => {
      expect(pearsonCorrelation([1, 2, 3, 4, 5], [2, 4, 6, 8, 10])).toBe(1)
    })

    it('returns -1 for perfectly anti-correlated data', () => {
      expect(pearsonCorrelation([1, 2, 3, 4, 5], [10, 8, 6, 4, 2])).toBe(-1)
    })

    it('returns 0 for uncorrelated data', () => {
      // symmetric around mean
      const result = pearsonCorrelation([1, 2, 3, 4, 5], [5, 3, 1, 3, 5])
      expect(Math.abs(result)).toBeLessThan(0.2)
    })

    it('returns 0 for arrays shorter than 2', () => {
      expect(pearsonCorrelation([1], [2])).toBe(0)
    })
  })

  describe('analyzeBalance', () => {
    const testSeason: SimSeason = {
      season: 1,
      name: 'Test',
      numCastaways: 4,
      numEpisodes: 10,
      castaways: [
        { id: 'C1', name: 'A', tribe: 'T', placement: 1, isJury: false, isFinalist: true, isWinner: true },
        { id: 'C2', name: 'B', tribe: 'T', placement: 2, isJury: false, isFinalist: true, isWinner: false },
        { id: 'C3', name: 'C', tribe: 'T', placement: 3, isJury: true, isFinalist: false, isWinner: false },
        { id: 'C4', name: 'D', tribe: 'T', placement: 4, isJury: false, isFinalist: false, isWinner: false },
      ],
      events: [
        { type: 'WINNER', castawayId: 'C1', episode: 10, points: 20, description: '' },
        { type: 'FINALIST', castawayId: 'C1', episode: 10, points: 10, description: '' },
        { type: 'FINALIST', castawayId: 'C2', episode: 10, points: 10, description: '' },
        { type: 'MADE_JURY', castawayId: 'C3', episode: 8, points: 5, description: '' },
        { type: 'CORRECT_VOTE', castawayId: 'C1', episode: 5, points: 2, description: '' },
        { type: 'CORRECT_VOTE', castawayId: 'C2', episode: 5, points: 2, description: '' },
      ],
      }

    const draft: DraftResult = {
      teams: { 0: ['C1', 'C4'], 1: ['C2', 'C3'] },
      picks: [],
    }

    const result: SimulationResult = {
      season: 1,
      draft,
      scores: [
        {
          playerIndex: 0,
          totalScore: 32,
          castaways: [
            { id: 'C1', name: 'A', score: 32, eventBreakdown: { WINNER: 20, FINALIST: 10, CORRECT_VOTE: 2 } },
            { id: 'C4', name: 'D', score: 0, eventBreakdown: {} },
          ],
          scoreByEpisode: { 10: 30, 5: 2 },
        },
        {
          playerIndex: 1,
          totalScore: 17,
          castaways: [
            { id: 'C2', name: 'B', score: 12, eventBreakdown: { FINALIST: 10, CORRECT_VOTE: 2 } },
            { id: 'C3', name: 'C', score: 5, eventBreakdown: { MADE_JURY: 5 } },
          ],
          scoreByEpisode: { 10: 10, 5: 2, 8: 5 },
        },
      ],
      rankings: [0, 1],
    }

    it('computes gini coefficient', () => {
      const metrics = analyzeBalance(testSeason, result)
      expect(metrics.gini).toBeGreaterThan(0)
      expect(metrics.gini).toBeLessThan(1)
    })

    it('computes spread as max - min team score', () => {
      const metrics = analyzeBalance(testSeason, result)
      expect(metrics.spread).toBe(32 - 17)
    })

    it('computes event contribution as fractions summing to ~1', () => {
      const metrics = analyzeBalance(testSeason, result)
      const total = Object.values(metrics.eventContribution).reduce((a, b) => a + b, 0)
      expect(total).toBeCloseTo(1, 1)
    })

    it('computes positive winner advantage', () => {
      const metrics = analyzeBalance(testSeason, result)
      expect(metrics.winnerAdvantage).toBeGreaterThan(0)
    })

    it('computes longevity correlation', () => {
      const metrics = analyzeBalance(testSeason, result)
      // Higher placement (lasted longer) should correlate with higher points
      expect(metrics.longevityCorrelation).toBeGreaterThan(0)
    })
  })
})
