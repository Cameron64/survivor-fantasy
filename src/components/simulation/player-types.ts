import type { SimEventType } from '@/simulation/engine/types'

export interface PlayerSeasonAppearance {
  season: number
  seasonName: string
  placement: number
  isWinner: boolean
  isFinalist: boolean
  isJury: boolean
  totalPoints: number
  breakdown: Partial<Record<SimEventType, number>>
  episodeTrends: Array<{ episode: number; points: number }>
}

export interface PlayerProfile {
  id: string
  name: string
  seasons: PlayerSeasonAppearance[]
  careerPoints: number
  seasonsPlayed: number
  bestPlacement: number
}
