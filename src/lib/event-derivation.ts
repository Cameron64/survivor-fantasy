import { EventType, GameEventType } from '@prisma/client'
import { getEventPoints } from './scoring'
import { type GameSettings, DEFAULT_GAME_SETTINGS } from './game-settings'

/**
 * A derived scoring event ready to be created in the database.
 * Every event MUST have an explicit voteRound (never undefined).
 */
export interface DerivedEvent {
  type: EventType
  contestantId: string
  points: number
  description?: string
  voteRound: number
}

// --- Data shapes for each GameEventType ---

export interface IdolPlay {
  playedBy: string       // who played it
  playedFor: string      // who it protects (can be self)
  successful: boolean
}

export interface ShotInTheDark {
  playedBy: string       // who played it
  successful: boolean    // true = safe (immunity), false = just lost their vote
}

export interface VoteRound {
  votes: Record<string, string>                          // voterId -> votedForId
  noVote?: string[]                                      // can't vote (lost vote, blocked, SITD)
  extraVotes?: Array<{ voterId: string; votedForId: string }>  // additional votes
  shotInTheDark?: ShotInTheDark
  isRevote?: boolean
  eligibleVoters?: string[]   // revote: restricted voter pool
  eligibleTargets?: string[]  // revote: restricted target pool
}

export type EliminationMethod = 'vote' | 'revote' | 'rock_draw' | 'default' | 'consensus'

/**
 * Tribal council data as stored in GameEvent.data JSON.
 * Fields may be in old format (votes, idolPlayed) or new format (voteRounds, idolPlays).
 * Always call normalizeTribalData() before reading — it returns NormalizedTribalData
 * with all required fields guaranteed.
 */
export interface TribalCouncilData {
  attendees: string[]
  eliminated: string          // ALWAYS top-level, both old and new format
  sentToJury: boolean
  // New format fields (present after normalization or from new submissions)
  voteRounds?: VoteRound[]
  eliminationMethod?: EliminationMethod
  idolPlays?: IdolPlay[]
  // Deprecated - kept for backward compat with existing GameEvent data
  votes?: Record<string, string>
  idolPlayed?: { by: string; successful: boolean } | null
  isBlindside?: boolean
  blindsideLeader?: string
}

/**
 * Fully normalized tribal council data. All fields guaranteed present.
 * Produced by normalizeTribalData().
 */
export interface NormalizedTribalData {
  attendees: string[]
  voteRounds: VoteRound[]
  eliminated: string
  eliminationMethod: EliminationMethod
  idolPlays: IdolPlay[]
  sentToJury: boolean
}

/**
 * Normalize tribal council data from any format (old or new) into the canonical shape.
 * This is the ONLY way to safely access TribalCouncilData fields.
 * Must be called before reading any field from stored tribal council JSON.
 */
export function normalizeTribalData(raw: Record<string, unknown>): NormalizedTribalData {
  const data = raw as Partial<TribalCouncilData>

  // Determine attendees (always top-level)
  const attendees = (data.attendees ?? []) as string[]
  const eliminated = (data.eliminated ?? '') as string
  const sentToJury = (data.sentToJury ?? false) as boolean

  // Determine eliminationMethod
  const eliminationMethod = (data.eliminationMethod ?? 'vote') as EliminationMethod

  // Normalize voteRounds
  let voteRounds: VoteRound[]
  if (data.voteRounds && Array.isArray(data.voteRounds) && data.voteRounds.length > 0) {
    // New format — use as-is
    voteRounds = data.voteRounds
  } else if (data.votes && typeof data.votes === 'object') {
    // Old format — wrap single votes object into a VoteRound
    voteRounds = [{ votes: data.votes as Record<string, string> }]
  } else if (Array.isArray(data.voteRounds) && data.voteRounds.length === 0) {
    // Empty array — valid for non-vote eliminations, defensive normalize for 'vote'
    if (eliminationMethod === 'vote') {
      voteRounds = [{ votes: {} }]
    } else {
      voteRounds = []
    }
  } else {
    // No vote data at all
    voteRounds = [{ votes: {} }]
  }

  // Normalize idolPlays
  let idolPlays: IdolPlay[]
  if (data.idolPlays && Array.isArray(data.idolPlays)) {
    idolPlays = data.idolPlays
  } else if (data.idolPlayed && typeof data.idolPlayed === 'object') {
    const old = data.idolPlayed as { by: string; successful: boolean }
    idolPlays = [{ playedBy: old.by, playedFor: old.by, successful: old.successful }]
  } else {
    idolPlays = []
  }

  return {
    attendees,
    voteRounds,
    eliminated,
    eliminationMethod,
    idolPlays,
    sentToJury,
  }
}

