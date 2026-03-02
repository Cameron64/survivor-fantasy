'use client'

import { useState } from 'react'
import { ChevronDown, Flame, Shield, Gift, Search, Swords, LogOut, Trophy, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { getEventTypeLabel } from '@/lib/scoring'
import { getGameEventTypeLabel, getGameEventSummary } from '@/lib/event-derivation'
import { formatRelativeTime } from '@/lib/utils'
import type { ReactNode } from 'react'
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

/**
 * Extract the primary contestant ID for event types where a single
 * contestant photo should replace the icon.
 */
function getPrimaryContestantId(type: string, data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>

  switch (type) {
    case 'TRIBAL_COUNCIL':
      return (d.eliminated as string) || null
    case 'IMMUNITY_CHALLENGE':
      // Only for individual challenges
      if (d.isTeamChallenge) return null
      return (d.winner as string) || null
    case 'REWARD_CHALLENGE':
      // Only for individual challenges
      if (d.isTeamChallenge) return null
      return Array.isArray(d.winners) && d.winners.length === 1
        ? (d.winners[0] as string)
        : null
    case 'IDOL_FOUND':
      return (d.finder as string) || null
    case 'QUIT_MEDEVAC':
      return (d.contestant as string) || null
    default:
      return null
  }
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
  /** Hide expand drawer + submitted-by info (for overview cards) */
  compact?: boolean
  /** Optional action buttons rendered in the header (e.g. approve/reject for admin) */
  actions?: ReactNode
}

function getInitials(name: string): string {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
}

export function GameEventCard({ gameEvent, contestantNames, contestantAvatars, isPending, compact, actions }: GameEventCardProps) {
  const [expanded, setExpanded] = useState(false)
  const totalPoints = gameEvent.events.reduce((sum, e) => sum + e.points, 0)

  const Icon = TYPE_ICONS[gameEvent.type] || Flame
  const typeLabel = getGameEventTypeLabel(gameEvent.type as GameEventType)

  // Try to find a primary contestant whose photo should replace the icon
  const primaryContestantId = getPrimaryContestantId(gameEvent.type, gameEvent.data)
  const primaryAvatar = primaryContestantId ? contestantAvatars?.[primaryContestantId] : null
  const primaryName = primaryContestantId
    ? contestantNames[primaryContestantId] || gameEvent.events.find(e => e.contestant.id === primaryContestantId)?.contestant.name
    : null

  const summary = gameEvent.data
    ? getGameEventSummary(
        gameEvent.type as GameEventType,
        gameEvent.data as GameEventData,
        contestantNames,
        gameEvent.events
      )
    : typeLabel

  // Collect unique tribe colors and buff images from all contestants in this event
  const accentColors = contestantAvatars
    ? Array.from(
        new Set(
          gameEvent.events
            .map((e) => contestantAvatars[e.contestant.id]?.tribeColor)
            .filter(Boolean) as string[]
        )
      )
    : []

  // Check if any contestant is on a merge tribe
  const hasMergeTribe = contestantAvatars
    ? gameEvent.events.some((e) => contestantAvatars[e.contestant.id]?.tribeIsMerge)
    : false

  // Get buff image if this is a single-tribe event (skip merge tribes)
  const buffImage = accentColors.length === 1 && contestantAvatars && !hasMergeTribe
    ? gameEvent.events
        .map((e) => contestantAvatars[e.contestant.id]?.tribeBuffImage)
        .find(Boolean) ?? null
    : null

  return (
    <div
      className={cn(
        'group rounded-lg border bg-card transition-colors relative overflow-hidden',
        isPending && 'border-yellow-300/50 bg-yellow-50/30 dark:bg-yellow-950/10'
      )}
    >
      {buffImage && (
        <div
          className="absolute inset-0 z-0 bg-cover bg-center opacity-[0.12] dark:opacity-[0.10] pointer-events-none"
          style={{ backgroundImage: `url(${buffImage})` }}
        />
      )}
      {accentColors.length > 0 && (
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg z-[1]"
          style={{
            background:
              accentColors.length === 1
                ? accentColors[0]
                : `linear-gradient(to bottom, ${accentColors.slice(0, 5).map((c, i, arr) => `${c} ${(i / arr.length) * 100}%, ${c} ${((i + 1) / arr.length) * 100}%`).join(', ')})`,
          }}
        />
      )}
      <div className="flex items-center">
        {compact ? (
          <div className="flex items-center gap-3 flex-1 min-w-0 p-3">
            {primaryAvatar?.imageUrl ? (
              <Avatar
                className="h-8 w-8 shrink-0"
                style={primaryAvatar.tribeColor ? { boxShadow: `0 0 0 2px ${primaryAvatar.tribeColor}` } : undefined}
              >
                <AvatarImage src={primaryAvatar.imageUrl} alt={primaryName || ''} />
                <AvatarFallback className="text-[10px]">
                  {primaryName ? getInitials(primaryName) : <Icon className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 bg-muted text-muted-foreground">
                <Icon className="h-4 w-4" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm leading-snug">{summary}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{typeLabel}</p>
            </div>

            <span
              className={cn(
                'text-sm font-semibold tabular-nums shrink-0',
                totalPoints >= 0 ? 'text-green-600' : 'text-red-600'
              )}
            >
              {totalPoints > 0 ? '+' : ''}
              {totalPoints}
            </span>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setExpanded(!expanded)
              }}
              className="flex items-center gap-3 flex-1 min-w-0 text-left p-3 hover:bg-accent/50 transition-colors rounded-lg"
            >
              {isPending ? (
                <div className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400">
                  <Clock className="h-4 w-4" />
                </div>
              ) : primaryAvatar?.imageUrl ? (
                <Avatar
                  className="h-8 w-8 shrink-0"
                  style={primaryAvatar.tribeColor ? { boxShadow: `0 0 0 2px ${primaryAvatar.tribeColor}` } : undefined}
                >
                  <AvatarImage src={primaryAvatar.imageUrl} alt={primaryName || ''} />
                  <AvatarFallback className="text-[10px]">
                    {primaryName ? getInitials(primaryName) : <Icon className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 bg-muted text-muted-foreground">
                  <Icon className="h-4 w-4" />
                </div>
              )}

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

            {actions && (
              <div className="flex items-center gap-1 pr-3 shrink-0">
                {actions}
              </div>
            )}
          </>
        )}
      </div>

      {!compact && expanded && (
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
