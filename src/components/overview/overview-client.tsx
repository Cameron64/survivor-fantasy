'use client'

import { StandingsOverview } from './standings-overview'
import { TopContestants } from './top-contestants'
import { PlayerDetailCards } from './player-detail-cards'
import { ThisWeeksEvents } from './this-weeks-events'
import type { PlayerStanding, ContestantScore, WeekEventsData } from './overview-types'

interface OverviewClientProps {
  standings: PlayerStanding[]
  contestants: ContestantScore[]
  weekEventsData: WeekEventsData | null
  currentUserId: string | null
  maxScore: number
  showLastPlace?: boolean
}

export function OverviewClient({
  standings,
  contestants,
  weekEventsData,
  currentUserId,
  maxScore,
  showLastPlace = false,
}: OverviewClientProps) {
  return (
    <div className="space-y-6">
      <StandingsOverview
        standings={standings}
        currentUserId={currentUserId}
        maxScore={maxScore}
        showLastPlace={showLastPlace}
      />

      <ThisWeeksEvents data={weekEventsData} />

      <TopContestants contestants={contestants} />

      <PlayerDetailCards players={standings} currentUserId={currentUserId} />
    </div>
  )
}
