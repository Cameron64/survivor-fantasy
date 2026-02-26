// --- GameEvent data interfaces (mirrors src/lib/event-derivation.ts) ---

export interface TribalCouncilData {
  attendees: string[]
  votes: Record<string, string>
  eliminated: string
  isBlindside: boolean
  blindsideLeader?: string
  idolPlayed?: { by: string; successful: boolean } | null
  sentToJury: boolean
}

export interface ImmunityChallengeData {
  winner: string
}

export interface RewardChallengeData {
  winners: string[]
  isTeamChallenge: boolean
}

export interface IdolFoundData {
  finder: string
}

export interface FireMakingData {
  winner: string
  loser: string
}

export interface QuitMedevacData {
  contestant: string
  reason: 'quit' | 'medevac'
}

export interface EndgameData {
  finalists: string[]
  winner: string
}

export type GameEventData =
  | TribalCouncilData
  | ImmunityChallengeData
  | RewardChallengeData
  | IdolFoundData
  | FireMakingData
  | QuitMedevacData
  | EndgameData

// --- API response types ---

export interface Contestant {
  id: string
  name: string
  nickname: string | null
  isEliminated: boolean
  eliminatedWeek: number | null
}

export interface Episode {
  id: string
  number: number
  title: string | null
  airDate: string
}

export interface GameEvent {
  id: string
  type: string
  week: number
  data: Record<string, unknown>
  isApproved: boolean
}

// --- Agent types ---

export interface AgentResult {
  submitted: boolean
  eventCount: number
  summary: string
}
