'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, Plus, Clock } from 'lucide-react'
import { getContestantDisplayName } from '@/lib/utils'
import { WeekGroup, type TimelineItem, type WeekData } from '@/components/events/week-group'
import { GameEventCard } from '@/components/events/game-event-card'
import { StandaloneEventCard } from '@/components/events/standalone-event-card'
import type { EventType } from '@prisma/client'

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
  type: string
  week: number
  data?: unknown
  isApproved: boolean
  createdAt: string
  events: Event[]
  submittedBy: { id: string; name: string }
  approvedBy: { id: string; name: string } | null
}

interface Episode {
  id: string
  number: number
  title: string | null
  airDate: string
}

export default function EventsPage() {
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [gameEvents, setGameEvents] = useState<GameEvent[]>([])
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set())

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [eventsRes, gameEventsRes, episodesRes] = await Promise.all([
        fetch('/api/events'),
        fetch('/api/game-events'),
        fetch('/api/episodes'),
      ])

      if (eventsRes.ok) {
        const data = await eventsRes.json()
        if (Array.isArray(data)) setEvents(data)
      }
      if (gameEventsRes.ok) {
        const data = await gameEventsRes.json()
        if (Array.isArray(data)) setGameEvents(data)
      }
      if (episodesRes.ok) {
        const data = await episodesRes.json()
        if (Array.isArray(data)) setEpisodes(data)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Build contestant name + avatar maps from all event data
  const { contestantNames, contestantAvatars } = useMemo(() => {
    const names: Record<string, string> = {}
    const avatars: Record<string, { imageUrl?: string | null; tribeColor?: string | null; tribeBuffImage?: string | null; tribeIsMerge?: boolean | null }> = {}

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

  // Episode number → title map
  const episodeTitles = useMemo(() => {
    const map: Record<number, string | null> = {}
    for (const ep of episodes) {
      map[ep.number] = ep.title
    }
    return map
  }, [episodes])

  // Separate approved vs pending
  const standaloneEvents = events.filter((e) => !e.gameEventId)
  const approvedStandalone = standaloneEvents.filter((e) => e.isApproved)
  const pendingStandalone = standaloneEvents.filter((e) => !e.isApproved)
  const approvedGameEvents = gameEvents.filter((ge) => ge.isApproved)
  const pendingGameEvents = gameEvents.filter((ge) => !ge.isApproved)

  const totalApproved = approvedStandalone.length + approvedGameEvents.length
  const totalPending = pendingStandalone.length + pendingGameEvents.length

  // Group approved items by week
  const weekGroups = useMemo(() => {
    const items: TimelineItem[] = []

    for (const ge of approvedGameEvents) {
      items.push({
        kind: 'game-event',
        id: ge.id,
        type: ge.type,
        week: ge.week,
        data: ge.data,
        isApproved: ge.isApproved,
        createdAt: ge.createdAt,
        events: ge.events,
        submittedBy: ge.submittedBy,
        approvedBy: ge.approvedBy,
      })
    }

    for (const e of approvedStandalone) {
      items.push({
        kind: 'standalone',
        id: e.id,
        type: e.type,
        week: e.week,
        points: e.points,
        description: e.description,
        isApproved: e.isApproved,
        createdAt: e.createdAt,
        contestant: e.contestant,
        submittedBy: e.submittedBy,
      })
    }

    // Group by week
    const byWeek = new Map<number, TimelineItem[]>()
    for (const item of items) {
      const weekItems = byWeek.get(item.week)
      if (weekItems) {
        weekItems.push(item)
      } else {
        byWeek.set(item.week, [item])
      }
    }

    // Build WeekData and sort descending
    const weeks: WeekData[] = Array.from(byWeek.entries()).map(([week, weekItems]) => {
      // Sort items within week: game events first, then by createdAt desc
      weekItems.sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === 'game-event' ? -1 : 1
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })

      let totalPoints = 0
      let eventCount = 0
      for (const item of weekItems) {
        if (item.kind === 'game-event') {
          totalPoints += item.events.reduce((sum, e) => sum + e.points, 0)
          eventCount++
        } else {
          totalPoints += item.points
          eventCount++
        }
      }

      return {
        week,
        episodeTitle: episodeTitles[week] ?? null,
        items: weekItems,
        totalPoints,
        eventCount,
      }
    })

    weeks.sort((a, b) => b.week - a.week)
    return weeks
  }, [approvedGameEvents, approvedStandalone, episodeTitles])

  // Auto-expand most recent week on first load
  useEffect(() => {
    if (weekGroups.length > 0 && expandedWeeks.size === 0) {
      setExpandedWeeks(new Set([weekGroups[0].week]))
    }
  }, [weekGroups]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleWeek = (week: number) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev)
      if (next.has(week)) {
        next.delete(week)
      } else {
        next.add(week)
      }
      return next
    })
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-6 overflow-hidden">
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

        <TabsContent value="approved" className="space-y-3">
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
              {weekGroups.map((wd) => (
                <WeekGroup
                  key={wd.week}
                  weekData={wd}
                  isExpanded={expandedWeeks.has(wd.week)}
                  onToggle={() => toggleWeek(wd.week)}
                  contestantNames={contestantNames}
                  contestantAvatars={contestantAvatars}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-3">
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
            <div className="space-y-2">
              {pendingGameEvents.map((ge) => (
                <GameEventCard
                  key={ge.id}
                  gameEvent={ge}
                  contestantNames={contestantNames}
                  isPending
                />
              ))}
              {pendingStandalone.map((event) => (
                <StandaloneEventCard
                  key={event.id}
                  event={event}
                  contestantNames={contestantNames}
                  isPending
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
