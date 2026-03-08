'use client'

import { useState } from 'react'
import { ChevronDown, Flame, Shield, Gift, Search, Swords, LogOut, Trophy, Clock, ArrowLeftRight, Merge } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { getEventTypeLabel } from '@/lib/scoring'
import { getGameEventTypeLabel, getGameEventSummary } from '@/lib/event-derivation'
import { formatRelativeTime } from '@/lib/utils'
import type { ReactNode } from 'react'
import type { GameEventType, EventType } from '@prisma/client'
import type { GameEventData, TribeSwapData } from '@/lib/event-derivation'
import type { ContestantAvatarMap } from './week-group'

const TYPE_ICONS: Record<string, typeof Flame> = {
  TRIBAL_COUNCIL: Flame,
  IMMUNITY_CHALLENGE: Shield,
  REWARD_CHALLENGE: Gift,
  IDOL_FOUND: Search,
  FIRE_MAKING: Swords,
  QUIT_MEDEVAC: LogOut,
  ENDGAME: Trophy,
  TRIBE_SWAP: ArrowLeftRight,
  TRIBE_MERGE: Merge,
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
  /** Tribe lookup for tribe swap details */
  tribes?: Array<{ id: string; name: string; color: string }>
}

function getInitials(name: string): string {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
}

