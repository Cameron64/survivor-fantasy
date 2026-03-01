'use client'

import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { GameEventCard } from './game-event-card'
import { StandaloneEventCard } from './standalone-event-card'
import type { EventType } from '@prisma/client'

export type ContestantAvatarMap = Record<string, { imageUrl?: string | null; tribeColor?: string | null; tribeBuffImage?: string | null; tribeIsMerge?: boolean | null }>

interface TimelineGameEvent {
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

interface TimelineStandaloneEvent {
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

export type TimelineItem = TimelineGameEvent | TimelineStandaloneEvent

export interface WeekData {
  week: number
  episodeTitle?: string | null
  items: TimelineItem[]
  totalPoints: number
  eventCount: number
}

interface WeekGroupProps {
  weekData: WeekData
  isExpanded: boolean
  onToggle: () => void
  contestantNames: Record<string, string>
  contestantAvatars: ContestantAvatarMap
}

export function WeekGroup({ weekData, isExpanded, onToggle, contestantNames, contestantAvatars }: WeekGroupProps) {
  const { week, episodeTitle, items, totalPoints, eventCount } = weekData

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onToggle()
        }}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-sm">Week {week}</span>
          {episodeTitle && (
            <span className="text-sm text-muted-foreground truncate">
              — {episodeTitle}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="secondary" className="text-xs">
            {eventCount} {eventCount === 1 ? 'event' : 'events'}
          </Badge>
          <span
            className={cn(
              'text-sm font-semibold tabular-nums',
              totalPoints >= 0 ? 'text-green-600' : 'text-red-600'
            )}
          >
            {totalPoints > 0 ? '+' : ''}
            {totalPoints}
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform duration-200',
              isExpanded && 'rotate-180'
            )}
          />
        </div>
      </button>

      {isExpanded && (
        <div className="border-t px-3 pb-3 pt-2 space-y-2 animate-in slide-in-from-top-1 duration-200">
          {items.map((item) =>
            item.kind === 'game-event' ? (
              <GameEventCard
                key={item.id}
                gameEvent={item}
                contestantNames={contestantNames}
                contestantAvatars={contestantAvatars}
              />
            ) : (
              <StandaloneEventCard
                key={item.id}
                event={item}
                contestantNames={contestantNames}
                contestantAvatars={contestantAvatars}
              />
            )
          )}
        </div>
      )}
    </div>
  )
}
