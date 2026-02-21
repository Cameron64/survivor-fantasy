/** Mirrors the Prisma Contestant model */
export interface Contestant {
  id: string
  name: string
  nickname: string | null
  tribe: string | null
  imageUrl: string | null
  originalSeasons: string | null
  isEliminated: boolean
  eliminatedWeek: number | null
  teams?: Array<{
    team: {
      user: { id: string; name: string }
    }
  }>
  events?: ScoringEvent[]
}

/** Mirrors the Prisma Event model */
export interface ScoringEvent {
  id: string
  type: string
  contestantId: string
  week: number
  description: string | null
  points: number
  isApproved: boolean
  contestant?: Contestant
  submittedBy?: { id: string; name: string }
  approvedBy?: { id: string; name: string } | null
  gameEventId?: string | null
}

/** Mirrors the Prisma GameEvent model */
export interface GameEvent {
  id: string
  type: string
  week: number
  data: Record<string, unknown>
  isApproved: boolean
  submittedBy?: { id: string; name: string }
  approvedBy?: { id: string; name: string } | null
  events?: ScoringEvent[]
  createdAt?: string
}

/** Leaderboard entry from GET /api/scores */
export interface LeaderboardEntry {
  rank: number
  teamId: string
  user: { id: string; name: string; isPaid: boolean }
  totalScore: number
  contestants: Array<{
    contestant: {
      id: string
      name: string
      tribe: string | null
      imageUrl: string | null
      isEliminated: boolean
    }
    draftOrder: number
    totalPoints: number
    weeklyPoints: Record<string, number>
    events: Array<{
      id: string
      type: string
      week: number
      points: number
    }>
  }>
}