export function GameEventCard({ gameEvent, contestantNames, contestantAvatars, isPending, compact, actions, tribes }: GameEventCardProps) {
  const [expanded, setExpanded] = useState(false)
  const totalPoints = gameEvent.events.reduce((sum, e) => sum + e.points, 0)

  // Check if this is a tribe swap event
  const isTribeSwap = gameEvent.type === 'TRIBE_SWAP'
  const tribeSwapData = isTribeSwap ? (gameEvent.data as TribeSwapData) : null

  // Multi-person events still need a drawer even in compact mode
  // Tribe swaps always need a drawer to show the swap details
  const uniqueContestants = new Set(gameEvent.events.map((e) => e.contestant.id))
  const isMultiPerson = uniqueContestants.size > 1
  const suppressDrawer = compact && !isMultiPerson && !isTribeSwap

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

  // In compact mode, use a photo sliver instead of a circular avatar
  // Fall back to the sole contestant's avatar when there's only one
  const sliverContestantId = primaryContestantId ?? (!isMultiPerson ? Array.from(uniqueContestants)[0] : null)
  const sliverAvatar = sliverContestantId ? contestantAvatars?.[sliverContestantId] : null
  const sliverName = sliverContestantId
    ? contestantNames[sliverContestantId] || gameEvent.events.find(e => e.contestant.id === sliverContestantId)?.contestant.name || null
    : null
  const compactSliver = compact && sliverAvatar?.imageUrl ? sliverAvatar : null

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
      {accentColors.length > 0 && !compactSliver && (
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
      <div className="relative z-10 flex">
        {/* Compact photo sliver */}
        {compactSliver && (
          <div
            className="relative w-12 shrink-0 bg-muted self-stretch"
            style={compactSliver.tribeColor ? { borderBottom: `3px solid ${compactSliver.tribeColor}` } : undefined}
          >
            <img
              src={compactSliver.imageUrl!}
              alt={sliverName || ''}
              className="absolute inset-0 w-full h-full object-cover object-top"
            />
          </div>
        )}

        {suppressDrawer ? (
          <div className="flex items-center gap-3 flex-1 min-w-0 p-3">
            {!compactSliver && (
              <div className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 bg-muted text-muted-foreground">
                <Icon className="h-4 w-4" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm leading-snug">
                {isTribeSwap ? typeLabel : summary}
              </p>
              {!isTribeSwap && <p className="text-xs text-muted-foreground mt-0.5">{typeLabel}</p>}
            </div>

            {!isTribeSwap && (
              <span
                className={cn(
                  'text-sm font-semibold tabular-nums shrink-0',
                  totalPoints >= 0 ? 'text-green-600' : 'text-red-600'
                )}
              >
                {totalPoints > 0 ? '+' : ''}
                {totalPoints}
              </span>
            )}
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
              {!compact && !isTribeSwap && (
                isPending ? (
                  <div className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400">
                    <Clock className="h-4 w-4" />
                  </div>
                ) : primaryAvatar?.imageUrl ? (
                  <Avatar
                    className="h-9 w-9 shrink-0"
                    style={primaryAvatar.tribeColor ? { boxShadow: `0 0 0 2px ${primaryAvatar.tribeColor}` } : undefined}
                  >
                    <AvatarImage src={primaryAvatar.imageUrl} alt={primaryName || ''} />
                    <AvatarFallback className="text-xs">
                      {primaryName ? getInitials(primaryName) : <Icon className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 bg-muted text-muted-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                )
              )}
              {(compact || isTribeSwap) && !compactSliver && (
                <div className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 bg-muted text-muted-foreground">
                  <Icon className="h-4 w-4" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className={cn('font-medium text-sm leading-snug', !compact && 'truncate')}>
                  {isTribeSwap ? typeLabel : summary}
                </p>
                {!isTribeSwap && <p className="text-xs text-muted-foreground mt-0.5">{typeLabel}</p>}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!isTribeSwap && (
                  <span
                    className={cn(
                      'text-sm font-semibold tabular-nums',
                      totalPoints >= 0 ? 'text-green-600' : 'text-red-600'
                    )}
                  >
                    {totalPoints > 0 ? '+' : ''}
                    {totalPoints}
                  </span>
                )}
                {actions && (
                  <div className="flex items-center gap-1">
                    {actions}
                  </div>
                )}
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform duration-200',
                    expanded && 'rotate-180'
                  )}
                />
              </div>
            </button>
          </>
        )}
      </div>

      {!suppressDrawer && expanded && (() => {
        // Special view for tribe swaps
        if (isTribeSwap && tribeSwapData && tribes) {
          const tribeMap = new Map(tribes.map(t => [t.id, t]))

          // Build tribe lookup
          const getTribeName = (id: string) => tribeMap.get(id)?.name || id
          const getTribeColor = (id: string) => tribeMap.get(id)?.color

          // Group moves by origin tribe (where they came from)
          const movesByTribe = new Map<string, typeof tribeSwapData.moves>()
          for (const move of tribeSwapData.moves) {
            const existing = movesByTribe.get(move.fromTribeId) || []
            existing.push(move)
            movesByTribe.set(move.fromTribeId, existing)
          }

          return (
            <div className="border-t pb-3 pt-3 space-y-3 animate-in slide-in-from-top-1 duration-200">
              {/* Swap type header */}
              <div className="px-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {tribeSwapData.mode === 'SWAP' && 'Standard Tribe Swap'}
                    {tribeSwapData.mode === 'DISSOLUTION' && 'Tribe Dissolution'}
                    {tribeSwapData.mode === 'EXPANSION' && 'Tribe Expansion'}
                  </span>
                </div>

                {tribeSwapData.dissolvedTribeId && (
                  <div className="mt-2 text-xs bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded px-2 py-1 inline-flex items-center gap-1.5">
                    <span className="font-medium text-red-700 dark:text-red-400">Dissolved:</span>
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ backgroundColor: getTribeColor(tribeSwapData.dissolvedTribeId) }}
                    />
                    <span className="text-red-600 dark:text-red-300">{getTribeName(tribeSwapData.dissolvedTribeId)}</span>
                  </div>
                )}
              </div>

              {/* Moves grouped by origin tribe */}
              <div className="space-y-2">
                {Array.from(movesByTribe.entries()).map(([fromTribeId, moves]) => {
                  const tribeColor = getTribeColor(fromTribeId)
                  const tribeName = getTribeName(fromTribeId)

                  return (
                    <div key={fromTribeId} className="border-l-2 ml-3" style={{ borderColor: tribeColor }}>
                      <div className="px-3 py-1.5">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className="inline-block w-3 h-3 rounded-full"
                            style={{ backgroundColor: tribeColor }}
                          />
                          <span className="font-medium text-sm">{tribeName}</span>
                          <span className="text-xs text-muted-foreground">
                            {moves.length} member{moves.length !== 1 ? 's' : ''}
                          </span>
                        </div>

                        <div className="space-y-1">
                          {moves.map((move) => {
                            const avatar = contestantAvatars?.[move.contestantId]
                            const name = contestantNames[move.contestantId] || move.contestantId
                            const toTribeName = getTribeName(move.toTribeId)
                            const toTribeColor = getTribeColor(move.toTribeId)

                            return (
                              <div key={move.contestantId} className="flex items-center gap-2">
                                {avatar?.imageUrl ? (
                                  <Avatar className="h-6 w-6 shrink-0">
                                    <AvatarImage src={avatar.imageUrl} alt={name} />
                                    <AvatarFallback className="text-[10px]">
                                      {getInitials(name)}
                                    </AvatarFallback>
                                  </Avatar>
                                ) : (
                                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                                    <span className="text-[10px] font-medium text-muted-foreground">
                                      {getInitials(name)}
                                    </span>
                                  </div>
                                )}

                                <span className="text-sm">{name}</span>

                                <div className="flex items-center gap-1 ml-auto text-xs text-muted-foreground">
                                  <span>→</span>
                                  <span
                                    className="inline-block w-2 h-2 rounded-full"
                                    style={{ backgroundColor: toTribeColor }}
                                  />
                                  <span>{toTribeName}</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {!compact && (
                <p className="text-xs text-muted-foreground px-3">
                  Submitted by {gameEvent.submittedBy.name} • {formatRelativeTime(gameEvent.createdAt)}
                </p>
              )}
            </div>
          )
        }

        // Standard event view (for non-tribe-swap events)
        // Group events by contestant
        const grouped = new Map<string, { events: GameEventCardEvent[]; subtotal: number }>()
        for (const event of gameEvent.events) {
          const cid = event.contestant.id
          const existing = grouped.get(cid)
          if (existing) {
            existing.events.push(event)
            existing.subtotal += event.points
          } else {
            grouped.set(cid, { events: [event], subtotal: event.points })
          }
        }

        return (
          <div className="border-t pb-2 pt-2 space-y-1 animate-in slide-in-from-top-1 duration-200">
            {Array.from(grouped.entries()).map(([cid, { events: cEvents, subtotal }]) => {
              const avatar = contestantAvatars?.[cid]
              const displayName = contestantNames[cid] || cEvents[0].contestant.name

              return (
                <div key={cid} className="flex overflow-hidden">
                  {/* Photo sliver */}
                  {avatar?.imageUrl ? (
                    <div
                      className="relative w-12 shrink-0 bg-muted self-stretch"
                      style={avatar.tribeColor ? { borderBottom: `2px solid ${avatar.tribeColor}` } : undefined}
                    >
                      <img
                        src={avatar.imageUrl}
                        alt={displayName}
                        className="absolute inset-0 w-full h-full object-cover object-top"
                      />
                    </div>
                  ) : (
                    <div className="w-12 shrink-0 bg-muted self-stretch flex items-center justify-center">
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {getInitials(cEvents[0].contestant.name)}
                      </span>
                    </div>
                  )}

                  {/* Name + events */}
                  <div className="flex-1 min-w-0 px-3 py-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{displayName}</span>
                      <span
                        className={cn(
                          'text-xs font-semibold tabular-nums',
                          subtotal >= 0 ? 'text-green-600' : 'text-red-600'
                        )}
                      >
                        {subtotal > 0 ? '+' : ''}{subtotal}
                      </span>
                    </div>
                    <div className="space-y-0.5 mt-0.5">
                      {cEvents.map((event) => (
                        <div key={event.id} className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{getEventTypeLabel(event.type)}</span>
                          <span
                            className={cn(
                              'tabular-nums',
                              event.points >= 0 ? 'text-green-600' : 'text-red-600'
                            )}
                          >
                            {event.points > 0 ? '+' : ''}{event.points}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
            {!compact && (
              <p className="text-xs text-muted-foreground pt-1 px-3">
                Submitted by {gameEvent.submittedBy.name} • {formatRelativeTime(gameEvent.createdAt)}
              </p>
            )}
          </div>
        )
      })()}
    </div>
  )
}
