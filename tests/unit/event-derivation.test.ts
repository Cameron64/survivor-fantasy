import { describe, it, expect } from 'vitest'
import {
  normalizeTribalData,
  deriveEvents,
  type TribalCouncilData,
  type DerivedEvent,
} from '@/lib/event-derivation'
import { type GameSettings } from '@/lib/game-settings'

// Helper IDs (fake CUIDs matching the regex pattern)
const A = 'cabcdefghijklmnopqrstuvwx'
const B = 'cabcdefghijklmnopqrstuvwy'
const C = 'cabcdefghijklmnopqrstuvwz'
const D = 'cabcdefghijklmnopqrstuvwa'

/** Shorthand: derive tribal council events */
function deriveTribal(data: TribalCouncilData, gameSettings?: GameSettings): DerivedEvent[] {
  return deriveEvents('TRIBAL_COUNCIL', data, undefined, gameSettings)
}

// ============================================================================
// normalizeTribalData()
// ============================================================================

describe('normalizeTribalData', () => {
  it('converts old format (votes + idolPlayed) to new format', () => {
    const old = {
      attendees: [A, B, C],
      votes: { [A]: C, [B]: C },
      eliminated: C,
      idolPlayed: { by: A, successful: true },
      sentToJury: true,
      isBlindside: true,
      blindsideLeader: A,
    }

    const result = normalizeTribalData(old as unknown as Record<string, unknown>)

    expect(result.attendees).toEqual([A, B, C])
    expect(result.eliminated).toBe(C)
    expect(result.sentToJury).toBe(true)
    expect(result.eliminationMethod).toBe('vote')
    expect(result.voteRounds).toHaveLength(1)
    expect(result.voteRounds[0].votes).toEqual({ [A]: C, [B]: C })
    expect(result.idolPlays).toEqual([
      { playedBy: A, playedFor: A, successful: true },
    ])
    // Deprecated fields should NOT be on normalized output
    expect((result as Record<string, unknown>).isBlindside).toBeUndefined()
    expect((result as Record<string, unknown>).blindsideLeader).toBeUndefined()
    expect((result as Record<string, unknown>).votes).toBeUndefined()
    expect((result as Record<string, unknown>).idolPlayed).toBeUndefined()
  })

  it('handles votes: {} (empty object)', () => {
    const old = {
      attendees: [A, B],
      votes: {},
      eliminated: A,
      sentToJury: false,
    }
    const result = normalizeTribalData(old as unknown as Record<string, unknown>)
    expect(result.voteRounds).toEqual([{ votes: {} }])
  })

  it('handles idolPlayed: null', () => {
    const old = {
      attendees: [A, B],
      votes: { [A]: B },
      eliminated: B,
      idolPlayed: null,
      sentToJury: false,
    }
    const result = normalizeTribalData(old as unknown as Record<string, unknown>)
    expect(result.idolPlays).toEqual([])
  })

  it('handles missing idolPlayed (undefined)', () => {
    const old = {
      attendees: [A, B],
      votes: { [A]: B },
      eliminated: B,
      sentToJury: false,
    }
    const result = normalizeTribalData(old as unknown as Record<string, unknown>)
    expect(result.idolPlays).toEqual([])
  })

  it('handles missing sentToJury (defensive)', () => {
    const old = {
      attendees: [A, B],
      votes: { [A]: B },
      eliminated: B,
    }
    const result = normalizeTribalData(old as unknown as Record<string, unknown>)
    expect(result.sentToJury).toBe(false)
  })

  it('passes through already-normalized data unchanged', () => {
    const newFormat = {
      attendees: [A, B, C],
      voteRounds: [{ votes: { [A]: C, [B]: C } }],
      eliminated: C,
      eliminationMethod: 'vote',
      idolPlays: [{ playedBy: A, playedFor: B, successful: true }],
      sentToJury: true,
    }
    const result = normalizeTribalData(newFormat as unknown as Record<string, unknown>)
    expect(result.voteRounds).toEqual(newFormat.voteRounds)
    expect(result.idolPlays).toEqual(newFormat.idolPlays)
    expect(result.eliminationMethod).toBe('vote')
  })

  it('new-format data with deprecated votes also present -> voteRounds wins', () => {
    const mixed = {
      attendees: [A, B, C],
      votes: { [A]: B }, // deprecated, should be ignored
      voteRounds: [{ votes: { [A]: C, [B]: C } }],
      eliminated: C,
      eliminationMethod: 'vote',
      idolPlays: [],
      sentToJury: false,
    }
    const result = normalizeTribalData(mixed as unknown as Record<string, unknown>)
    expect(result.voteRounds[0].votes).toEqual({ [A]: C, [B]: C })
  })

  it('voteRounds: [] with eliminationMethod: default -> valid empty', () => {
    const data = {
      attendees: [A, B],
      voteRounds: [],
      eliminated: A,
      eliminationMethod: 'default',
      idolPlays: [],
      sentToJury: false,
    }
    const result = normalizeTribalData(data as unknown as Record<string, unknown>)
    expect(result.voteRounds).toEqual([])
    expect(result.eliminationMethod).toBe('default')
  })

  it('voteRounds: [] with eliminationMethod: vote -> normalized to [{ votes: {} }]', () => {
    const data = {
      attendees: [A, B],
      voteRounds: [],
      eliminated: A,
      eliminationMethod: 'vote',
      idolPlays: [],
      sentToJury: false,
    }
    const result = normalizeTribalData(data as unknown as Record<string, unknown>)
    expect(result.voteRounds).toEqual([{ votes: {} }])
  })

  it('eliminated player as voter in old data preserved through normalize', () => {
    const old = {
      attendees: [A, B, C],
      votes: { [A]: C, [B]: C, [C]: A },
      eliminated: C,
      sentToJury: false,
    }
    const result = normalizeTribalData(old as unknown as Record<string, unknown>)
    expect(result.voteRounds[0].votes[C]).toBe(A)
  })
})

