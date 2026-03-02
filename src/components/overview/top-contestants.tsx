'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ContestantScore } from './overview-types'

interface TopContestantsProps {
  contestants: ContestantScore[]
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function TopContestants({ contestants }: TopContestantsProps) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? contestants : contestants.slice(0, 8)

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Top Contestants</h2>
        {contestants.length > 8 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-primary hover:underline"
          >
            {showAll ? 'Show less' : `Show all (${contestants.length})`}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {visible.map((c, idx) => (
          <Card
            key={c.id}
            className={cn(
              'relative overflow-hidden animate-card-enter',
              c.isEliminated && 'opacity-60'
            )}
            style={{
              animationDelay: `${idx * 60}ms`,
            }}
          >
            {/* Tribe color/buff background on the text area */}
            {c.tribeBuffImage && !c.tribeIsMerge && (
              <div
                className="absolute inset-0 z-0 bg-cover bg-center opacity-[0.12] dark:opacity-[0.10]"
                style={{ backgroundImage: `url(${c.tribeBuffImage})` }}
              />
            )}
            {c.tribeColor && !c.tribeIsMerge && (
              <div
                className="absolute inset-0 z-0 opacity-[0.10]"
                style={{ backgroundColor: c.tribeColor }}
              />
            )}

            <div className="relative z-10 flex h-full">
              {/* Photo slice */}
              <div
                className="relative w-16 sm:w-20 shrink-0 bg-muted"
                style={c.tribeColor ? { borderBottom: `3px solid ${c.tribeColor}` } : undefined}
              >
                {c.imageUrl ? (
                  <img
                    src={c.imageUrl}
                    alt={c.displayName}
                    className="absolute inset-0 w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground font-medium text-sm">
                    {getInitials(c.name)}
                  </div>
                )}
                {/* Rank badge for top 3 */}
                {idx < 3 && (
                  <div className={cn(
                    'absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm',
                    idx === 0 && 'bg-yellow-400 text-yellow-900',
                    idx === 1 && 'bg-gray-300 text-gray-700',
                    idx === 2 && 'bg-amber-600 text-amber-100',
                  )}>
                    {idx + 1}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 p-2.5 flex flex-col justify-center">
                <p className="font-medium text-sm truncate">{c.nickname || c.name.split(' ')[0]}</p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-lg font-bold tabular-nums">{c.totalPoints}</span>
                  <span className="text-[11px] text-muted-foreground">pts</span>
                </div>
                {c.isEliminated && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0 mt-1 w-fit">
                    Out
                  </Badge>
                )}
                {c.draftedBy && (
                  <p className="text-[11px] text-muted-foreground mt-1 truncate">
                    {c.draftedBy.split(' ')[0]}
                  </p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  )
}
