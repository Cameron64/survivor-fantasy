'use client'

import { useState } from 'react'
import type { CategoryBreakdown } from './overview-types'

interface CategoryBreakdownBarProps {
  breakdowns: CategoryBreakdown[]
}

export function CategoryBreakdownBar({ breakdowns }: CategoryBreakdownBarProps) {
  const [hovered, setHovered] = useState<string | null>(null)

  const positive = breakdowns.filter((b) => b.points > 0)
  const totalPositive = positive.reduce((s, b) => s + b.points, 0)

  if (totalPositive === 0) {
    return (
      <div className="h-6 rounded-full bg-muted flex items-center justify-center">
        <span className="text-xs text-muted-foreground">No points yet</span>
      </div>
    )
  }

  const penalties = breakdowns.find((b) => b.category === 'penalties')
  const hasPenalties = penalties && penalties.points < 0

  return (
    <div className="space-y-1">
      <div className="flex h-6 rounded-full overflow-hidden bg-muted">
        {positive.map((b) => (
          <div
            key={b.category}
            className="relative h-full transition-opacity duration-150"
            style={{
              width: `${(b.points / totalPositive) * 100}%`,
              backgroundColor: b.color,
              opacity: hovered && hovered !== b.category ? 0.5 : 1,
            }}
            onMouseEnter={() => setHovered(b.category)}
            onMouseLeave={() => setHovered(null)}
          >
            {hovered === b.category && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-bold text-white drop-shadow-sm">
                  {b.label} {b.points}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
        {breakdowns
          .filter((b) => b.points !== 0)
          .map((b) => (
            <span key={b.category} className="flex items-center gap-1">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: b.color }}
              />
              {b.label} {b.points > 0 ? `+${b.points}` : b.points}
            </span>
          ))}
        {hasPenalties && (
          <span className="text-red-500 font-medium">({penalties.points})</span>
        )}
      </div>
    </div>
  )
}
