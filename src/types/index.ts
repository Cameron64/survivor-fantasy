import { User, Contestant, Team, Event, EventType, Role } from '@prisma/client'

// Extended types with relations
export interface UserWithTeam extends User {
  team: TeamWithContestants | null
}

export interface TeamWithContestants extends Team {
  contestants: TeamContestantWithContestant[]
}

export interface TeamContestantWithContestant {
  id: string
  teamId: string
  contestantId: string
  draftOrder: number
  contestant: Contestant
}

export interface ContestantWithEvents extends Contestant {
  events: Event[]
  totalPoints?: number
}

export interface EventWithRelations extends Event {
  contestant: Contestant
  submittedBy: { id: string; name: string }
  approvedBy: { id: string; name: string } | null
}

// Leaderboard types
export interface LeaderboardEntry {
  rank: number
  teamId: string
  user: {
    id: string
    name: string
    isPaid: boolean
  }
  contestants: ContestantScore[]
  totalScore: number
}

export interface ContestantScore {
  contestant: {
    id: string
    name: string
    tribe: string | null
    imageUrl: string | null
    isEliminated: boolean
  }
  draftOrder: number
  totalPoints: number
  weeklyPoints: Record<number, number>
  events: {
    id: string
    type: EventType
    week: number
    points: number
  }[]
}

// Draft types
export interface DraftState {
  status: 'not_started' | 'in_progress' | 'complete'
  currentPick?: number
  currentRound?: number
  currentUserId?: string
  draftOrder?: DraftParticipant[]
  isComplete?: boolean
  message?: string
}

export interface DraftParticipant {
  userId: string
  name: string
  picks: {
    id: string
    name: string
    tribe: string | null
  }[]
}

// API Response types
export interface ApiError {
  error: string
}

export interface ApiSuccess<T> {
  data: T
}

// Re-export Prisma types
export { EventType, Role }
export type { User, Contestant, Team, Event }
