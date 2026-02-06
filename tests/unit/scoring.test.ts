import { describe, it, expect } from 'vitest'
import {
  EVENT_POINTS,
  getEventPoints,
  calculateTotalPoints,
  calculatePointsByWeek,
  calculateContestantPoints,
  calculateTeamScore,
  getEventTypeLabel,
  validateEventPoints,
} from '@/lib/scoring'
import { EventType } from '@prisma/client'

describe('EVENT_POINTS', () => {
  it('should have correct points for challenge events', () => {
    expect(EVENT_POINTS.INDIVIDUAL_IMMUNITY_WIN).toBe(5)
    expect(EVENT_POINTS.REWARD_CHALLENGE_WIN).toBe(3)
    expect(EVENT_POINTS.TEAM_CHALLENGE_WIN).toBe(1)
  })

  it('should have correct points for strategy events', () => {
    expect(EVENT_POINTS.CORRECT_VOTE).toBe(2)
    expect(EVENT_POINTS.IDOL_PLAY_SUCCESS).toBe(5)
    expect(EVENT_POINTS.IDOL_FIND).toBe(3)
    expect(EVENT_POINTS.FIRE_MAKING_WIN).toBe(5)
  })

  it('should have correct points for social game events', () => {
    expect(EVENT_POINTS.ZERO_VOTES_RECEIVED).toBe(1)
    expect(EVENT_POINTS.SURVIVED_WITH_VOTES).toBe(2)
    expect(EVENT_POINTS.CAUSED_BLINDSIDE).toBe(2)
  })

  it('should have correct points for endgame events', () => {
    expect(EVENT_POINTS.MADE_JURY).toBe(5)
    expect(EVENT_POINTS.FINALIST).toBe(10)
    expect(EVENT_POINTS.WINNER).toBe(20)
  })

  it('should have correct negative points for deductions', () => {
    expect(EVENT_POINTS.VOTED_OUT_WITH_IDOL).toBe(-3)
    expect(EVENT_POINTS.QUIT).toBe(-10)
  })
})

describe('getEventPoints', () => {
  it('should return correct points for each event type', () => {
    expect(getEventPoints('INDIVIDUAL_IMMUNITY_WIN')).toBe(5)
    expect(getEventPoints('QUIT')).toBe(-10)
    expect(getEventPoints('WINNER')).toBe(20)
  })
})

describe('calculateTotalPoints', () => {
  it('should return 0 for empty array', () => {
    expect(calculateTotalPoints([])).toBe(0)
  })

  it('should sum only approved events', () => {
    const events = [
      { points: 5, isApproved: true },
      { points: 3, isApproved: true },
      { points: 2, isApproved: false }, // Should be ignored
    ]
    expect(calculateTotalPoints(events)).toBe(8)
  })

  it('should handle negative points correctly', () => {
    const events = [
      { points: 5, isApproved: true },
      { points: -3, isApproved: true },
    ]
    expect(calculateTotalPoints(events)).toBe(2)
  })

  it('should return 0 when all events are unapproved', () => {
    const events = [
      { points: 5, isApproved: false },
      { points: 3, isApproved: false },
    ]
    expect(calculateTotalPoints(events)).toBe(0)
  })
})

describe('calculatePointsByWeek', () => {
  it('should return empty object for empty array', () => {
    expect(calculatePointsByWeek([])).toEqual({})
  })

  it('should group points by week for approved events only', () => {
    const events = [
      { week: 1, points: 5, isApproved: true },
      { week: 1, points: 2, isApproved: true },
      { week: 2, points: 3, isApproved: true },
      { week: 2, points: 1, isApproved: false }, // Should be ignored
    ]
    expect(calculatePointsByWeek(events)).toEqual({ 1: 7, 2: 3 })
  })
})

describe('calculateContestantPoints', () => {
  it('should calculate total points for a contestant', () => {
    const events = [
      { points: 5, isApproved: true },
      { points: 2, isApproved: true },
      { points: 1, isApproved: true },
    ]
    expect(calculateContestantPoints(events)).toBe(8)
  })
})

describe('calculateTeamScore', () => {
  it('should return 0 for empty team', () => {
    expect(calculateTeamScore([])).toBe(0)
  })

  it('should sum points across all contestants', () => {
    const contestantEvents = [
      {
        contestantId: '1',
        events: [
          { points: 5, isApproved: true },
          { points: 2, isApproved: true },
        ],
      },
      {
        contestantId: '2',
        events: [
          { points: 3, isApproved: true },
          { points: 1, isApproved: true },
        ],
      },
    ]
    expect(calculateTeamScore(contestantEvents)).toBe(11)
  })
})

describe('getEventTypeLabel', () => {
  it('should return human-readable labels', () => {
    expect(getEventTypeLabel('INDIVIDUAL_IMMUNITY_WIN')).toBe('Individual Immunity Win')
    expect(getEventTypeLabel('IDOL_PLAY_SUCCESS')).toBe('Successful Idol Play')
    expect(getEventTypeLabel('VOTED_OUT_WITH_IDOL')).toBe('Voted Out with Idol')
  })
})

describe('validateEventPoints', () => {
  it('should return true for correct point values', () => {
    expect(validateEventPoints('INDIVIDUAL_IMMUNITY_WIN', 5)).toBe(true)
    expect(validateEventPoints('QUIT', -10)).toBe(true)
  })

  it('should return false for incorrect point values', () => {
    expect(validateEventPoints('INDIVIDUAL_IMMUNITY_WIN', 3)).toBe(false)
    expect(validateEventPoints('QUIT', 10)).toBe(false)
  })
})
