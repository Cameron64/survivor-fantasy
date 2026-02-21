'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
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

export function PlayerDetailCards({ players, currentUserId }: PlayerDetailCardsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function toggle(teamId: string) {
    setExpandedId((prev) => (prev === teamId ? null : teamId))
  }

  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">Player Breakdowns</h2>
      <div className="space-y-2">
        {players.map((player) => {
          const isExpanded = expandedId === player.teamId
          const isCurrentUser = player.userId === currentUserId

          return (
            <div
              key={player.teamId}
              className={cn(
                'rounded-lg border bg-card overflow-hidden transition-colors',
                isCurrentUser && 'ring-2 ring-primary'
              )}
            >
              <button
                onClick={() => toggle(player.teamId)}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground w-6 text-right">
                    #{player.rank}
                  </span>
                  <span className="font-medium text-sm">{player.userName}</span>
                  <span className="text-sm text-muted-foreground">
                    {player.totalScore} pts
                  </span>
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
                  {player.contestants.map((contestant) => {
                    const breakdowns = categorizeEvents(contestant.events)

                    return (
                      <div key={contestant.id} className="space-y-2">
                        <div className="flex items-center gap-2">
                          {contestant.tribeColor && (
                            <span
                              className="h-3 w-3 rounded-full shrink-0"
                              style={{ backgroundColor: contestant.tribeColor }}
                            />
                          )}
                          <span className="font-medium text-sm">{contestant.name}</span>
                          <span className="text-sm text-muted-foreground">
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
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
