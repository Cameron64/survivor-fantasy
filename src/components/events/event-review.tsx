'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getEventTypeLabel } from '@/lib/scoring'
import type { DerivedEvent } from '@/lib/event-derivation'
import type { FormContestant } from '@/components/shared/contestant-label'
import type { EventTypeTheme } from '@/app/(dashboard)/events/submit/_lib/constants'

interface EventReviewProps {
  events: DerivedEvent[]
  contestantNames: Record<string, string>
  contestants?: FormContestant[]
  eventType: string
  eventTypeLabel: string
  eventTypeIcon: React.ElementType
  eventTypeTheme: EventTypeTheme
  onConfirm: () => void
  onBack: () => void
  isSubmitting: boolean
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

interface ContestantGroup {
  contestantId: string
  name: string
  contestant: FormContestant | null
  events: DerivedEvent[]
  subtotal: number
}

export function EventReview({
  events,
  contestantNames,
  contestants = [],
  eventType,
  eventTypeLabel,
  eventTypeIcon: Icon,
  eventTypeTheme: theme,
  onConfirm,
  onBack,
  isSubmitting,
}: EventReviewProps) {
  const totalPoints = events.reduce((sum, e) => sum + e.points, 0)

  // Structural events don't generate scoring events
  const isStructuralEvent = events.length === 0 && eventType === 'TRIBE_SWAP'

  // Build a map of contestants by id for quick lookup
  const contestantMap = useMemo(() => {
    const map = new Map<string, FormContestant>()
    for (const c of contestants) map.set(c.id, c)
    return map
  }, [contestants])

  // Group events by contestant
  const groups = useMemo(() => {
    const map = new Map<string, ContestantGroup>()
    for (const event of events) {
      const existing = map.get(event.contestantId)
      if (existing) {
        existing.events.push(event)
        existing.subtotal += event.points
      } else {
        map.set(event.contestantId, {
          contestantId: event.contestantId,
          name: contestantNames[event.contestantId] || 'Unknown',
          contestant: contestantMap.get(event.contestantId) ?? null,
          events: [event],
          subtotal: event.points,
        })
      }
    }
    // Sort: positive points first (desc), then negative
    return Array.from(map.values()).sort((a, b) => b.subtotal - a.subtotal)
  }, [events, contestantNames, contestantMap])

  return (
    <div className="space-y-4">
      {/* Themed header */}
      <div className={`flex items-center gap-3 p-3 rounded-lg border-l-4 ${theme.borderColor} bg-muted/30`}>
        <div className={`flex items-center justify-center w-9 h-9 rounded-full ${theme.iconBg}`}>
          <Icon className={`h-4.5 w-4.5 ${theme.iconText}`} />
        </div>
        <div>
          <h3 className="text-lg font-semibold leading-tight">
            {isStructuralEvent ? 'Review Event' : 'Review Scoring Events'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isStructuralEvent
              ? `${eventTypeLabel} \u00b7 No points awarded (structural event)`
              : `${eventTypeLabel} \u00b7 ${events.length} event${events.length !== 1 ? 's' : ''} pending approval`
            }
          </p>
        </div>
      </div>

      {/* Contestant groups (only show if there are scoring events) */}
      {!isStructuralEvent && (
        <div className="space-y-2">
          {groups.map((group) => {
          const c = group.contestant
          return (
            <div
              key={group.contestantId}
              className="rounded-lg border bg-card overflow-hidden"
            >
              <div className="flex">
                {/* Photo slice */}
                <div
                  className="relative w-16 sm:w-[4.5rem] shrink-0 bg-muted min-h-[4.5rem]"
                  style={c?.tribeColor ? { borderBottom: `3px solid ${c.tribeColor}` } : undefined}
                >
                  {c?.imageUrl ? (
                    <img
                      src={c.imageUrl}
                      alt={group.name}
                      className="absolute inset-0 w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground font-medium text-sm">
                      {getInitials(group.name)}
                    </div>
                  )}

                  {/* Points overlay */}
                  <div
                    className={cn(
                      'absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-xs font-bold shadow-sm',
                      group.subtotal >= 0
                        ? 'bg-green-500 text-white'
                        : 'bg-red-500 text-white',
                    )}
                  >
                    {group.subtotal > 0 ? '+' : ''}{group.subtotal}
                  </div>
                </div>

                {/* Name + event breakdown */}
                <div className="flex-1 min-w-0 p-3">
                  <p className="font-medium text-sm">{group.name}</p>
                  <div className="mt-1 space-y-0.5">
                    {group.events.map((event, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{getEventTypeLabel(event.type)}</span>
                        <span
                          className={cn(
                            'font-semibold tabular-nums',
                            event.points >= 0 ? 'text-green-600' : 'text-red-600',
                          )}
                        >
                          {event.points > 0 ? '+' : ''}{event.points}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        </div>
      )}

      {/* Show info card for structural events */}
      {isStructuralEvent && (
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              This is a structural event that updates tribe memberships but does not award points.
              Review your selections and submit when ready.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Divider */}
      {!isStructuralEvent && <div className="border-t border-border" />}

      {/* Total points (only for scoring events) */}
      {!isStructuralEvent && (
        <Card className={`border-l-4 ${totalPoints >= 0 ? 'border-l-green-500' : 'border-l-red-500'}`}>
          <CardContent className="flex items-center justify-between p-4">
            <p className="text-sm font-semibold text-muted-foreground">Total Points</p>
            <p
              className={`text-2xl font-bold ${totalPoints >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
            >
              {totalPoints > 0 ? '+' : ''}
              {totalPoints}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          Back
        </Button>
        <Button
          className="flex-1 gap-2"
          size="lg"
          onClick={onConfirm}
          disabled={isSubmitting}
        >
          <Send className="h-4 w-4" />
          {isSubmitting
            ? 'Submitting...'
            : isStructuralEvent
            ? `Submit ${eventTypeLabel}`
            : `Submit ${events.length} Event${events.length !== 1 ? 's' : ''}`
          }
        </Button>
      </div>
    </div>
  )
}
