'use client'

import { cn } from '@/lib/utils'
import { getEventTypeLabel } from '@/lib/scoring'
import { formatRelativeTime } from '@/lib/utils'
import { Clock } from 'lucide-react'
import type { EventType } from '@prisma/client'

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
  isPending?: boolean
}

export function StandaloneEventCard({ event, contestantNames, isPending }: StandaloneEventCardProps) {
  const displayName = contestantNames[event.contestant.id] || event.contestant.name

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors',
        isPending && 'border-yellow-300/50 bg-yellow-50/30 dark:bg-yellow-950/10'
      )}
    >
      {isPending && (
        <div className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400">
          <Clock className="h-4 w-4" />
        </div>
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
    </div>
  )
}
