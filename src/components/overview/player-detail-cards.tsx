'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Trophy, Medal, Award } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { getEventTypeLabel } from '@/lib/scoring'
import { categorizeEvents, getCategoryColor } from './overview-utils'
import { CategoryBreakdownBar } from './category-breakdown-bar'
import type { PlayerStanding } from './overview-types'

interface PlayerDetailCardsProps {
  players: PlayerStanding[]
  currentUserId: string | null
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="flex items-center justify-center h-7 w-7 rounded-full bg-yellow-500/20">
        <Trophy className="h-3.5 w-3.5 text-yellow-600" />
      </div>
    )
  }
  if (rank === 2) {
    return (
      <div className="flex items-center justify-center h-7 w-7 rounded-full bg-gray-400/20">
        <Medal className="h-3.5 w-3.5 text-gray-500" />
      </div>
    )
  }
  if (rank === 3) {
    return (
      <div className="flex items-center justify-center h-7 w-7 rounded-full bg-amber-500/20">
        <Award className="h-3.5 w-3.5 text-amber-600" />
      </div>
    )
  }
  return (
    <div className="flex items-center justify-center h-7 w-7 rounded-full bg-muted">
      <span className="text-xs font-bold text-muted-foreground">{rank}</span>
    </div>
  )
}

function getRankBorderColor(rank: number): string {
  if (rank === 1) return '#eab308'
  if (rank === 2) return '#9ca3af'
  if (rank === 3) return '#d97706'
  return 'transparent'
}

export function PlayerDetailCards({ players, currentUserId }: PlayerDetailCardsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  const VISIBLE_COUNT = 5

  const visiblePlayers = useMemo(() => {
    if (showAll || players.length <= VISIBLE_COUNT) return players

    const top = players.slice(0, VISIBLE_COUNT)
    const currentUserInTop = currentUserId && top.some((p) => p.userId === currentUserId)

    if (!currentUserId || currentUserInTop) return top

    // Replace 5th slot with current user
    const currentUser = players.find((p) => p.userId === currentUserId)
    if (!currentUser) return top

    return [...top.slice(0, VISIBLE_COUNT - 1), currentUser]
  }, [players, currentUserId, showAll])

  function toggle(teamId: string) {
    setExpandedId((prev) => (prev === teamId ? null : teamId))
  }

  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">Player Breakdowns</h2>
      <div className="space-y-2">
        {visiblePlayers.map((player, idx) => {
          const isExpanded = expandedId === player.teamId
          const isCurrentUser = player.userId === currentUserId
          const isTopThree = player.rank <= 3

          return (
            <div
              key={player.teamId}
              className={cn(
                'rounded-lg border bg-card overflow-hidden transition-all animate-card-enter',
                isCurrentUser && 'ring-2 ring-primary',
              )}
              style={{
                animationDelay: `${idx * 60}ms`,
                borderLeftWidth: '3px',
                borderLeftColor: isCurrentUser ? 'hsl(24, 95%, 53%)' : getRankBorderColor(player.rank),
              }}
            >
              <button
                onClick={() => toggle(player.teamId)}
                className={cn(
                  'w-full flex items-center justify-between p-3 text-left transition-colors',
                  isTopThree && !isCurrentUser
                    ? player.rank === 1
                      ? 'hover:bg-yellow-500/5'
                      : player.rank === 2
                        ? 'hover:bg-gray-400/5'
                        : 'hover:bg-amber-500/5'
                    : 'hover:bg-accent/50',
                )}
              >
                <div className="flex items-center gap-2.5">
                  <RankBadge rank={player.rank} />
                  <div>
                    <span className="font-semibold text-sm">
                      {player.userName.split(' ')[0]}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg font-bold tabular-nums">{player.totalScore}</span>
                      <span className="text-xs text-muted-foreground">pts</span>
                    </div>
                  </div>
                </div>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform duration-200',
                    isExpanded && 'rotate-180'
                  )}
                />
              </button>

              {isExpanded && (
                <div className="border-t px-3 pb-3 pt-2 space-y-4 animate-in slide-in-from-top-1 duration-200">
                  {player.contestants.map((contestant, cIdx) => {
                    const breakdowns = categorizeEvents(contestant.events)

                    return (
                      <div key={contestant.id}>
                        {cIdx > 0 && <div className="border-t mb-4" />}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            {contestant.tribeColor && (
                              <span
                                className="h-3 w-3 rounded-full shrink-0"
                                style={{ backgroundColor: contestant.tribeColor }}
                              />
                            )}
                            <span className="font-medium text-sm">
                              {contestant.nickname || contestant.name.split(' ')[0]}
                            </span>
                            <span className="text-sm font-semibold tabular-nums">
                              {contestant.totalPoints} pts
                            </span>
                            {contestant.isEliminated && (
                              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                Out
                              </Badge>
                            )}
                          </div>

                          <CategoryBreakdownBar breakdowns={breakdowns} />

                          {contestant.events.length > 0 && (
                            <div className="space-y-1 pl-1">
                              {contestant.events.map((event) => {
                                const isPositive = event.points >= 0
                                const color = getCategoryColor(event.type)
                                return (
                                  <div
                                    key={event.id}
                                    className="flex items-center gap-2 text-sm"
                                  >
                                    <span
                                      className="h-1.5 w-1.5 rounded-full shrink-0"
                                      style={{ backgroundColor: color }}
                                    />
                                    <span className="text-muted-foreground flex-1 truncate">
                                      {getEventTypeLabel(event.type)}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] px-1 py-0"
                                    >
                                      Wk {event.week}
                                    </Badge>
                                    <span
                                      className={cn(
                                        'text-xs font-medium tabular-nums w-8 text-right',
                                        isPositive ? 'text-green-600' : 'text-red-500'
                                      )}
                                    >
                                      {isPositive ? '+' : ''}{event.points}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          {contestant.events.length === 0 && (
                            <p className="text-xs text-muted-foreground pl-1">
                              No approved events yet
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {!showAll && players.length > VISIBLE_COUNT && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg border border-dashed hover:border-solid hover:bg-accent/50"
          >
            Show all {players.length} players
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </section>
  )
}
