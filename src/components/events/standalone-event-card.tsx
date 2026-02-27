'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { getEventTypeLabel } from '@/lib/scoring'
import { formatRelativeTime } from '@/lib/utils'
import { Clock } from 'lucide-react'
import type { EventType } from '@prisma/client'
import type { ContestantAvatarMap } from './week-group'

interface StandaloneEventCardProps {
  event: {
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
  contestantNames: Record<string, string>
  contestantAvatars?: ContestantAvatarMap
  isPending?: boolean
  actions?: ReactNode
}

function getInitials(name: string): string {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
}

export function StandaloneEventCard({ event, contestantNames, contestantAvatars, isPending, actions }: StandaloneEventCardProps) {
  const displayName = contestantNames[event.contestant.id] || event.contestant.name
  const avatar = contestantAvatars?.[event.contestant.id]
  const accentColor = avatar?.tribeColor ?? null

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors',
        isPending && 'border-yellow-300/50 bg-yellow-50/30 dark:bg-yellow-950/10'
      )}
      style={accentColor ? { borderLeftWidth: '3px', borderLeftColor: accentColor } : undefined}
    >
      {isPending ? (
        <div className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400">
          <Clock className="h-4 w-4" />
        </div>
      ) : (
        <Avatar
          className="h-7 w-7 shrink-0"
          style={avatar?.tribeColor ? { boxShadow: `0 0 0 2px ${avatar.tribeColor}` } : undefined}
        >
          {avatar?.imageUrl && (
            <AvatarImage src={avatar.imageUrl} alt={displayName} />
          )}
          <AvatarFallback className="text-[10px]">
            {getInitials(event.contestant.name)}
          </AvatarFallback>
        </Avatar>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug">
          <span className="font-medium">{displayName}</span>
          {' — '}
          <span className="text-muted-foreground">{getEventTypeLabel(event.type)}</span>
        </p>
        {isPending && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Submitted by {event.submittedBy.name} • {formatRelativeTime(event.createdAt)}
          </p>
        )}
      </div>

      <span
        className={cn(
          'text-sm font-semibold tabular-nums shrink-0',
          event.points >= 0 ? 'text-green-600' : 'text-red-600'
        )}
      >
        {event.points > 0 ? '+' : ''}
        {event.points}
      </span>

      {actions && (
        <div className="flex items-center gap-1 shrink-0">
          {actions}
        </div>
      )}
    </div>
  )
}
