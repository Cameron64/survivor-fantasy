'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getEventTypeLabel } from '@/lib/scoring'
import type { DerivedEvent } from '@/lib/event-derivation'

interface EventReviewProps {
  events: DerivedEvent[]
  contestantNames: Record<string, string>
  onConfirm: () => void
  onBack: () => void
  isSubmitting: boolean
}

export function EventReview({
  events,
  contestantNames,
  onConfirm,
  onBack,
  isSubmitting,
}: EventReviewProps) {
  const totalPoints = events.reduce((sum, e) => sum + e.points, 0)

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Review Scoring Events</h3>
        <p className="text-sm text-muted-foreground">
          The following {events.length} scoring events will be created. All require moderator
          approval.
        </p>
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

      <Card>
        <CardContent className="flex items-center justify-between p-3">
          <p className="text-sm font-semibold">Total Points</p>
          <p
            className={`text-lg font-bold ${totalPoints >= 0 ? 'text-green-600' : 'text-red-600'}`}
          >
            {totalPoints > 0 ? '+' : ''}
            {totalPoints}
          </p>
        </CardContent>
      </Card>

      <div className="flex gap-2 pt-4">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          Back
        </Button>
        <Button className="flex-1" onClick={onConfirm} disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : `Submit ${events.length} Events`}
        </Button>
      </div>
    </div>
  )
}
