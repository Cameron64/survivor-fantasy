'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Send } from 'lucide-react'
import { getEventTypeLabel } from '@/lib/scoring'
import type { DerivedEvent } from '@/lib/event-derivation'
import type { EventTypeTheme } from '@/app/(dashboard)/events/submit/_lib/constants'

interface EventReviewProps {
  events: DerivedEvent[]
  contestantNames: Record<string, string>
  eventType: string
  eventTypeLabel: string
  eventTypeIcon: React.ElementType
  eventTypeTheme: EventTypeTheme
  onConfirm: () => void
  onBack: () => void
  isSubmitting: boolean
}

export function EventReview({
  events,
  contestantNames,
  eventTypeLabel,
  eventTypeIcon: Icon,
  eventTypeTheme: theme,
  onConfirm,
  onBack,
  isSubmitting,
}: EventReviewProps) {
  const totalPoints = events.reduce((sum, e) => sum + e.points, 0)

  return (
    <div className="space-y-4">
      {/* Themed header */}
      <div className={`flex items-center gap-3 p-3 rounded-lg border-l-4 ${theme.borderColor} bg-muted/30`}>
        <div className={`flex items-center justify-center w-9 h-9 rounded-full ${theme.iconBg}`}>
          <Icon className={`h-4.5 w-4.5 ${theme.iconText}`} />
        </div>
        <div>
          <h3 className="text-lg font-semibold leading-tight">Review Scoring Events</h3>
          <p className="text-sm text-muted-foreground">
            {eventTypeLabel} &middot; {events.length} event{events.length !== 1 ? 's' : ''} pending approval
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {events.map((event, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-3 p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {contestantNames[event.contestantId] || 'Unknown'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {getEventTypeLabel(event.type)}
                </p>
              </div>
              <Badge
                variant={event.points >= 0 ? 'default' : 'destructive'}
                className="text-sm"
              >
                {event.points > 0 ? '+' : ''}
                {event.points}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Total points - more prominent */}
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
          {isSubmitting ? 'Submitting...' : `Submit ${events.length} Events`}
        </Button>
      </div>
    </div>
  )
}
