'use client'

import { CalendarDays } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GameEventCard } from '@/components/events/game-event-card'
import { StandaloneEventCard } from '@/components/events/standalone-event-card'
import type { WeekEventsData } from './overview-types'

interface ThisWeeksEventsProps {
  data: WeekEventsData | null
}

export function ThisWeeksEvents({ data }: ThisWeeksEventsProps) {
  if (!data || (data.gameEvents.length === 0 && data.standaloneEvents.length === 0)) {
    return (
      <section>
        <Card className="animate-card-enter">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              This Week&apos;s Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No events this week yet.</p>
          </CardContent>
        </Card>
      </section>
    )
  }

  const { week, episodeTitle, gameEvents, standaloneEvents, contestantNames, contestantAvatars, tribes } = data

  const totalPoints =
    gameEvents.reduce((sum, ge) => sum + ge.events.reduce((s, e) => s + e.points, 0), 0) +
    standaloneEvents.reduce((sum, e) => sum + e.points, 0)

  const eventCount = gameEvents.length + standaloneEvents.length

  return (
    <section>
      <Card className="animate-card-enter" style={{ animationDelay: '200ms' }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            This Week&apos;s Events
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Week {week}{episodeTitle ? ` — ${episodeTitle}` : ''}</span>
            <Badge variant="secondary" className="text-xs">
              {eventCount} {eventCount === 1 ? 'event' : 'events'}
            </Badge>
            <span className={totalPoints >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
              {totalPoints > 0 ? '+' : ''}{totalPoints} pts
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {gameEvents.map((ge) => (
            <GameEventCard
              key={ge.id}
              gameEvent={ge}
              contestantNames={contestantNames}
              contestantAvatars={contestantAvatars}
              tribes={tribes}
              compact
            />
          ))}
          {standaloneEvents.map((event) => (
            <StandaloneEventCard
              key={event.id}
              event={event}
              contestantNames={contestantNames}
              contestantAvatars={contestantAvatars}
              compact
            />
          ))}
        </CardContent>
      </Card>
    </section>
  )
}