export interface ChallengeGroup {
  id: string // "A", "B"
  label: string // "Orange Team", "Purple Team"
  memberIds: string[]
}

export interface ImmunityChallengeData {
  winner?: string // contestant ID (individual)
  winners?: string[] // contestant IDs (team)
  isTeamChallenge?: boolean
  tribeNames?: string[] // winning tribe name(s) when isTeamChallenge
  // grouped path for merge transition temporary teams
  challengeGroups?: ChallengeGroup[]
  winningGroupIds?: string[]
}

export interface RewardChallengeData {
  winners: string[] // contestant IDs
  isTeamChallenge: boolean
  tribeNames?: string[] // winning tribe name(s) when isTeamChallenge
}

export interface IdolFoundData {
  finder: string // contestant ID
}

export interface FireMakingData {
  winner: string // contestant ID
  loser: string // contestant ID
}

export interface QuitMedevacData {
  contestant: string // contestant ID
  reason: 'quit' | 'medevac'
}

export interface EndgameData {
  finalists: string[] // contestant IDs
  winner: string // contestant ID
}

export interface TribeMergeData {
  mergeTribeId: string
  remainingContestants: string[] // contestant IDs
  mergeWeek: number
  juryStartsThisWeek: boolean
}

export interface TribeSwapData {
  mode: 'SWAP' | 'DISSOLUTION' | 'EXPANSION'
  moves: Array<{
    contestantId: string
    fromTribeId: string
    toTribeId: string
  }>
  swapWeek: number
  dissolvedTribeId?: string
}

export type GameEventData =
  | TribalCouncilData
  | ImmunityChallengeData
  | RewardChallengeData
  | IdolFoundData
  | FireMakingData
  | QuitMedevacData
  | EndgameData
  | TribeMergeData
  | TribeSwapData

/**
 * Look up points for an event type, using custom point values if provided.
 */
function resolvePoints(type: EventType, pointValues?: Record<EventType, number>): number {
  return pointValues ? pointValues[type] : getEventPoints(type)
}

/**
 * Create a milestone-type derived event (MADE_JURY, MADE_MERGE, etc.).
 * Generic path for all milestones — adding a new milestone is: add enum value,
 * add one awardMilestone() call in the relevant derivation function.
 */
function awardMilestone(
  contestantId: string,
  type: EventType,
  description: string,
  pv?: Record<EventType, number>
): DerivedEvent {
  return {
    type,
    contestantId,
    points: resolvePoints(type, pv),
    description,
    voteRound: 0,
  }
}

/**
 * Derive individual scoring events from a game event.
 * This is the core logic that converts what happened in the game
 * into individual point-scoring entries.
 *
 * @param pointValues Optional custom point values map. When provided, uses these
 *   instead of the hardcoded EVENT_POINTS defaults. Pass the result of
 *   getLeagueScoringConfig() for dynamic league scoring.
 */
export function deriveEvents(
  type: GameEventType,
  data: GameEventData,
  pointValues?: Record<EventType, number>,
  gameSettings?: GameSettings
): DerivedEvent[] {
  switch (type) {
    case 'TRIBAL_COUNCIL':
      return deriveTribalCouncil(data as TribalCouncilData, pointValues, gameSettings)
    case 'IMMUNITY_CHALLENGE':
      return deriveImmunityChallenge(data as ImmunityChallengeData, pointValues)
    case 'REWARD_CHALLENGE':
      return deriveRewardChallenge(data as RewardChallengeData, pointValues)
    case 'IDOL_FOUND':
      return deriveIdolFound(data as IdolFoundData, pointValues)
    case 'FIRE_MAKING':
      return deriveFireMaking(data as FireMakingData, pointValues)
    case 'QUIT_MEDEVAC':
      return deriveQuitMedevac(data as QuitMedevacData, pointValues)
    case 'ENDGAME':
      return deriveEndgame(data as EndgameData, pointValues)
    case 'TRIBE_MERGE':
      return deriveTribeMerge(data as TribeMergeData, pointValues)
    case 'TRIBE_SWAP':
      return []
    default:
      return []
  }
}

