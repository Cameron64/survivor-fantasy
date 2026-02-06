'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Check, Clock, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { getEventTypeLabel } from '@/lib/scoring'
import { getGameEventTypeLabel } from '@/lib/event-derivation'
import { EventType, GameEventType } from '@prisma/client'
import { formatRelativeTime } from '@/lib/utils'

interface Event {
  id: string
  type: EventType
  week: number
  points: number
  description: string | null
  isApproved: boolean
  createdAt: string
  gameEventId: string | null
  contestant: { id: string; name: string }
  submittedBy: { id: string; name: string }
  approvedBy: { id: string; name: string } | null
}

interface GameEvent {
  id: string
  type: GameEventType
  week: number
  isApproved: boolean
  createdAt: string
  events: Event[]
  submittedBy: { id: string; name: string }
  approvedBy: { id: string; name: string } | null
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [gameEvents, setGameEvents] = useState<GameEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    try {
      const [eventsRes, gameEventsRes] = await Promise.all([
        fetch('/api/events'),
        fetch('/api/game-events'),
      ])
      if (eventsRes.ok) {
        const data = await eventsRes.json()
        setEvents(data)
      }
      if (gameEventsRes.ok) {
        const data = await gameEventsRes.json()
        setGameEvents(data)
      }
    } catch (error) {
      console.error('Failed to fetch:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Game event actions
  const handleApproveGameEvent = async (id: string) => {
    setProcessingId(id)
    try {
      const res = await fetch(`/api/game-events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isApproved: true }),
      })
      if (res.ok) fetchAll()
    } catch (error) {
      console.error('Failed to approve game event:', error)
    } finally {
      setProcessingId(null)
    }
  }

  const handleRejectGameEvent = async (id: string) => {
    setProcessingId(id)
    try {
      const res = await fetch(`/api/game-events/${id}`, { method: 'DELETE' })
      if (res.ok) fetchAll()
    } catch (error) {
      console.error('Failed to reject game event:', error)
    } finally {
      setProcessingId(null)
    }
  }

  // Standalone event actions
  const handleApproveEvent = async (id: string) => {
    setProcessingId(id)
    try {
      const res = await fetch(`/api/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isApproved: true }),
      })
      if (res.ok) fetchAll()
    } catch (error) {
      console.error('Failed to approve event:', error)
    } finally {
      setProcessingId(null)
    }
  }

  const handleRejectEvent = async (id: string) => {
    setProcessingId(id)
    try {
      const res = await fetch(`/api/events/${id}`, { method: 'DELETE' })
      if (res.ok) fetchAll()
    } catch (error) {
      console.error('Failed to reject event:', error)
    } finally {
      setProcessingId(null)
    }
  }

  // Standalone events (not part of a game event)
  const standaloneEvents = events.filter((e) => !e.gameEventId)
  const pendingStandalone = standaloneEvents.filter((e) => !e.isApproved)
  const approvedStandalone = standaloneEvents.filter((e) => e.isApproved)

  const pendingGameEvents = gameEvents.filter((ge) => !ge.isApproved)
  const approvedGameEvents = gameEvents.filter((ge) => ge.isApproved)

  const totalPending = pendingStandalone.length + pendingGameEvents.length
  const totalApproved = approvedStandalone.length + approvedGameEvents.length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Event Management</h1>
        <p className="text-muted-foreground">Approve or reject submitted events</p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-pending">Pending ({totalPending})</TabsTrigger>
          <TabsTrigger value="approved" data-testid="tab-approved">Approved ({totalApproved})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-4">
          {isLoading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading events...
              </CardContent>
            </Card>
          ) : totalPending === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Check className="h-12 w-12 text-green-500 mb-4" />
                <p className="text-lg font-medium">All caught up!</p>
                <p className="text-sm text-muted-foreground">No events pending approval</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingGameEvents.map((ge) => (
                <PendingGameEventCard
                  key={ge.id}
                  gameEvent={ge}
                  onApprove={handleApproveGameEvent}
                  onReject={handleRejectGameEvent}
                  isProcessing={processingId === ge.id}
                />
              ))}
              {pendingStandalone.map((event) => (
                <PendingEventCard
                  key={event.id}
                  event={event}
                  onApprove={handleApproveEvent}
                  onReject={handleRejectEvent}
                  isProcessing={processingId === event.id}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4 mt-4">
          {totalApproved === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No approved events yet
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {approvedGameEvents.map((ge) => (
                <ApprovedGameEventCard key={ge.id} gameEvent={ge} />
              ))}
              {approvedStandalone.map((event) => (
                <ApprovedEventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function PendingGameEventCard({
  gameEvent,
  onApprove,
  onReject,
  isProcessing,
}: {
  gameEvent: GameEvent
  onApprove: (id: string) => void
  onReject: (id: string) => void
  isProcessing: boolean
}) {
  const [expanded, setExpanded] = useState(true)
  const totalPoints = gameEvent.events.reduce((sum, e) => sum + e.points, 0)

  return (
    <Card data-testid={`game-event-${gameEvent.id}`} className="border-yellow-200">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-yellow-100 shrink-0">
            <Clock className="h-5 w-5 text-yellow-600" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium">{getGameEventTypeLabel(gameEvent.type)}</p>
              <Badge variant="secondary">Week {gameEvent.week}</Badge>
              <Badge variant="outline" className="text-xs">
                {gameEvent.events.length} scoring events
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Submitted by {gameEvent.submittedBy.name} •{' '}
              {formatRelativeTime(gameEvent.createdAt)}
            </p>
          </div>

          <div className="text-right mr-2">
            <p
              className={`text-xl font-bold ${
                totalPoints >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {totalPoints > 0 ? '+' : ''}
              {totalPoints}
            </p>
          </div>

          <div className="flex gap-2 shrink-0">
            <Button
              size="sm"
              data-testid={`approve-${gameEvent.id}`}
              aria-label="Approve event"
              onClick={() => onApprove(gameEvent.id)}
              disabled={isProcessing}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="destructive"
              data-testid={`reject-${gameEvent.id}`}
              aria-label="Reject event"
              onClick={() => onReject(gameEvent.id)}
              disabled={isProcessing}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Expandable event list */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-muted-foreground mt-3 hover:text-foreground transition-colors"
        >
          {expanded ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
          {expanded ? 'Hide' : 'Show'} derived events
        </button>

        {expanded && (
          <div className="mt-2 pt-2 border-t space-y-1">
            {gameEvent.events.map((event) => (
              <div key={event.id} className="flex items-center gap-3 px-2 py-1.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{event.contestant.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {getEventTypeLabel(event.type)}
                    {event.description && ` — ${event.description}`}
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

function PendingEventCard({
  event,
  onApprove,
  onReject,
  isProcessing,
}: {
  event: Event
  onApprove: (id: string) => void
  onReject: (id: string) => void
  isProcessing: boolean
}) {
  return (
    <Card data-testid={`event-${event.id}`}>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-yellow-100">
          <Clock className="h-5 w-5 text-yellow-600" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium">{event.contestant.name}</p>
            <Badge variant="secondary">Week {event.week}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{getEventTypeLabel(event.type)}</p>
          {event.description && (
            <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Submitted by {event.submittedBy.name} • {formatRelativeTime(event.createdAt)}
          </p>
        </div>

        <div className="text-right mr-4">
          <p
            className={`text-xl font-bold ${
              event.points >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {event.points > 0 ? '+' : ''}
            {event.points}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            data-testid={`approve-${event.id}`}
            aria-label="Approve event"
            onClick={() => onApprove(event.id)}
            disabled={isProcessing}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="destructive"
            data-testid={`reject-${event.id}`}
            aria-label="Reject event"
            onClick={() => onReject(event.id)}
            disabled={isProcessing}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ApprovedGameEventCard({ gameEvent }: { gameEvent: GameEvent }) {
  const [expanded, setExpanded] = useState(false)
  const totalPoints = gameEvent.events.reduce((sum, e) => sum + e.points, 0)

  return (
    <Card>
      <CardContent className="p-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-4 w-full text-left"
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100">
            <Check className="h-5 w-5 text-green-600" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium">{getGameEventTypeLabel(gameEvent.type)}</p>
              <Badge variant="secondary">Week {gameEvent.week}</Badge>
              <Badge variant="outline" className="text-xs">
                {gameEvent.events.length} events
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Approved by {gameEvent.approvedBy?.name || 'Unknown'}
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
          <div className="mt-3 pt-3 border-t space-y-1">
            {gameEvent.events.map((event) => (
              <div key={event.id} className="flex items-center gap-3 px-2 py-1">
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{event.contestant.name}</p>
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

function ApprovedEventCard({ event }: { event: Event }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100">
          <Check className="h-5 w-5 text-green-600" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium">{event.contestant.name}</p>
            <Badge variant="secondary">Week {event.week}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{getEventTypeLabel(event.type)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Approved by {event.approvedBy?.name || 'Unknown'}
          </p>
        </div>

        <div className="text-right">
          <p
            className={`text-xl font-bold ${
              event.points >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {event.points > 0 ? '+' : ''}
            {event.points}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
