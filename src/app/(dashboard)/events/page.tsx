'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, Plus, Check, Clock, X } from 'lucide-react'
import { getEventTypeLabel } from '@/lib/scoring'
import { EventType } from '@prisma/client'
import { formatRelativeTime } from '@/lib/utils'
import { getGameEventTypeLabel } from '@/lib/event-derivation'

interface Contestant {
  id: string
  name: string
  tribe: string | null
  isEliminated: boolean
}

interface Event {
  id: string
  type: EventType
  week: number
  points: number
  description: string | null
  isApproved: boolean
  createdAt: string
  gameEventId: string | null
  contestant: Contestant
  submittedBy: { id: string; name: string }
  approvedBy: { id: string; name: string } | null
}

interface GameEvent {
  id: string
  type: string
  week: number
  isApproved: boolean
  createdAt: string
  events: Event[]
  submittedBy: { id: string; name: string }
  approvedBy: { id: string; name: string } | null
}

export default function EventsPage() {
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [gameEvents, setGameEvents] = useState<GameEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [eventsRes, gameEventsRes] = await Promise.all([
        fetch('/api/events'),
        fetch('/api/game-events'),
      ])

      if (eventsRes.ok) {
        const data = await eventsRes.json()
        if (Array.isArray(data)) setEvents(data)
      }
      if (gameEventsRes.ok) {
        const data = await gameEventsRes.json()
        if (Array.isArray(data)) setGameEvents(data)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Standalone events (not part of a game event)
  const standaloneEvents = events.filter((e) => !e.gameEventId)
  const approvedStandalone = standaloneEvents.filter((e) => e.isApproved)
  const pendingStandalone = standaloneEvents.filter((e) => !e.isApproved)

  const approvedGameEvents = gameEvents.filter((ge) => ge.isApproved)
  const pendingGameEvents = gameEvents.filter((ge) => !ge.isApproved)

  const totalApproved = approvedStandalone.length + approvedGameEvents.length
  const totalPending = pendingStandalone.length + pendingGameEvents.length

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Events</h1>
          <p className="text-muted-foreground">
            Game events and scoring history
          </p>
        </div>
        <Button data-testid="log-event-button" onClick={() => router.push('/events/submit')}>
          <Plus className="h-4 w-4 mr-2" />
          Log Event
        </Button>
      </div>

      <Tabs defaultValue="approved">
        <TabsList>
          <TabsTrigger value="approved" data-testid="tab-approved">
            Approved ({totalApproved})
          </TabsTrigger>
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pending ({totalPending})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="approved" className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading events...
              </CardContent>
            </Card>
          ) : totalApproved === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No approved events yet</p>
                <p className="text-sm text-muted-foreground">
                  Events will appear here once approved by a moderator
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {approvedGameEvents.map((ge) => (
                <GameEventCard key={ge.id} gameEvent={ge} />
              ))}
              {approvedStandalone.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {totalPending === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No pending events</p>
                <p className="text-sm text-muted-foreground">
                  Submitted events awaiting approval will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingGameEvents.map((ge) => (
                <GameEventCard key={ge.id} gameEvent={ge} isPending />
              ))}
              {pendingStandalone.map((event) => (
                <EventCard key={event.id} event={event} isPending />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function GameEventCard({ gameEvent, isPending }: { gameEvent: GameEvent; isPending?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const totalPoints = gameEvent.events.reduce((sum, e) => sum + e.points, 0)

  return (
    <Card>
      <CardContent className="p-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-4 w-full text-left"
        >
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-full ${
              isPending ? 'bg-yellow-100' : 'bg-green-100'
            }`}
          >
            {isPending ? (
              <Clock className="h-5 w-5 text-yellow-600" />
            ) : (
              <Check className="h-5 w-5 text-green-600" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium">
                {getGameEventTypeLabel(gameEvent.type as import('@prisma/client').GameEventType)}
              </p>
              <Badge variant={isPending ? 'outline' : 'secondary'}>
                Week {gameEvent.week}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {gameEvent.events.length} events
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Submitted by {gameEvent.submittedBy.name} •{' '}
              {formatRelativeTime(gameEvent.createdAt)}
            </p>
          </div>

          <div className="text-right">
            <p
              className={`text-xl font-bold ${
                totalPoints >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {totalPoints > 0 ? '+' : ''}
              {totalPoints}
            </p>
          </div>
        </button>

        {expanded && (
          <div className="mt-3 pt-3 border-t space-y-2">
            {gameEvent.events.map((event) => (
              <div key={event.id} className="flex items-center gap-3 px-2 py-1">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{event.contestant.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {getEventTypeLabel(event.type)}
                  </p>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    event.points >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {event.points > 0 ? '+' : ''}
                  {event.points}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function EventCard({ event, isPending }: { event: Event; isPending?: boolean }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div
          className={`flex items-center justify-center w-10 h-10 rounded-full ${
            event.points >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
          }`}
        >
          {isPending ? (
            <Clock className="h-5 w-5 text-yellow-600" />
          ) : event.points >= 0 ? (
            <Check className="h-5 w-5" />
          ) : (
            <X className="h-5 w-5" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium">{event.contestant.name}</p>
            <Badge variant={isPending ? 'outline' : 'secondary'}>
              Week {event.week}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {getEventTypeLabel(event.type)}
          </p>
          {event.description && (
            <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Submitted by {event.submittedBy.name} • {formatRelativeTime(event.createdAt)}
          </p>
        </div>

        <div className="text-right">
          <p
            className={`text-xl font-bold ${
              event.points >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {event.points > 0 ? '+' : ''}{event.points}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
