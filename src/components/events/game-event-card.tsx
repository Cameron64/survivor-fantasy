'use client'

import { useState } from 'react'
import { ChevronDown, Flame, Shield, Gift, Search, Swords, LogOut, Trophy, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { getEventTypeLabel } from '@/lib/scoring'
import { getGameEventTypeLabel, getGameEventSummary } from '@/lib/event-derivation'
import { formatRelativeTime } from '@/lib/utils'
import type { GameEventType, EventType } from '@prisma/client'
import type { GameEventData } from '@/lib/event-derivation'
import type { ContestantAvatarMap } from './week-group'

const TYPE_ICONS: Record<string, typeof Flame> = {
  TRIBAL_COUNCIL: Flame,
  IMMUNITY_CHALLENGE: Shield,
  REWARD_CHALLENGE: Gift,
  IDOL_FOUND: Search,
  FIRE_MAKING: Swords,
  QUIT_MEDEVAC: LogOut,
  ENDGAME: Trophy,
}

interface GameEventCardEvent {
  id: string
  type: EventType
  points: number
  contestant: { id: string; name: string; nickname?: string | null }
}

interface GameEventCardProps {
  gameEvent: {
    id: string
    type: string
    week: number
    data?: unknown
    isApproved: boolean
    createdAt: string
    events: GameEventCardEvent[]
    submittedBy: { id: string; name: string }
    approvedBy: { id: string; name: string } | null
  }
  contestantNames: Record<string, string>
  contestantAvatars?: ContestantAvatarMap
  isPending?: boolean
}

function getInitials(name: string): string {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
}

export function GameEventCard({ gameEvent, contestantNames, contestantAvatars, isPending }: GameEventCardProps) {
  const [expanded, setExpanded] = useState(false)
  const totalPoints = gameEvent.events.reduce((sum, e) => sum + e.points, 0)

  const Icon = TYPE_ICONS[gameEvent.type] || Flame
  const typeLabel = getGameEventTypeLabel(gameEvent.type as GameEventType)

  const summary = gameEvent.data
    ? getGameEventSummary(
        gameEvent.type as GameEventType,
        gameEvent.data as GameEventData,
        contestantNames
      )
    : typeLabel

  return (
    <div
      className={cn(
        'group rounded-lg border bg-card transition-colors',
        isPending && 'border-yellow-300/50 bg-yellow-50/30 dark:bg-yellow-950/10'
      )}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-3 w-full text-left p-3 hover:bg-accent/50 transition-colors rounded-lg"
      >
        <div
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-full shrink-0',
            isPending
              ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {isPending ? <Clock className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm leading-snug truncate">{summary}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{typeLabel}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
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
              expanded && 'rotate-180'
            )}
          />
        </div>
      </button>

      {expanded && (
        <div className="border-t px-3 pb-3 pt-2 space-y-1.5 animate-in slide-in-from-top-1 duration-200">
          {gameEvent.events.map((event) => {
            const avatar = contestantAvatars?.[event.contestant.id]
            const displayName = contestantNames[event.contestant.id] || event.contestant.name

            return (
              <div key={event.id} className="flex items-center gap-2 text-sm px-1">
                <Avatar
                  className="h-6 w-6 shrink-0"
                  style={avatar?.tribeColor ? { boxShadow: `0 0 0 2px ${avatar.tribeColor}` } : undefined}
                >
                  {avatar?.imageUrl && (
                    <AvatarImage src={avatar.imageUrl} alt={displayName} />
                  )}
                  <AvatarFallback className="text-[10px]">
                    {getInitials(event.contestant.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-muted-foreground flex-1 truncate">
                  <span className="font-medium text-foreground">{displayName}</span>
                  {' — '}
                  {getEventTypeLabel(event.type)}
                </span>
                <span
                  className={cn(
                    'text-xs font-semibold tabular-nums',
                    event.points >= 0 ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {event.points > 0 ? '+' : ''}
                  {event.points}
                </span>
              </div>
            )
          })}
          <p className="text-xs text-muted-foreground pt-1 px-1">
            Submitted by {gameEvent.submittedBy.name} • {formatRelativeTime(gameEvent.createdAt)}
          </p>
        </div>
      )}
    </div>
  )
}
