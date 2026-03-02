'use client'

import type { CategoryBreakdown } from './overview-types'

interface CategoryBreakdownBarProps {
  breakdowns: CategoryBreakdown[]
}

export function CategoryBreakdownBar({ breakdowns }: CategoryBreakdownBarProps) {
  const nonZero = breakdowns.filter((b) => b.points !== 0)

  if (nonZero.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">No points yet</p>
    )
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {nonZero.map((b) => (
        <span
          key={b.category}
          className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: `${b.color}15`,
            color: b.color,
            border: `1px solid ${b.color}30`,
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full shrink-0"
            style={{ backgroundColor: b.color }}
          />
          {b.label} {b.points > 0 ? `+${b.points}` : b.points}
        </span>
      ))}
    </div>
  )
}
