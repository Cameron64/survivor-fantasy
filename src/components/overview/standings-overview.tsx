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

function RankIcon({ rank, large }: { rank: number; large?: boolean }) {
  const size = large ? 'h-5 w-5' : 'h-4 w-4'
  if (rank === 1) return <Trophy className={cn(size, 'text-yellow-500')} />
  if (rank === 2) return <Medal className={cn(size, 'text-gray-400')} />
  if (rank === 3) return <Award className={cn(size, 'text-amber-600')} />
  return <span className="text-xs font-bold text-muted-foreground">{rank}</span>
}

function getFirstName(fullName: string): string {
  return fullName.split(' ')[0]
}

export function StandingsOverview({ standings, currentUserId, maxScore }: StandingsOverviewProps) {
  const [expanded, setExpanded] = useState(false)

  const collapsedCount = 5
  const needsToggle = standings.length > collapsedCount
  const currentUserRank = standings.findIndex((p) => p.userId === currentUserId)
  const currentUserOutsideTop = currentUserRank >= collapsedCount

  const visible = expanded ? standings : standings.slice(0, collapsedCount)

  return (
    <section>
      <h2 className="text-lg font-semibold mb-2">Standings</h2>
      <div className="space-y-1">
        {visible.map((player, idx) => {
          const barWidth = maxScore > 0 ? (player.totalScore / maxScore) * 100 : 0
          const isCurrentUser = player.userId === currentUserId
          const isTopThree = player.rank <= 3

          return (
            <div
              key={player.teamId}
              className={cn(
                'flex items-center gap-2 rounded-lg px-2.5 transition-colors animate-row-enter',
                isTopThree ? 'py-2.5' : 'py-1.5',
                isCurrentUser
                  ? 'bg-primary/10 ring-1 ring-primary/30'
                  : player.rank === 1
                    ? 'bg-yellow-500/10'
                    : player.rank === 2
                      ? 'bg-gray-400/10'
                      : player.rank === 3
                        ? 'bg-amber-600/10'
                        : 'hover:bg-muted/50',
                player.allEliminated && 'opacity-50'
              )}
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <div className={cn(
                'flex items-center justify-center shrink-0',
                isTopThree ? 'w-7' : 'w-6'
              )}>
                <RankIcon rank={player.rank} large={isTopThree} />
              </div>

              <span className={cn(
                'truncate shrink-0',
                isTopThree ? 'text-base w-24 sm:w-32' : 'text-sm w-20 sm:w-28',
                isCurrentUser || isTopThree ? 'font-semibold' : 'font-medium'
              )}>
                {getFirstName(player.userName)}
              </span>

              {player.allEliminated && (
                <Skull className="h-3 w-3 text-muted-foreground shrink-0" />
              )}

              <div className={cn(
                'flex-1 rounded-full bg-muted overflow-hidden',
                isTopThree ? 'h-4' : 'h-3'
              )}>
                <div
                  className={cn(
                    'h-full rounded-full animate-bar-fill',
                    player.rank === 1
                      ? 'bg-gradient-to-r from-yellow-400 to-yellow-500'
                      : player.rank === 2
                        ? 'bg-gradient-to-r from-gray-300 to-gray-400'
                        : player.rank === 3
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600'
                          : 'bg-primary/70'
                  )}
                  style={{
                    width: `${barWidth}%`,
                    animationDelay: `${idx * 80 + 200}ms`,
                  }}
                />
              </div>

              <span className={cn(
                'font-bold tabular-nums text-right shrink-0',
                isTopThree ? 'text-base w-9' : 'text-sm w-8'
              )}>
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
                  className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 bg-primary/10 ring-1 ring-primary/30 animate-row-enter"
                  style={{ animationDelay: `${(collapsedCount + 1) * 80}ms` }}
                >
                  <div className="flex items-center justify-center w-6 shrink-0">
                    <RankIcon rank={player.rank} />
                  </div>
                  <span className="text-sm font-semibold truncate w-20 sm:w-28 shrink-0">
                    {getFirstName(player.userName)}
                  </span>
                  <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/70 animate-bar-fill"
                      style={{
                        width: `${barWidth}%`,
                        animationDelay: `${(collapsedCount + 1) * 80 + 200}ms`,
                      }}
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
