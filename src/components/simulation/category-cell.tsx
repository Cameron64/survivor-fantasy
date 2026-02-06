'use client'

import { useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { SimEventType } from '@/simulation/engine/types'
import {
  EVENT_CATEGORIES,
  CATEGORY_COLORS,
  SIM_EVENT_LABELS,
} from '@/components/simulation/sim-constants'

interface CategoryCellProps {
  category: string
  breakdown: Partial<Record<SimEventType, number>>
  pointValues: Record<SimEventType, number>
}

export function CategoryCell({ category, breakdown, pointValues }: CategoryCellProps) {
  const eventTypes = EVENT_CATEGORIES[category] || []
  const total = eventTypes.reduce((sum, et) => sum + (breakdown[et] ?? 0), 0)
  const hasDetail = eventTypes.some((et) => (breakdown[et] ?? 0) !== 0)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const ref = useRef<HTMLSpanElement>(null)
  const hideTimeout = useRef<ReturnType<typeof setTimeout>>()

  const show = useCallback(() => {
    clearTimeout(hideTimeout.current)
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setPos({ x: rect.right, y: rect.top })
    }
  }, [])

  const hide = useCallback(() => {
    hideTimeout.current = setTimeout(() => setPos(null), 100)
  }, [])

  const keepOpen = useCallback(() => {
    clearTimeout(hideTimeout.current)
  }, [])

  return (
    <td className="py-1.5 px-2 text-right" style={{ color: CATEGORY_COLORS[category] }}>
      {hasDetail ? (
        <>
          <span
            ref={ref}
            className="cursor-default underline decoration-dotted underline-offset-2"
            onMouseEnter={show}
            onMouseLeave={hide}
          >
            {total}
          </span>
          {pos && createPortal(
            <div
              className="fixed z-50 w-max max-w-[220px] rounded-md border bg-popover p-2 text-popover-foreground shadow-md text-left text-xs animate-in fade-in-0 zoom-in-95"
              style={{ top: pos.y, left: pos.x, transform: 'translate(-100%, -100%) translate(0, -4px)' }}
              onMouseEnter={keepOpen}
              onMouseLeave={hide}
            >
              <div className="font-semibold mb-1" style={{ color: CATEGORY_COLORS[category] }}>
                {category}
              </div>
              {eventTypes.map((et) => {
                const pts = breakdown[et] ?? 0
                if (pts === 0) return null
                const perEvent = pointValues[et]
                const count = perEvent !== 0 ? Math.round(pts / perEvent) : 0
                return (
                  <div key={et} className="flex justify-between gap-3 text-muted-foreground">
                    <span>
                      {SIM_EVENT_LABELS[et]}
                      {count > 1 && (
                        <span className="opacity-60"> x{count}</span>
                      )}
                    </span>
                    <span className="font-medium tabular-nums" style={{ color: CATEGORY_COLORS[category] }}>
                      {pts > 0 ? `+${pts}` : pts}
                    </span>
                  </div>
                )
              })}
              <div className="border-t mt-1 pt-1 flex justify-between font-medium">
                <span>Total</span>
                <span style={{ color: CATEGORY_COLORS[category] }}>{total}</span>
              </div>
            </div>,
            document.body
          )}
        </>
      ) : (
        <span>{total}</span>
      )}
    </td>
  )
}
