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
}

export function OverviewClient({
  standings,
  contestants,
  weekEventsData,
  currentUserId,
  maxScore,
}: OverviewClientProps) {
  return (
    <div className="space-y-6">
      <StandingsOverview
        standings={standings}
        currentUserId={currentUserId}
        maxScore={maxScore}
      />

      <TopContestants contestants={contestants} />

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-2/3">
          <PlayerDetailCards players={standings} currentUserId={currentUserId} />
        </div>
        <div className="lg:w-1/3">
          <ThisWeeksEvents data={weekEventsData} />
        </div>
      </div>
    </div>
  )
}
