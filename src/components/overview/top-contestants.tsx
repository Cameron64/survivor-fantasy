'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
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

  // Dense ranking: tied scores share the same rank
  const ranks = contestants.reduce<number[]>((acc, c, idx) => {
    if (idx === 0) {
      acc.push(1)
    } else if (c.totalPoints === contestants[idx - 1].totalPoints) {
      acc.push(acc[idx - 1])
    } else {
      acc.push(acc[idx - 1] + 1)
    }
    return acc
  }, [])

  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">Top Contestants</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {visible.map((c, idx) => {
          const rank = ranks[idx]
          return (
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
                {/* Rank badge for podium */}
                {rank <= 3 && (
                  <div className={cn(
                    'absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm',
                    rank === 1 && 'bg-yellow-400 text-yellow-900',
                    rank === 2 && 'bg-gray-300 text-gray-700',
                    rank === 3 && 'bg-amber-600 text-amber-100',
                  )}>
                    {rank}
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
                {c.draftedBy.length > 0 && (
                  <p className="text-[11px] text-muted-foreground mt-1 truncate">
                    {c.draftedBy.join(', ')}
                  </p>
                )}
              </div>
            </div>
          </Card>
          )
        })}
      </div>

      {contestants.length > 8 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full flex items-center justify-center gap-1 mt-3 py-2 text-xs text-muted-foreground hover:text-foreground active:scale-[0.98] transition-all"
        >
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 transition-transform duration-200',
              showAll && 'rotate-180'
            )}
          />
          {showAll ? 'Show top 8' : `Show all ${contestants.length} contestants`}
        </button>
      )}
    </section>
  )
}
