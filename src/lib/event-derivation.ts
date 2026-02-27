import { EventType, GameEventType } from '@prisma/client'
import { getEventPoints } from './scoring'

/**
 * A derived scoring event ready to be created in the database.
 */
export interface DerivedEvent {
  type: EventType
  contestantId: string
  points: number
  description?: string
}

// --- Data shapes for each GameEventType ---

export interface TribalCouncilData {
  attendees: string[] // contestant IDs
  votes: Record<string, string> // voterId -> votedForId
  eliminated: string // contestant ID
  isBlindside: boolean
  blindsideLeader?: string // contestant ID
  idolPlayed?: { by: string; successful: boolean } | null
  sentToJury: boolean
}

export interface ImmunityChallengeData {
  winner: string // contestant ID
}

export interface RewardChallengeData {
  winners: string[] // contestant IDs
  isTeamChallenge: boolean
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

export type GameEventData =
  | TribalCouncilData
  | ImmunityChallengeData
  | RewardChallengeData
  | IdolFoundData
  | FireMakingData
  | QuitMedevacData
  | EndgameData

/**
 * Look up points for an event type, using custom point values if provided.
 */
function resolvePoints(type: EventType, pointValues?: Record<EventType, number>): number {
  return pointValues ? pointValues[type] : getEventPoints(type)
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
  pointValues?: Record<EventType, number>
): DerivedEvent[] {
  switch (type) {
    case 'TRIBAL_COUNCIL':
      return deriveTribalCouncil(data as TribalCouncilData, pointValues)
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
    default:
      return []
  }
}

function deriveTribalCouncil(data: TribalCouncilData, pv?: Record<EventType, number>): DerivedEvent[] {
  const events: DerivedEvent[] = []
  const { attendees, votes, eliminated, isBlindside, blindsideLeader, idolPlayed, sentToJury } =
    data

  // Count votes received by each attendee
  const votesReceived: Record<string, number> = {}
  for (const id of attendees) {
    votesReceived[id] = 0
  }
  for (const votedFor of Object.values(votes)) {
    if (votesReceived[votedFor] !== undefined) {
      votesReceived[votedFor]++
    }
  }

  // CORRECT_VOTE: everyone who voted for the eliminated person
  for (const [voterId, votedFor] of Object.entries(votes)) {
    if (votedFor === eliminated) {
      events.push({
        type: 'CORRECT_VOTE',
        contestantId: voterId,
        points: resolvePoints('CORRECT_VOTE', pv),
        description: 'Voted correctly at tribal council',
      })
    }
  }

  // ZERO_VOTES_RECEIVED: attendees who got zero votes (excluding the eliminated person)
  for (const id of attendees) {
    if (id !== eliminated && votesReceived[id] === 0) {
      events.push({
        type: 'ZERO_VOTES_RECEIVED',
        contestantId: id,
        points: resolvePoints('ZERO_VOTES_RECEIVED', pv),
        description: 'Received zero votes at tribal council',
      })
    }
  }

  // SURVIVED_WITH_VOTES: attendees who got votes but weren't eliminated
  for (const id of attendees) {
    if (id !== eliminated && votesReceived[id] > 0) {
      events.push({
        type: 'SURVIVED_WITH_VOTES',
        contestantId: id,
        points: resolvePoints('SURVIVED_WITH_VOTES', pv),
        description: `Survived tribal council with ${votesReceived[id]} vote(s)`,
      })
    }
  }

  // CAUSED_BLINDSIDE
  if (isBlindside && blindsideLeader) {
    events.push({
      type: 'CAUSED_BLINDSIDE',
      contestantId: blindsideLeader,
      points: resolvePoints('CAUSED_BLINDSIDE', pv),
      description: 'Led a blindside at tribal council',
    })
  }

  // IDOL_PLAY_SUCCESS
  if (idolPlayed?.successful) {
    events.push({
      type: 'IDOL_PLAY_SUCCESS',
      contestantId: idolPlayed.by,
      points: resolvePoints('IDOL_PLAY_SUCCESS', pv),
      description: 'Successfully played a hidden immunity idol',
    })
  }

  // MADE_JURY
  if (sentToJury) {
    events.push({
      type: 'MADE_JURY',
      contestantId: eliminated,
      points: resolvePoints('MADE_JURY', pv),
      description: 'Sent to the jury',
    })
  }

  return events
}

function deriveImmunityChallenge(data: ImmunityChallengeData, pv?: Record<EventType, number>): DerivedEvent[] {
  return [
    {
      type: 'INDIVIDUAL_IMMUNITY_WIN',
      contestantId: data.winner,
      points: resolvePoints('INDIVIDUAL_IMMUNITY_WIN', pv),
      description: 'Won individual immunity challenge',
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
  }))
}

function deriveIdolFound(data: IdolFoundData, pv?: Record<EventType, number>): DerivedEvent[] {
  return [
    {
      type: 'IDOL_FIND',
      contestantId: data.finder,
      points: resolvePoints('IDOL_FIND', pv),
      description: 'Found a hidden immunity idol',
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
    },
  ]
}

function deriveQuitMedevac(data: QuitMedevacData, pv?: Record<EventType, number>): DerivedEvent[] {
  return [
    {
      type: 'QUIT',
      contestantId: data.contestant,
      points: resolvePoints('QUIT', pv),
      description: data.reason === 'quit' ? 'Quit the game' : 'Medically evacuated',
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
    })
  }

  events.push({
    type: 'WINNER',
    contestantId: data.winner,
    points: resolvePoints('WINNER', pv),
    description: 'Won Survivor!',
  })

  return events
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
  }
  return labels[type]
}

/**
 * Get a summary description of a game event from its data
 */
export function getGameEventSummary(
  type: GameEventType,
  data: GameEventData,
  contestantNames: Record<string, string>
): string {
  const name = (id: string) => contestantNames[id] || 'Unknown'

  switch (type) {
    case 'TRIBAL_COUNCIL': {
      const d = data as TribalCouncilData
      const eliminatedName = name(d.eliminated)
      return `${eliminatedName} voted out${d.isBlindside ? ' (blindside)' : ''}${d.sentToJury ? ', sent to jury' : ''}`
    }
    case 'IMMUNITY_CHALLENGE': {
      const d = data as ImmunityChallengeData
      return `${name(d.winner)} won individual immunity`
    }
    case 'REWARD_CHALLENGE': {
      const d = data as RewardChallengeData
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
    default:
      return ''
  }
}
