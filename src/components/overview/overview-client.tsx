'use client'

import { StandingsOverview } from './standings-overview'
import { TopContestants } from './top-contestants'
import { PlayerDetailCards } from './player-detail-cards'
import { ActivityFeed } from './activity-feed'
import type { PlayerStanding, ContestantScore, ApprovedEvent } from './overview-types'

interface OverviewClientProps {
  standings: PlayerStanding[]
  contestants: ContestantScore[]
  feedEvents: ApprovedEvent[]
  currentUserId: string | null
  maxScore: number
}

export function OverviewClient({
  standings,
  contestants,
  feedEvents,
  currentUserId,
  maxScore,
}: OverviewClientProps) {
  return (
    <div className="space-y-8">
      <StandingsOverview
        standings={standings}
        currentUserId={currentUserId}
        maxScore={maxScore}
      />

      <TopContestants contestants={contestants} />

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-2/3">
          <PlayerDetailCards players={standings} currentUserId={currentUserId} />
        </div>
        <div className="lg:w-1/3">
          <ActivityFeed events={feedEvents} />
        </div>
      </div>
    </div>
  )
}