// ============================================================================
// deriveTribalCouncil via deriveEvents('TRIBAL_COUNCIL', ...)
// ============================================================================

describe('deriveTribalCouncil', () => {
  it('standard vote-out: correct votes, zero votes, survived with votes', () => {
    const data: TribalCouncilData = {
      attendees: [A, B, C, D],
      votes: { [A]: D, [B]: D, [C]: A },
      eliminated: D,
      sentToJury: false,
    }
    const events = deriveTribal(data)

    const correctVotes = events.filter(e => e.type === 'CORRECT_VOTE')
    expect(correctVotes).toHaveLength(2)
    expect(correctVotes.map(e => e.contestantId).sort()).toEqual([A, B].sort())

    const survived = events.filter(e => e.type === 'SURVIVED_WITH_VOTES')
    expect(survived).toHaveLength(1)
    expect(survived[0].contestantId).toBe(A)

    const zeroVotes = events.filter(e => e.type === 'ZERO_VOTES_RECEIVED')
    expect(zeroVotes).toHaveLength(2)
    expect(zeroVotes.map(e => e.contestantId).sort()).toEqual([B, C].sort())
  })

  it('noVote: lost-vote player excluded from CORRECT_VOTE, still gets ZERO_VOTES_RECEIVED', () => {
    const data: TribalCouncilData = {
      attendees: [A, B, C, D],
      voteRounds: [{
        votes: { [A]: C, [B]: C },
        noVote: [D],
      }],
      eliminated: C,
      eliminationMethod: 'vote',
      idolPlays: [],
      sentToJury: false,
    }
    const events = deriveTribal(data)

    const correctVotes = events.filter(e => e.type === 'CORRECT_VOTE')
    expect(correctVotes).toHaveLength(2)
    expect(correctVotes.find(e => e.contestantId === D)).toBeUndefined()

    const zeroVotes = events.filter(e => e.type === 'ZERO_VOTES_RECEIVED')
    expect(zeroVotes.find(e => e.contestantId === D)).toBeDefined()
  })

  it('noVote + extraVotes on same player: extra votes still scored', () => {
    const data: TribalCouncilData = {
      attendees: [A, B, C, D],
      voteRounds: [{
        votes: { [A]: D, [B]: D },
        noVote: [C],
        extraVotes: [{ voterId: C, votedForId: D }],
      }],
      eliminated: D,
      eliminationMethod: 'vote',
      idolPlays: [],
      sentToJury: false,
    }
    const events = deriveTribal(data)

    const correctVotes = events.filter(e => e.type === 'CORRECT_VOTE')
    // A, B (regular) + C (extra vote, default extraVoteAwardsCorrectVote=true)
    expect(correctVotes).toHaveLength(3)
  })

  it('extra votes with extraVoteAwardsCorrectVote: true -> multiple CORRECT_VOTEs with distinct voteRounds', () => {
    const data: TribalCouncilData = {
      attendees: [A, B, C],
      voteRounds: [{
        votes: { [A]: C, [B]: C },
        extraVotes: [{ voterId: A, votedForId: C }],
      }],
      eliminated: C,
      eliminationMethod: 'vote',
      idolPlays: [],
      sentToJury: false,
    }
    const settings: GameSettings = { extraVoteAwardsCorrectVote: true }
    const events = deriveTribal(data, settings)

    const correctVotes = events.filter(e => e.type === 'CORRECT_VOTE')
    expect(correctVotes).toHaveLength(3) // A (regular), B (regular), A (extra)

    const aVotes = correctVotes.filter(e => e.contestantId === A)
    expect(aVotes).toHaveLength(2)
    expect(aVotes[0].voteRound).not.toBe(aVotes[1].voteRound)
  })

  it('extra votes with extraVoteAwardsCorrectVote: false -> no extra CORRECT_VOTE', () => {
    const data: TribalCouncilData = {
      attendees: [A, B, C],
      voteRounds: [{
        votes: { [A]: C, [B]: C },
        extraVotes: [{ voterId: A, votedForId: C }],
      }],
      eliminated: C,
      eliminationMethod: 'vote',
      idolPlays: [],
      sentToJury: false,
    }
    const settings: GameSettings = { extraVoteAwardsCorrectVote: false }
    const events = deriveTribal(data, settings)

    const correctVotes = events.filter(e => e.type === 'CORRECT_VOTE')
    expect(correctVotes).toHaveLength(2) // A + B regular only
  })

  it('voteRound uniqueness: all derived events have unique [contestantId, type, voteRound] tuples', () => {
    const data: TribalCouncilData = {
      attendees: [A, B, C, D],
      voteRounds: [{
        votes: { [A]: D, [B]: D },
        extraVotes: [
          { voterId: A, votedForId: D },
          { voterId: B, votedForId: D },
        ],
      }],
      eliminated: D,
      eliminationMethod: 'vote',
      idolPlays: [],
      sentToJury: true,
    }
    const events = deriveTribal(data)

    const keys = events.map(e => `${e.contestantId}:${e.type}:${e.voteRound}`)
    const uniqueKeys = new Set(keys)
    expect(uniqueKeys.size).toBe(keys.length)
  })

  it('voteRound overflow assertion: subIndex >= 100 throws', () => {
    const extraVotes = Array.from({ length: 100 }, () => ({
      voterId: A,
      votedForId: C,
    }))
    const data: TribalCouncilData = {
      attendees: [A, B, C],
      voteRounds: [{
        votes: { [B]: C },
        extraVotes,
      }],
      eliminated: C,
      eliminationMethod: 'vote',
      idolPlays: [],
      sentToJury: false,
    }
    expect(() => deriveTribal(data)).toThrow('voteRound subIndex overflow')
  })

  it('revote: scoring from decisive (last) round, ZERO_VOTES gated to eligibleTargets', () => {
    const data: TribalCouncilData = {
      attendees: [A, B, C, D],
      voteRounds: [
        { votes: { [A]: C, [B]: C, [C]: A, [D]: A } },
        {
          votes: { [B]: C, [D]: C },
          isRevote: true,
          eligibleVoters: [B, D],
          eligibleTargets: [A, C],
        },
      ],
      eliminated: C,
      eliminationMethod: 'revote',
      idolPlays: [],
      sentToJury: false,
    }
    const events = deriveTribal(data)

    const correctVotes = events.filter(e => e.type === 'CORRECT_VOTE')
    expect(correctVotes).toHaveLength(2)
    expect(correctVotes.map(e => e.contestantId).sort()).toEqual([B, D].sort())

    // Only A is in eligibleTargets and not eliminated
    const zeroVotes = events.filter(e => e.type === 'ZERO_VOTES_RECEIVED')
    expect(zeroVotes).toHaveLength(1)
    expect(zeroVotes[0].contestantId).toBe(A)

    // B and D not in eligibleTargets — no ZERO_VOTES for them
    expect(zeroVotes.find(e => e.contestantId === B)).toBeUndefined()
  })

  it('rock draw: no CORRECT_VOTE, MADE_JURY still emitted', () => {
    const data: TribalCouncilData = {
      attendees: [A, B, C, D],
      voteRounds: [
        { votes: { [A]: C, [B]: C, [C]: A, [D]: A } },
      ],
      eliminated: D,
      eliminationMethod: 'rock_draw',
      idolPlays: [],
      sentToJury: true,
    }
    const events = deriveTribal(data)

    expect(events.filter(e => e.type === 'CORRECT_VOTE')).toHaveLength(0)
    expect(events.filter(e => e.type === 'ZERO_VOTES_RECEIVED')).toHaveLength(0)
    expect(events.filter(e => e.type === 'SURVIVED_WITH_VOTES')).toHaveLength(0)

    const jury = events.filter(e => e.type === 'MADE_JURY')
    expect(jury).toHaveLength(1)
    expect(jury[0].contestantId).toBe(D)
  })

  it('multiple idol plays with distinct voteRound values', () => {
    const data: TribalCouncilData = {
      attendees: [A, B, C, D],
      voteRounds: [{ votes: { [A]: D, [B]: D, [C]: D } }],
      eliminated: D,
      eliminationMethod: 'vote',
      idolPlays: [
        { playedBy: A, playedFor: A, successful: false },
        { playedBy: B, playedFor: C, successful: true },
      ],
      sentToJury: false,
    }
    const events = deriveTribal(data)

    const idolEvents = events.filter(e => e.type === 'IDOL_PLAY_SUCCESS')
    expect(idolEvents).toHaveLength(1)
    expect(idolEvents[0].contestantId).toBe(B)
    expect(idolEvents[0].voteRound).toBe(1) // index 1 in idolPlays
  })

  it('idol played for another person: description mentions target', () => {
    const data: TribalCouncilData = {
      attendees: [A, B, C],
      voteRounds: [{ votes: { [A]: C, [B]: C } }],
      eliminated: C,
      eliminationMethod: 'vote',
      idolPlays: [
        { playedBy: A, playedFor: B, successful: true },
      ],
      sentToJury: false,
    }
    const events = deriveTribal(data)

    const idolEvent = events.find(e => e.type === 'IDOL_PLAY_SUCCESS')
    expect(idolEvent).toBeDefined()
    expect(idolEvent!.description).toContain('for another player')
  })

  it('shot in the dark: no scoring event either way', () => {
    const data: TribalCouncilData = {
      attendees: [A, B, C],
      voteRounds: [{
        votes: { [A]: C, [B]: C },
        noVote: [C],
        shotInTheDark: { playedBy: C, successful: false },
      }],
      eliminated: C,
      eliminationMethod: 'vote',
      idolPlays: [],
      sentToJury: false,
    }
    const events = deriveTribal(data)

    const correctVotes = events.filter(e => e.type === 'CORRECT_VOTE')
    expect(correctVotes).toHaveLength(2)
    // No SITD-specific event type exists
  })

  it('consensus elimination: MADE_JURY if sentToJury, no vote events', () => {
    const data: TribalCouncilData = {
      attendees: [A, B, C],
      voteRounds: [],
      eliminated: A,
      eliminationMethod: 'consensus',
      idolPlays: [],
      sentToJury: true,
    }
    const events = deriveTribal(data)

    expect(events.filter(e => e.type === 'CORRECT_VOTE')).toHaveLength(0)
    expect(events.filter(e => e.type === 'ZERO_VOTES_RECEIVED')).toHaveLength(0)

    const jury = events.filter(e => e.type === 'MADE_JURY')
    expect(jury).toHaveLength(1)
    expect(jury[0].contestantId).toBe(A)
  })

  it('determinism: identical input produces identical output', () => {
    const data: TribalCouncilData = {
      attendees: [A, B, C, D],
      voteRounds: [{
        votes: { [A]: D, [B]: D, [C]: A },
        extraVotes: [{ voterId: A, votedForId: D }],
      }],
      eliminated: D,
      eliminationMethod: 'vote',
      idolPlays: [{ playedBy: B, playedFor: B, successful: true }],
      sentToJury: true,
    }
    const result1 = deriveTribal(data)
    const result2 = deriveTribal(data)
    expect(result1).toEqual(result2)
  })

  it('every DerivedEvent has explicit numeric voteRound', () => {
    const data: TribalCouncilData = {
      attendees: [A, B, C],
      voteRounds: [{
        votes: { [A]: C, [B]: C },
        extraVotes: [{ voterId: A, votedForId: C }],
      }],
      eliminated: C,
      eliminationMethod: 'vote',
      idolPlays: [{ playedBy: A, playedFor: A, successful: true }],
      sentToJury: true,
    }
    const events = deriveTribal(data)
    for (const event of events) {
      expect(typeof event.voteRound).toBe('number')
      expect(event.voteRound).not.toBeNaN()
    }
  })

  it('old format backward compat: derives correctly from old-shape data', () => {
    const oldData = {
      attendees: [A, B, C],
      votes: { [A]: C, [B]: C },
      eliminated: C,
      idolPlayed: { by: A, successful: true },
      sentToJury: true,
    } as TribalCouncilData

    const events = deriveTribal(oldData)

    expect(events.filter(e => e.type === 'CORRECT_VOTE')).toHaveLength(2)
    expect(events.filter(e => e.type === 'IDOL_PLAY_SUCCESS')).toHaveLength(1)
    expect(events.filter(e => e.type === 'MADE_JURY')).toHaveLength(1)
  })
})