function deriveTribalCouncil(
  rawData: TribalCouncilData,
  pv?: Record<EventType, number>,
  gameSettings?: GameSettings
): DerivedEvent[] {
  const settings = gameSettings ?? DEFAULT_GAME_SETTINGS
  // normalizeTribalData accepts Record<string, unknown> — safe cast from stored JSON
  const data = normalizeTribalData(rawData as unknown as Record<string, unknown>)
  const events: DerivedEvent[] = []
  const { attendees, voteRounds, eliminated, eliminationMethod, idolPlays, sentToJury } = data

  // Decisive round = last element of voteRounds
  const decisiveRound = voteRounds.length > 0 ? voteRounds[voteRounds.length - 1] : null
  const roundIndex = voteRounds.length > 0 ? voteRounds.length - 1 : 0

  if (decisiveRound && eliminationMethod !== 'rock_draw') {
    // Build vote tallies from decisive round: regular votes + extra votes
    const votesReceived: Record<string, number> = {}
    for (const id of attendees) {
      votesReceived[id] = 0
    }

    // Count regular votes
    for (const votedFor of Object.values(decisiveRound.votes)) {
      if (votesReceived[votedFor] !== undefined) {
        votesReceived[votedFor]++
      }
    }

    // Count extra votes toward tallies
    if (decisiveRound.extraVotes) {
      for (const ev of decisiveRound.extraVotes) {
        if (votesReceived[ev.votedForId] !== undefined) {
          votesReceived[ev.votedForId]++
        }
      }
    }

    // CORRECT_VOTE: regular voters who voted for the eliminated player
    for (const [voterId, votedFor] of Object.entries(decisiveRound.votes)) {
      if (votedFor === eliminated) {
        events.push({
          type: 'CORRECT_VOTE',
          contestantId: voterId,
          points: resolvePoints('CORRECT_VOTE', pv),
          description: 'Voted correctly at tribal council',
          voteRound: roundIndex * 100,
        })
      }
    }

    // CORRECT_VOTE for extra votes (if setting enabled)
    if (settings.extraVoteAwardsCorrectVote && decisiveRound.extraVotes) {
      for (let i = 0; i < decisiveRound.extraVotes.length; i++) {
        const ev = decisiveRound.extraVotes[i]
        if (ev.votedForId === eliminated) {
          const subIndex = i + 1
          if (subIndex >= 100) {
            throw new Error('voteRound subIndex overflow — max 99 extra votes per round')
          }
          events.push({
            type: 'CORRECT_VOTE',
            contestantId: ev.voterId,
            points: resolvePoints('CORRECT_VOTE', pv),
            description: 'Voted correctly with extra vote at tribal council',
            voteRound: roundIndex * 100 + subIndex,
          })
        }
      }
    }

    // Determine which contestants are eligible for ZERO_VOTES_RECEIVED / SURVIVED_WITH_VOTES
    const eligiblePool = decisiveRound.isRevote && decisiveRound.eligibleTargets
      ? decisiveRound.eligibleTargets.filter(id => id !== eliminated)
      : attendees.filter(id => id !== eliminated)

    // ZERO_VOTES_RECEIVED
    for (const id of eligiblePool) {
      if (votesReceived[id] === 0) {
        events.push({
          type: 'ZERO_VOTES_RECEIVED',
          contestantId: id,
          points: resolvePoints('ZERO_VOTES_RECEIVED', pv),
          description: 'Received zero votes at tribal council',
          voteRound: roundIndex * 100,
        })
      }
    }

    // SURVIVED_WITH_VOTES
    for (const id of eligiblePool) {
      if (votesReceived[id] > 0) {
        events.push({
          type: 'SURVIVED_WITH_VOTES',
          contestantId: id,
          points: resolvePoints('SURVIVED_WITH_VOTES', pv),
          description: `Survived tribal council with ${votesReceived[id]} vote(s)`,
          voteRound: roundIndex * 100,
        })
      }
    }
  }

  // IDOL_PLAY_SUCCESS: iterate all idol plays
  for (let i = 0; i < idolPlays.length; i++) {
    const idol = idolPlays[i]
    if (idol.successful) {
      const desc = idol.playedBy === idol.playedFor
        ? 'Successfully played a hidden immunity idol'
        : `Successfully played a hidden immunity idol for another player`
      events.push({
        type: 'IDOL_PLAY_SUCCESS',
        contestantId: idol.playedBy,
        points: resolvePoints('IDOL_PLAY_SUCCESS', pv),
        description: desc,
        voteRound: i,
      })
    }
  }

  // MADE_JURY: always emitted when sentToJury is true, regardless of eliminationMethod
  if (sentToJury) {
    events.push(awardMilestone(eliminated, 'MADE_JURY', 'Sent to the jury', pv))
  }

  return events
}

