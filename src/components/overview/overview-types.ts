import type { EventType } from '@prisma/client'

export interface ContestantScore {
  id: string
  name: string
  imageUrl: string | null
  isEliminated: boolean
  totalPoints: number
  tribeColor: string | null
  tribeName: string | null
  draftedBy: string | null
  events: ApprovedEvent[]
}

export interface PlayerStanding {
  teamId: string
  userId: string
  userName: string
  rank: number
  totalScore: number
  allEliminated: boolean
  contestants: ContestantScore[]
}

export interface ApprovedEvent {
  id: string
  type: EventType
  contestantId: string
  contestantName: string
  week: number
  points: number
  createdAt: string
}

export interface CategoryBreakdown {
  category: string
  label: string
  color: string
  points: number
}
