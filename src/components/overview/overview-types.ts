import type { EventType } from '@prisma/client'

export interface ContestantScore {
  id: string
  name: string
  nickname: string | null
  displayName: string
  imageUrl: string | null
  isEliminated: boolean
  totalPoints: number
  tribeColor: string | null
  tribeBuffImage: string | null
  tribeIsMerge: boolean | null
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

export type ContestantAvatarMap = Record<string, {
  imageUrl?: string | null
  tribeColor?: string | null
  tribeBuffImage?: string | null
  tribeIsMerge?: boolean | null
}>

export interface SerializedGameEvent {
  kind: 'game-event'
  id: string
  type: string
  week: number
  data?: unknown
  isApproved: boolean
  createdAt: string
  events: {
    id: string
    type: EventType
    points: number
    contestant: { id: string; name: string; nickname?: string | null }
  }[]
  submittedBy: { id: string; name: string }
  approvedBy: { id: string; name: string } | null
}

export interface SerializedStandaloneEvent {
  kind: 'standalone'
  id: string
  type: EventType
  week: number
  points: number
  description: string | null
  isApproved: boolean
  createdAt: string
  contestant: { id: string; name: string; nickname?: string | null }
  submittedBy: { id: string; name: string }
}

export interface WeekEventsData {
  week: number
  episodeTitle: string | null
  gameEvents: SerializedGameEvent[]
  standaloneEvents: SerializedStandaloneEvent[]
  contestantNames: Record<string, string>
  contestantAvatars: ContestantAvatarMap
}
