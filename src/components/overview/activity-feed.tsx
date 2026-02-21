'use client'

import { useState } from 'react'
import { Activity } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatRelativeTime } from '@/lib/utils'
import { getEventTypeLabel } from '@/lib/scoring'
import { getCategoryColor } from './overview-utils'
import type { ApprovedEvent } from './overview-types'

interface ActivityFeedProps {
  events: ApprovedEvent[]
}

export function ActivityFeed({ events }: ActivityFeedProps) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? events : events.slice(0, 15)

  if (events.length === 0) {
    return (
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Activity
        </h2>
        <p className="text-sm text-muted-foreground">No events recorded yet.</p>
      </section>
    )
  }

  return (
    <section>
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Activity className="h-5 w-5" />
        Activity
      </h2>

      <div className="space-y-3">
        {visible.map((event) => {
          const color = getCategoryColor(event.type)
          const isPositive = event.points >= 0

          return (
            <div key={event.id} className="flex items-start gap-2.5">
              <span
                className="mt-1.5 h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-medium">{event.contestantName}</span>{' '}
                  <span className="text-muted-foreground">
                    {getEventTypeLabel(event.type)}
                  </span>
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge
                    variant={isPositive ? 'success' : 'destructive'}
                    className="text-[10px] px-1.5 py-0"
                  >
                    {isPositive ? '+' : ''}{event.points}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    Wk {event.week}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">
                    {formatRelativeTime(event.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {events.length > 15 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-3 text-sm text-primary hover:underline"
        >
          {showAll ? 'Show less' : `Show more (${events.length - 15} more)`}
        </button>
      )}
    </section>
  )
}
