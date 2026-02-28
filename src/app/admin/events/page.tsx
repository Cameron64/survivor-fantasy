'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Check, Trash2 } from 'lucide-react'
import { getEventTypeLabel } from '@/lib/scoring'
import { getGameEventTypeLabel } from '@/lib/event-derivation'
import { EventType, GameEventType } from '@prisma/client'
import { getContestantDisplayName } from '@/lib/utils'
import { GameEventCard } from '@/components/events/game-event-card'
import { StandaloneEventCard } from '@/components/events/standalone-event-card'
import type { ContestantAvatarMap } from '@/components/events/week-group'

interface TribeMembership {
  tribe: { id: string; name: string; color: string; buffImage?: string | null; isMerge?: boolean }
}

interface Contestant {
  id: string
  name: string
  nickname?: string | null
  imageUrl?: string | null
  tribe: string | null
  isEliminated: boolean
  tribeMemberships?: TribeMembership[]
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
  type: GameEventType
  week: number
  data?: unknown
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
  const [selectedGameEventIds, setSelectedGameEventIds] = useState<Set<string>>(new Set())
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set())
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'event' | 'gameEvent' | 'bulkEvents' | 'bulkGameEvents'
    ids: string[]
    label: string
  } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

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

  // Build contestant name + avatar maps
  const { contestantNames, contestantAvatars } = useMemo(() => {
    const names: Record<string, string> = {}
    const avatars: ContestantAvatarMap = {}

    function collect(c: Contestant) {
      if (!names[c.id]) {
        names[c.id] = getContestantDisplayName(c)
        avatars[c.id] = {
          imageUrl: c.imageUrl,
          tribeColor: c.tribeMemberships?.[0]?.tribe.color ?? null,
          tribeBuffImage: c.tribeMemberships?.[0]?.tribe.buffImage ?? null,
          tribeIsMerge: c.tribeMemberships?.[0]?.tribe.isMerge ?? null,
        }
      }
    }

    for (const ge of gameEvents) {
      for (const e of ge.events) collect(e.contestant)
    }
    for (const e of events) collect(e.contestant)

    return { contestantNames: names, contestantAvatars: avatars }
  }, [gameEvents, events])

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

  // Selection helpers
  const toggleGameEventSelection = (id: string) => {
    setSelectedGameEventIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleEventSelection = (id: string) => {
    setSelectedEventIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Separate by status
  const standaloneEvents = events.filter((e) => !e.gameEventId)
  const pendingStandalone = standaloneEvents.filter((e) => !e.isApproved)
  const approvedStandalone = standaloneEvents.filter((e) => e.isApproved)
  const pendingGameEvents = gameEvents.filter((ge) => !ge.isApproved)
  const approvedGameEvents = gameEvents.filter((ge) => ge.isApproved)

  const totalPending = pendingStandalone.length + pendingGameEvents.length
  const totalApproved = approvedStandalone.length + approvedGameEvents.length
  const totalSelected = selectedGameEventIds.size + selectedEventIds.size

  const selectAllApproved = () => {
    setSelectedGameEventIds(new Set(approvedGameEvents.map((ge) => ge.id)))
    setSelectedEventIds(new Set(approvedStandalone.map((e) => e.id)))
  }

  const clearSelection = () => {
    setSelectedGameEventIds(new Set())
    setSelectedEventIds(new Set())
  }

  const handleBulkDelete = () => {
    const gameEventCount = selectedGameEventIds.size
    const derivedCount = approvedGameEvents
      .filter((ge) => selectedGameEventIds.has(ge.id))
      .reduce((sum, ge) => sum + ge.events.length, 0)
    const standaloneCount = selectedEventIds.size

    const parts: string[] = []
    if (gameEventCount > 0) parts.push(`${gameEventCount} game event${gameEventCount > 1 ? 's' : ''} (${derivedCount} scoring events)`)
    if (standaloneCount > 0) parts.push(`${standaloneCount} standalone event${standaloneCount > 1 ? 's' : ''}`)

    if (gameEventCount > 0 && standaloneCount > 0) {
      setDeleteConfirm({ type: 'bulkGameEvents', ids: Array.from(selectedGameEventIds).concat(Array.from(selectedEventIds)), label: parts.join(' and ') })
    } else if (gameEventCount > 0) {
      setDeleteConfirm({ type: 'bulkGameEvents', ids: Array.from(selectedGameEventIds), label: parts[0] })
    } else {
      setDeleteConfirm({ type: 'bulkEvents', ids: Array.from(selectedEventIds), label: parts[0] })
    }
  }

  const handleConfirmDeleteMixed = async () => {
    if (!deleteConfirm) return
    setIsDeleting(true)
    try {
      const { type, ids } = deleteConfirm
      if (type === 'event') {
        await fetch(`/api/events/${ids[0]}`, { method: 'DELETE' })
      } else if (type === 'gameEvent') {
        await fetch(`/api/game-events/${ids[0]}`, { method: 'DELETE' })
      } else if (type === 'bulkEvents') {
        await fetch('/api/events/bulk-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        })
      } else if (type === 'bulkGameEvents') {
        const geIds = Array.from(selectedGameEventIds)
        const evIds = Array.from(selectedEventIds)
        const promises: Promise<Response>[] = []
        if (geIds.length > 0) {
          promises.push(
            fetch('/api/game-events/bulk-delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ids: geIds }),
            })
          )
        }
        if (evIds.length > 0) {
          promises.push(
            fetch('/api/events/bulk-delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ids: evIds }),
            })
          )
        }
        await Promise.all(promises)
      }
      setSelectedGameEventIds(new Set())
      setSelectedEventIds(new Set())
      fetchAll()
    } catch (error) {
      console.error('Failed to delete:', error)
    } finally {
      setIsDeleting(false)
      setDeleteConfirm(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Event Management</h1>
        <p className="text-muted-foreground">Approve, reject, or delete submitted events</p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-pending">Pending ({totalPending})</TabsTrigger>
          <TabsTrigger value="approved" data-testid="tab-approved">Approved ({totalApproved})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3 mt-4">
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
                <GameEventCard
                  key={ge.id}
                  gameEvent={ge}
                  contestantNames={contestantNames}
                  contestantAvatars={contestantAvatars}
                  isPending
                  actions={
                    <>
                      <Button
                        size="sm"
                        data-testid={`approve-${ge.id}`}
                        aria-label="Approve event"
                        onClick={() => handleApproveGameEvent(ge.id)}
                        disabled={processingId === ge.id}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        data-testid={`reject-${ge.id}`}
                        aria-label="Reject event"
                        onClick={() => handleRejectGameEvent(ge.id)}
                        disabled={processingId === ge.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  }
                />
              ))}
              {pendingStandalone.map((event) => (
                <StandaloneEventCard
                  key={event.id}
                  event={event}
                  contestantNames={contestantNames}
                  contestantAvatars={contestantAvatars}
                  isPending
                  actions={
                    <>
                      <Button
                        size="sm"
                        data-testid={`approve-${event.id}`}
                        aria-label="Approve event"
                        onClick={() => handleApproveEvent(event.id)}
                        disabled={processingId === event.id}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        data-testid={`reject-${event.id}`}
                        aria-label="Reject event"
                        onClick={() => handleRejectEvent(event.id)}
                        disabled={processingId === event.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  }
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
            <>
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={totalSelected === totalApproved ? clearSelection : selectAllApproved}
                >
                  {totalSelected === totalApproved ? 'Deselect all' : 'Select all'}
                </Button>
                {totalSelected > 0 && (
                  <>
                    <span className="text-sm text-muted-foreground">
                      {totalSelected} selected
                    </span>
                    <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete selected
                    </Button>
                    <Button variant="ghost" size="sm" onClick={clearSelection}>
                      Clear
                    </Button>
                  </>
                )}
              </div>

              <div className="space-y-3">
                {approvedGameEvents.map((ge) => (
                  <div key={ge.id} className={`flex items-start gap-3 ${selectedGameEventIds.has(ge.id) ? 'ring-2 ring-destructive/50 rounded-lg' : ''}`}>
                    <Checkbox
                      className="mt-4 ml-1 shrink-0"
                      checked={selectedGameEventIds.has(ge.id)}
                      onCheckedChange={() => toggleGameEventSelection(ge.id)}
                      aria-label={`Select ${getGameEventTypeLabel(ge.type)} Week ${ge.week}`}
                    />
                    <div className="flex-1 min-w-0">
                      <GameEventCard
                        gameEvent={ge}
                        contestantNames={contestantNames}
                        contestantAvatars={contestantAvatars}
                        actions={
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            aria-label="Delete event"
                            onClick={() =>
                              setDeleteConfirm({
                                type: 'gameEvent',
                                ids: [ge.id],
                                label: `${getGameEventTypeLabel(ge.type)} (Week ${ge.week}) and its ${ge.events.length} scoring events`,
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        }
                      />
                    </div>
                  </div>
                ))}
                {approvedStandalone.map((event) => (
                  <div key={event.id} className={`flex items-center gap-3 ${selectedEventIds.has(event.id) ? 'ring-2 ring-destructive/50 rounded-lg' : ''}`}>
                    <Checkbox
                      className="ml-1 shrink-0"
                      checked={selectedEventIds.has(event.id)}
                      onCheckedChange={() => toggleEventSelection(event.id)}
                      aria-label={`Select ${event.contestant.name} ${getEventTypeLabel(event.type)}`}
                    />
                    <div className="flex-1 min-w-0">
                      <StandaloneEventCard
                        event={event}
                        contestantNames={contestantNames}
                        contestantAvatars={contestantAvatars}
                        actions={
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            aria-label="Delete event"
                            onClick={() =>
                              setDeleteConfirm({
                                type: 'event',
                                ids: [event.id],
                                label: `${event.contestant.name} — ${getEventTypeLabel(event.type)} (Week ${event.week})`,
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={deleteConfirm !== null} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete events</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deleteConfirm?.label}? This will remove the scoring
              data and affect the leaderboard. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDeleteMixed}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