// ============================================================================
// Non-tribal derivation: voteRound = 0
// ============================================================================

describe('non-tribal derivation voteRound', () => {
  it('IMMUNITY_CHALLENGE', () => {
    const events = deriveEvents('IMMUNITY_CHALLENGE', { winner: A })
    expect(events.every(e => e.voteRound === 0)).toBe(true)
  })

  it('REWARD_CHALLENGE', () => {
    const events = deriveEvents('REWARD_CHALLENGE', { winners: [A, B], isTeamChallenge: false })
    expect(events.every(e => e.voteRound === 0)).toBe(true)
  })

  it('IDOL_FOUND', () => {
    const events = deriveEvents('IDOL_FOUND', { finder: A })
    expect(events[0].voteRound).toBe(0)
  })

  it('FIRE_MAKING', () => {
    const events = deriveEvents('FIRE_MAKING', { winner: A, loser: B })
    expect(events[0].voteRound).toBe(0)
  })

  it('QUIT_MEDEVAC', () => {
    const events = deriveEvents('QUIT_MEDEVAC', { contestant: A, reason: 'quit' })
    expect(events[0].voteRound).toBe(0)
  })

  it('ENDGAME', () => {
    const events = deriveEvents('ENDGAME', { finalists: [A, B, C], winner: A })
    expect(events.every(e => e.voteRound === 0)).toBe(true)
  })

  it('TRIBE_MERGE', () => {
    const events = deriveEvents('TRIBE_MERGE', {
      mergeTribeId: A,
      remainingContestants: [A, B, C],
      mergeWeek: 7,
      juryStartsThisWeek: false,
    })
    expect(events.every(e => e.voteRound === 0)).toBe(true)
  })
})
