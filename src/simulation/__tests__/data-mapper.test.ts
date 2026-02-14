import { describe, it, expect } from 'vitest'
import { mapSeasonEvents, BASE_EVENT_POINTS } from '../engine/data-mapper'
import type {
  RawVoteHistory,
  RawChallengeResult,
  RawAdvantageMovement,
  RawCastaway,
  RawBootMapping,
} from '../engine/types'

function makeInput(overrides: {
  voteHistory?: RawVoteHistory[]
  challengeResults?: RawChallengeResult[]
  advantageMovement?: RawAdvantageMovement[]
  castaways?: RawCastaway[]
  bootMapping?: RawBootMapping[]
}) {
  return {
    season: 1,
    voteHistory: overrides.voteHistory ?? [],
    challengeResults: overrides.challengeResults ?? [],
    advantageMovement: overrides.advantageMovement ?? [],
    castaways: overrides.castaways ?? [],
    bootMapping: overrides.bootMapping ?? [],
  }
}

describe('data-mapper', () => {
  describe('BASE_EVENT_POINTS', () => {
    it('has 15 event types', () => {
      expect(Object.keys(BASE_EVENT_POINTS)).toHaveLength(15)
    })

    it('WINNER is worth 20 points', () => {
      expect(BASE_EVENT_POINTS.WINNER).toBe(20)
    })

    it('QUIT is worth -10 points', () => {
      expect(BASE_EVENT_POINTS.QUIT).toBe(-10)
    })
  })

  describe('mapSeasonEvents', () => {
    it('returns warning about CAUSED_BLINDSIDE', () => {
      const { warnings } = mapSeasonEvents(makeInput({}))
      expect(warnings).toHaveLength(1)
      expect(warnings[0]).toContain('CAUSED_BLINDSIDE')
    })

    it('maps CORRECT_VOTE when voter target matches voted-out person', () => {
      const { events } = mapSeasonEvents(
        makeInput({
          voteHistory: [
            {
              season: 1,
              episode: 1,
              tribe_status: 'Original',
              castaway: 'Alice',
              castaway_id: 'A1',
              vote: 'Bob',
              vote_id: 'B1',
              voted_out: 'Bob',
              voted_out_id: 'B1',
              nullified: false,
              vote_event: 'Tribal Council',
            },
          ],
        })
      )

      const correctVotes = events.filter((e) => e.type === 'CORRECT_VOTE')
      expect(correctVotes).toHaveLength(1)
      expect(correctVotes[0].castawayId).toBe('A1')
    })

    it('does not map CORRECT_VOTE when vote is nullified', () => {
      const { events } = mapSeasonEvents(
        makeInput({
          voteHistory: [
            {
              season: 1,
              episode: 1,
              tribe_status: 'Original',
              castaway: 'Alice',
              castaway_id: 'A1',
              vote: 'Bob',
              vote_id: 'B1',
              voted_out: 'Bob',
              voted_out_id: 'B1',
              nullified: true,
              vote_event: 'Tribal Council',
            },
          ],
        })
      )

      const correctVotes = events.filter((e) => e.type === 'CORRECT_VOTE')
      expect(correctVotes).toHaveLength(0)
    })

    it('maps ZERO_VOTES_RECEIVED for attendees with no votes', () => {
      const { events } = mapSeasonEvents(
        makeInput({
          voteHistory: [
            {
              season: 1,
              episode: 1,
              tribe_status: 'Original',
              castaway: 'Alice',
              castaway_id: 'A1',
              vote: 'Bob',
              vote_id: 'B1',
              voted_out: 'Bob',
              voted_out_id: 'B1',
              nullified: false,
              vote_event: 'Tribal Council',
            },
          ],
        })
      )

      const zeroVotes = events.filter((e) => e.type === 'ZERO_VOTES_RECEIVED')
      expect(zeroVotes).toHaveLength(1)
      expect(zeroVotes[0].castawayId).toBe('A1')
    })

    it('maps SURVIVED_WITH_VOTES for non-eliminated players who received votes', () => {
      const { events } = mapSeasonEvents(
        makeInput({
          voteHistory: [
            {
              season: 1,
              episode: 1,
              tribe_status: 'Original',
              castaway: 'Alice',
              castaway_id: 'A1',
              vote: 'Charlie',
              vote_id: 'C1',
              voted_out: 'Bob',
              voted_out_id: 'B1',
              nullified: false,
              vote_event: 'Tribal Council',
            },
            {
              season: 1,
              episode: 1,
              tribe_status: 'Original',
              castaway: 'Bob',
              castaway_id: 'B1',
              vote: 'Charlie',
              vote_id: 'C1',
              voted_out: 'Bob',
              voted_out_id: 'B1',
              nullified: false,
              vote_event: 'Tribal Council',
            },
            {
              season: 1,
              episode: 1,
              tribe_status: 'Original',
              castaway: 'Charlie',
              castaway_id: 'C1',
              vote: 'Bob',
              vote_id: 'B1',
              voted_out: 'Bob',
              voted_out_id: 'B1',
              nullified: false,
              vote_event: 'Tribal Council',
            },
          ],
        })
      )

      const survived = events.filter((e) => e.type === 'SURVIVED_WITH_VOTES')
      expect(survived).toHaveLength(1)
      expect(survived[0].castawayId).toBe('C1')
    })

    it('maps INDIVIDUAL_IMMUNITY_WIN for individual immunity challenges', () => {
      const { events } = mapSeasonEvents(
        makeInput({
          challengeResults: [
            {
              season: 1,
              episode: 5,
              castaway: 'Alice',
              castaway_id: 'A1',
              challenge_type: 'Immunity',
              outcome_type: 'Individual',
              result: 'Won',
              tribe: 'Tribe1',
              won_individual_immunity: 1,
              won_individual_reward: 0,
            },
          ],
        })
      )

      const wins = events.filter((e) => e.type === 'INDIVIDUAL_IMMUNITY_WIN')
      expect(wins).toHaveLength(1)
      expect(wins[0].castawayId).toBe('A1')
    })

    it('does not map challenges that were not won', () => {
      const { events } = mapSeasonEvents(
        makeInput({
          challengeResults: [
            {
              season: 1,
              episode: 5,
              castaway: 'Alice',
              castaway_id: 'A1',
              challenge_type: 'Immunity',
              outcome_type: 'Individual',
              result: 'Lost',
              tribe: 'Tribe1',
              won_individual_immunity: 0,
              won_individual_reward: 0,
            },
          ],
        })
      )

      expect(events.filter((e) => e.type === 'INDIVIDUAL_IMMUNITY_WIN')).toHaveLength(0)
    })

    it('maps IDOL_FIND and IDOL_PLAY_SUCCESS', () => {
      const { events } = mapSeasonEvents(
        makeInput({
          advantageMovement: [
            {
              season: 1,
              episode: 3,
              castaway: 'Alice',
              castaway_id: 'A1',
              advantage_type: 'Hidden Immunity Idol',
              event: 'Found',
            },
            {
              season: 1,
              episode: 6,
              castaway: 'Alice',
              castaway_id: 'A1',
              advantage_type: 'Hidden Immunity Idol',
              event: 'Played',
              votes_nullified: 3,
            },
          ],
        })
      )

      expect(events.filter((e) => e.type === 'IDOL_FIND')).toHaveLength(1)
      expect(events.filter((e) => e.type === 'IDOL_PLAY_SUCCESS')).toHaveLength(1)
    })

    it('maps WINNER, FINALIST, MADE_JURY from castaways', () => {
      const { events } = mapSeasonEvents(
        makeInput({
          castaways: [
            {
              season: 1,
              castaway: 'Alice',
              castaway_id: 'A1',
              tribe: 'T1',
              placement: 1,
              jury: false,
              finalist: true,
              result: 'Sole Survivor',
            },
            {
              season: 1,
              castaway: 'Bob',
              castaway_id: 'B1',
              tribe: 'T1',
              placement: 5,
              jury: true,
              finalist: false,
              result: 'Voted Out',
            },
          ],
        })
      )

      expect(events.filter((e) => e.type === 'WINNER')).toHaveLength(1)
      expect(events.filter((e) => e.type === 'FINALIST')).toHaveLength(1)
      expect(events.filter((e) => e.type === 'MADE_JURY')).toHaveLength(1)
      expect(events.find((e) => e.type === 'WINNER')!.castawayId).toBe('A1')
      expect(events.find((e) => e.type === 'MADE_JURY')!.castawayId).toBe('B1')
    })

    it('maps QUIT when result contains Quit', () => {
      const { events } = mapSeasonEvents(
        makeInput({
          castaways: [
            {
              season: 1,
              castaway: 'Bob',
              castaway_id: 'B1',
              tribe: 'T1',
              placement: 10,
              jury: false,
              finalist: false,
              result: 'Quit',
            },
          ],
        })
      )

      expect(events.filter((e) => e.type === 'QUIT')).toHaveLength(1)
    })

    it('ignores events from other seasons', () => {
      const { events } = mapSeasonEvents(
        makeInput({
          challengeResults: [
            {
              season: 2,
              episode: 5,
              castaway: 'Alice',
              castaway_id: 'A1',
              challenge_type: 'Individual Immunity',
              result: 'Won',
              tribe: 'Tribe1',
            },
          ],
        })
      )

      expect(events).toHaveLength(0)
    })
  })
})
