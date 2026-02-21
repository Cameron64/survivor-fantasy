'use client'

import { Trophy, Medal, Award, Skull } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PlayerStanding } from './overview-types'

interface StandingsOverviewProps {
  standings: PlayerStanding[]
  currentUserId: string | null
  maxScore: number
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />
  if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />
  return <span className="text-sm font-bold text-muted-foreground">{rank}</span>
}

export function StandingsOverview({ standings, currentUserId, maxScore }: StandingsOverviewProps) {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">Standings</h2>
      <div className="space-y-2">
        {standings.map((player) => {
          const barWidth = maxScore > 0 ? (player.totalScore / maxScore) * 100 : 0
          const isCurrentUser = player.userId === currentUserId

          return (
            <div
              key={player.teamId}
              className={cn(
                'flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors',
                isCurrentUser && 'ring-2 ring-primary',
                player.allEliminated && 'opacity-60'
              )}
            >
              <div className="flex items-center justify-center w-8 h-8 shrink-0">
                <RankIcon rank={player.rank} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm truncate">
                    {player.userName}
                  </span>
                  {player.allEliminated && (
                    <Skull className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 h-4 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold tabular-nums w-10 text-right shrink-0">
                    {player.totalScore}
                  </span>
                </div>

                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                  {player.contestants.map((c) => (
                    <span
                      key={c.id}
                      className={cn(
                        'inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full bg-muted',
                        c.isEliminated && 'line-through opacity-60'
                      )}
                    >
                      {c.tribeColor && (
                        <span
                          className="inline-block h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: c.tribeColor }}
                        />
                      )}
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
