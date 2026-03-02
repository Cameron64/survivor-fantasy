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
  compact?: boolean
  actions?: ReactNode
}

function getInitials(name: string): string {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
}

export function StandaloneEventCard({ event, contestantNames, contestantAvatars, isPending, compact, actions }: StandaloneEventCardProps) {
  const displayName = contestantNames[event.contestant.id] || event.contestant.name
  const avatar = contestantAvatars?.[event.contestant.id]
  const accentColor = avatar?.tribeColor ?? null
  const showTribeBg = !avatar?.tribeIsMerge

  const compactSliver = compact && avatar?.imageUrl

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border bg-card transition-colors',
        isPending && 'border-yellow-300/50 bg-yellow-50/30 dark:bg-yellow-950/10'
      )}
      style={!compactSliver && accentColor ? { borderLeftWidth: '3px', borderLeftColor: accentColor } : undefined}
    >
      {avatar?.tribeBuffImage && showTribeBg && (
        <div
          className="absolute inset-0 z-0 bg-cover bg-center opacity-[0.12] dark:opacity-[0.10]"
          style={{ backgroundImage: `url(${avatar.tribeBuffImage})` }}
        />
      )}
      {accentColor && showTribeBg && (
        <div
          className="absolute inset-0 z-0 opacity-[0.10]"
          style={{ backgroundColor: accentColor }}
        />
      )}

      <div className="relative z-10 flex items-center">
        {/* Compact photo sliver */}
        {compactSliver && (
          <div
            className="relative w-12 shrink-0 bg-muted self-stretch"
            style={accentColor ? { borderBottom: `3px solid ${accentColor}` } : undefined}
          >
            <img
              src={avatar!.imageUrl!}
              alt={displayName}
              className="absolute inset-0 w-full h-full object-cover object-top"
            />
          </div>
        )}

        {!compactSliver && (
          isPending ? (
            <div className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 ml-3 bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400">
              <Clock className="h-4 w-4" />
            </div>
          ) : !compact ? (
            <Avatar
              className="h-7 w-7 shrink-0 ml-3"
              style={avatar?.tribeColor ? { boxShadow: `0 0 0 2px ${avatar.tribeColor}` } : undefined}
            >
              {avatar?.imageUrl && (
                <AvatarImage src={avatar.imageUrl} alt={displayName} />
              )}
              <AvatarFallback className="text-[10px]">
                {getInitials(event.contestant.name)}
              </AvatarFallback>
            </Avatar>
          ) : null
        )}

        <div className="flex-1 min-w-0 p-3">
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
            'text-sm font-semibold tabular-nums shrink-0 pr-3',
            event.points >= 0 ? 'text-green-600' : 'text-red-600'
          )}
        >
          {event.points > 0 ? '+' : ''}
          {event.points}
        </span>

        {actions && (
          <div className="flex items-center gap-1 shrink-0 pr-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
