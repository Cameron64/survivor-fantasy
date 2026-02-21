'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
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
              'overflow-hidden',
              c.isEliminated && 'opacity-60'
            )}
            style={{
              borderLeftWidth: '3px',
              borderLeftColor: c.tribeColor || 'transparent',
            }}
          >
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <Avatar className="h-9 w-9 shrink-0">
                  {c.imageUrl && <AvatarImage src={c.imageUrl} alt={c.name} />}
                  <AvatarFallback className="text-xs">{getInitials(c.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    {idx < 3 && <Star className="h-3 w-3 text-yellow-500 shrink-0" />}
                    <p className="font-medium text-sm truncate">{c.name}</p>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-lg font-bold tabular-nums">{c.totalPoints}</span>
                    <span className="text-[11px] text-muted-foreground">pts</span>
                  </div>
                  {c.isEliminated && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0 mt-1">
                      Out
                    </Badge>
                  )}
                  {c.draftedBy && (
                    <p className="text-[11px] text-muted-foreground mt-1 truncate">
                      {c.draftedBy}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
