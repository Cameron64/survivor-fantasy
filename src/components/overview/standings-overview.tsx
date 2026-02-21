'use client'

import { useState } from 'react'
import { Trophy, Medal, Award, Skull, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PlayerStanding } from './overview-types'

interface StandingsOverviewProps {
  standings: PlayerStanding[]
  currentUserId: string | null
  maxScore: number
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="h-4 w-4 text-yellow-500" />
  if (rank === 2) return <Medal className="h-4 w-4 text-gray-400" />
  if (rank === 3) return <Award className="h-4 w-4 text-amber-600" />
  return <span className="text-xs font-bold text-muted-foreground">{rank}</span>
}

export function StandingsOverview({ standings, currentUserId, maxScore }: StandingsOverviewProps) {
  const [expanded, setExpanded] = useState(false)

  // Always show current user in the collapsed view
  const collapsedCount = 5
  const needsToggle = standings.length > collapsedCount
  const currentUserRank = standings.findIndex((p) => p.userId === currentUserId)
  const currentUserOutsideTop = currentUserRank >= collapsedCount

  const visible = expanded ? standings : standings.slice(0, collapsedCount)

  return (
    <section>
      <h2 className="text-lg font-semibold mb-2">Standings</h2>
      <div className="space-y-1">
        {visible.map((player) => {
          const barWidth = maxScore > 0 ? (player.totalScore / maxScore) * 100 : 0
          const isCurrentUser = player.userId === currentUserId

          return (
            <div
              key={player.teamId}
              className={cn(
                'flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-colors',
                isCurrentUser
                  ? 'bg-primary/10 ring-1 ring-primary/30'
                  : 'hover:bg-muted/50',
                player.allEliminated && 'opacity-50'
              )}
            >
              <div className="flex items-center justify-center w-6 shrink-0">
                <RankIcon rank={player.rank} />
              </div>

              <span className={cn(
                'text-sm truncate w-20 sm:w-28 shrink-0',
                isCurrentUser ? 'font-semibold' : 'font-medium'
              )}>
                {player.userName}
              </span>

              {player.allEliminated && (
                <Skull className="h-3 w-3 text-muted-foreground shrink-0" />
              )}

              <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    player.rank === 1
                      ? 'bg-yellow-500'
                      : player.rank <= 3
                        ? 'bg-primary'
                        : 'bg-primary/70'
                  )}
                  style={{ width: `${barWidth}%` }}
                />
              </div>

              <span className="text-sm font-bold tabular-nums w-8 text-right shrink-0">
                {player.totalScore}
              </span>
            </div>
          )
        })}

        {/* Show current user separately if outside top 5 and collapsed */}
        {!expanded && currentUserOutsideTop && currentUserRank !== -1 && (
          <>
            <div className="flex items-center gap-2 px-2.5 py-0.5">
              <span className="text-[10px] text-muted-foreground mx-auto">...</span>
            </div>
            {(() => {
              const player = standings[currentUserRank]
              const barWidth = maxScore > 0 ? (player.totalScore / maxScore) * 100 : 0
              return (
                <div
                  className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 bg-primary/10 ring-1 ring-primary/30"
                >
                  <div className="flex items-center justify-center w-6 shrink-0">
                    <RankIcon rank={player.rank} />
                  </div>
                  <span className="text-sm font-semibold truncate w-20 sm:w-28 shrink-0">
                    {player.userName}
                  </span>
                  <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/70 transition-all duration-500"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold tabular-nums w-8 text-right shrink-0">
                    {player.totalScore}
                  </span>
                </div>
              )
            })()}
          </>
        )}
      </div>

      {needsToggle && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-center gap-1 w-full mt-2 py-2 text-xs text-muted-foreground hover:text-foreground active:scale-[0.98] transition-all"
        >
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 transition-transform duration-200',
              expanded && 'rotate-180'
            )}
          />
          {expanded ? 'Show top 5' : `Show all ${standings.length} players`}
        </button>
      )}
    </section>
  )
}