function deriveImmunityChallenge(data: ImmunityChallengeData, pv?: Record<EventType, number>): DerivedEvent[] {
  // Grouped path: merge transition temporary teams
  if (data.challengeGroups?.length && data.winningGroupIds?.length) {
    const winningGroupSet = new Set(data.winningGroupIds)
    const winners = data.challengeGroups
      .filter((g) => winningGroupSet.has(g.id))
      .flatMap((g) => g.memberIds)
    return winners.map((id) => ({
      type: 'TEAM_CHALLENGE_WIN' as EventType,
      contestantId: id,
      points: resolvePoints('TEAM_CHALLENGE_WIN', pv),
      description: 'Won merge transition team challenge',
      voteRound: 0,
    }))
  }
  // Legacy path: tribe-based team challenges
  if (data.isTeamChallenge && data.winners?.length) {
    return data.winners.map((id) => ({
      type: 'TEAM_CHALLENGE_WIN' as EventType,
      contestantId: id,
      points: resolvePoints('TEAM_CHALLENGE_WIN', pv),
      description: 'Won team immunity challenge',
      voteRound: 0,
    }))
  }
  return [
    {
      type: 'INDIVIDUAL_IMMUNITY_WIN',
      contestantId: data.winner!,
      points: resolvePoints('INDIVIDUAL_IMMUNITY_WIN', pv),
      description: 'Won individual immunity challenge',
      voteRound: 0,
    },
  ]
}

function deriveRewardChallenge(data: RewardChallengeData, pv?: Record<EventType, number>): DerivedEvent[] {
  const eventType: EventType = data.isTeamChallenge ? 'TEAM_CHALLENGE_WIN' : 'REWARD_CHALLENGE_WIN'
  return data.winners.map((id) => ({
    type: eventType,
    contestantId: id,
    points: resolvePoints(eventType, pv),
    description: data.isTeamChallenge
      ? 'Won team reward challenge'
      : 'Won reward challenge',
    voteRound: 0,
  }))
}

function deriveIdolFound(data: IdolFoundData, pv?: Record<EventType, number>): DerivedEvent[] {
  return [
    {
      type: 'IDOL_FIND',
      contestantId: data.finder,
      points: resolvePoints('IDOL_FIND', pv),
      description: 'Found a hidden immunity idol',
      voteRound: 0,
    },
  ]
}

function deriveFireMaking(data: FireMakingData, pv?: Record<EventType, number>): DerivedEvent[] {
  return [
    {
      type: 'FIRE_MAKING_WIN',
      contestantId: data.winner,
      points: resolvePoints('FIRE_MAKING_WIN', pv),
      description: 'Won fire making challenge',
      voteRound: 0,
    },
  ]
}

function deriveQuitMedevac(data: QuitMedevacData, pv?: Record<EventType, number>): DerivedEvent[] {
  const eventType: EventType = data.reason === 'quit' ? 'QUIT' : 'MEDEVAC'
  return [
    {
      type: eventType,
      contestantId: data.contestant,
      points: resolvePoints(eventType, pv),
      description: data.reason === 'quit' ? 'Quit the game' : 'Medically evacuated',
      voteRound: 0,
    },
  ]
}

function deriveEndgame(data: EndgameData, pv?: Record<EventType, number>): DerivedEvent[] {
  const events: DerivedEvent[] = []

  for (const id of data.finalists) {
    events.push({
      type: 'FINALIST',
      contestantId: id,
      points: resolvePoints('FINALIST', pv),
      description: 'Made it to the final tribal council',
      voteRound: 0,
    })
  }

  events.push({
    type: 'WINNER',
    contestantId: data.winner,
    points: resolvePoints('WINNER', pv),
    description: 'Won Survivor!',
    voteRound: 0,
  })

  return events
}

