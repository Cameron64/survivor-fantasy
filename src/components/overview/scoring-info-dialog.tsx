'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog'
import { EVENT_CATEGORIES } from './overview-utils'
import { EVENT_POINTS } from '@/lib/constants/scoring-constants'
import { getEventTypeLabel } from '@/lib/scoring'
import { Info } from 'lucide-react'
import type { EventType } from '@prisma/client'

export function ScoringInfoDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <Info className="h-4 w-4" />
          Scoring
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>How Scoring Works</DialogTitle>
          <DialogDescription>
            Points are awarded for in-game events each week.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto space-y-5 pr-1">
          {Object.entries(EVENT_CATEGORIES).map(([key, category]) => (
            <div key={key} className="space-y-2">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: category.color }}
                />
                <h3 className="text-sm font-semibold">{category.label}</h3>
              </div>
              <div className="space-y-1 pl-[18px]">
                {category.types.map((type) => {
                  const points = EVENT_POINTS[type as keyof typeof EVENT_POINTS]
                  return (
                    <div
                      key={type}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted-foreground">
                        {getEventTypeLabel(type as EventType)}
                      </span>
                      <span
                        className={
                          points > 0
                            ? 'font-medium text-green-600 dark:text-green-400'
                            : points < 0
                              ? 'font-medium text-red-600 dark:text-red-400'
                              : 'font-medium text-muted-foreground'
                        }
                      >
                        {points > 0 ? '+' : ''}
                        {points}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