function deriveTribeMerge(data: TribeMergeData, pv?: Record<EventType, number>): DerivedEvent[] {
  return data.remainingContestants.map((id) =>
    awardMilestone(id, 'MADE_MERGE', 'Made the merge', pv)
  )
}

/**
 * Get a human-readable label for a GameEventType
 */
export function getGameEventTypeLabel(type: GameEventType): string {
  const labels: Record<GameEventType, string> = {
    TRIBAL_COUNCIL: 'Tribal Council',
    IMMUNITY_CHALLENGE: 'Immunity Challenge',
    REWARD_CHALLENGE: 'Reward Challenge',
    IDOL_FOUND: 'Idol Found',
    FIRE_MAKING: 'Fire Making Challenge',
    QUIT_MEDEVAC: 'Quit / Medevac',
    ENDGAME: 'Endgame',
    TRIBE_MERGE: 'Tribe Merge',
    TRIBE_SWAP: 'Tribe Swap',
  }
  return labels[type]
}

/**
 * Get a summary description of a game event from its data.
 *
 * @param events Optional derived events array — used to resolve contestant names
 *   when they don't appear in the contestantNames map (e.g. eliminated contestants
 *   with no scoring events of their own).
 */
export function getGameEventSummary(
  type: GameEventType,
  data: GameEventData,
  contestantNames: Record<string, string>,
  events?: Array<{ contestant: { id: string; name: string; nickname?: string | null } }>
): string {
  const name = (id: string) => {
    if (contestantNames[id]) return contestantNames[id]
    // Fall back to the derived events' embedded contestant data
    const found = events?.find((e) => e.contestant.id === id)
    if (found) {
      return found.contestant.nickname
        ? `${found.contestant.nickname} (${found.contestant.name.split(' ')[0]})`
        : found.contestant.name
    }
    return 'Unknown'
  }

  switch (type) {
    case 'TRIBAL_COUNCIL': {
      const d = normalizeTribalData(data as unknown as Record<string, unknown>)
      const eliminatedName = name(d.eliminated)
      const methodSuffix = d.eliminationMethod !== 'vote'
        ? ` (${d.eliminationMethod.replace('_', ' ')})`
        : ''
      return `${eliminatedName} voted out${methodSuffix}${d.sentToJury ? ', sent to jury' : ''}`
    }
    case 'IMMUNITY_CHALLENGE': {
      const d = data as ImmunityChallengeData
      if (d.isTeamChallenge && d.tribeNames?.length) {
        return `${d.tribeNames.join(' & ')} won team immunity`
      }
      return `${name(d.winner!)} won individual immunity`
    }
    case 'REWARD_CHALLENGE': {
      const d = data as RewardChallengeData
      if (d.isTeamChallenge && d.tribeNames?.length) {
        return `${d.tribeNames.join(' & ')} won team reward`
      }
      return `${d.winners.map(name).join(', ')} won reward`
    }
    case 'IDOL_FOUND': {
      const d = data as IdolFoundData
      return `${name(d.finder)} found a hidden immunity idol`
    }
    case 'FIRE_MAKING': {
      const d = data as FireMakingData
      return `${name(d.winner)} defeated ${name(d.loser)} in fire making`
    }
    case 'QUIT_MEDEVAC': {
      const d = data as QuitMedevacData
      return `${name(d.contestant)} ${d.reason === 'quit' ? 'quit' : 'was medically evacuated'}`
    }
    case 'ENDGAME': {
      const d = data as EndgameData
      return `${name(d.winner)} won! Finalists: ${d.finalists.map(name).join(', ')}`
    }
    case 'TRIBE_MERGE': {
      const d = data as TribeMergeData
      return `Merge at week ${d.mergeWeek} (${d.remainingContestants.length} contestants)${d.juryStartsThisWeek ? ', jury begins' : ''}`
    }
    case 'TRIBE_SWAP': {
      const d = data as TribeSwapData
      const moveCount = d.moves.length
      const suffix = d.dissolvedTribeId ? ' (tribe dissolved)' : ''
      return `${d.mode.toLowerCase()}: ${moveCount} contestant${moveCount !== 1 ? 's' : ''} moved${suffix}`
    }
    default:
      return ''
  }
}
