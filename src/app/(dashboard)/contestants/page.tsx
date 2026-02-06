import { db } from '@/lib/db'
import { calculateTotalPoints } from '@/lib/scoring'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Users } from 'lucide-react'

async function getContestants() {
  const contestants = await db.contestant.findMany({
    include: {
      events: {
        where: { isApproved: true },
      },
      tribeMemberships: {
        where: { toWeek: null },
        include: {
          tribe: {
            select: { id: true, name: true, color: true },
          },
        },
      },
      teams: {
        include: {
          team: {
            include: {
              user: {
                select: { id: true, name: true },
              },
            },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  return contestants.map((c) => ({
    ...c,
    totalPoints: calculateTotalPoints(c.events),
    draftedBy: c.teams[0]?.team.user || null,
    currentTribe: c.tribeMemberships[0]?.tribe || null,
  }))
}

export default async function ContestantsPage() {
  const contestants = await getContestants()

  // Group by tribe (prefer TribeMembership, fallback to string field)
  const tribes = contestants.reduce(
    (acc, contestant) => {
      const tribeName = contestant.currentTribe?.name || contestant.tribe || 'Unknown'
      if (!acc[tribeName]) {
        acc[tribeName] = { contestants: [], color: contestant.currentTribe?.color || null }
      }
      acc[tribeName].contestants.push(contestant)
      return acc
    },
    {} as Record<string, { contestants: typeof contestants; color: string | null }>
  )

  const activeCount = contestants.filter((c) => !c.isEliminated).length
  const eliminatedCount = contestants.filter((c) => c.isEliminated).length

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contestants</h1>
        <p className="text-muted-foreground">
          {activeCount} active, {eliminatedCount} eliminated
        </p>
      </div>

      {Object.entries(tribes).map(([tribeName, { contestants: tribeContestants, color }]) => (
        <div key={tribeName} className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            {color && (
              <span
                className="inline-block h-4 w-4 rounded-full"
                style={{ backgroundColor: color }}
              />
            )}
            <Badge variant="outline" className="text-sm">
              {tribeName}
            </Badge>
            <span className="text-sm text-muted-foreground">
              ({tribeContestants.filter((c) => !c.isEliminated).length} remaining)
            </span>
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tribeContestants.map((contestant) => (
              <Card
                key={contestant.id}
                className={contestant.isEliminated ? 'opacity-60' : ''}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <Avatar className="h-12 w-12">
                    {contestant.imageUrl && (
                      <AvatarImage src={contestant.imageUrl} alt={contestant.name} />
                    )}
                    <AvatarFallback>
                      {contestant.name.split(' ').map((n) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">
                        {contestant.nickname
                          ? `${contestant.nickname} (${contestant.name.split(' ')[0]})`
                          : contestant.name}
                      </p>
                      {contestant.isEliminated && (
                        <Badge variant="destructive" className="text-xs">
                          Out
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {contestant.totalPoints} pts
                      {contestant.originalSeasons && (
                        <span className="ml-1">
                          · S{contestant.originalSeasons.replace(/,/g, ', S')}
                        </span>
                      )}
                    </p>
                    {contestant.draftedBy && (
                      <p className="text-xs text-muted-foreground">
                        Drafted by {contestant.draftedBy.name}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {contestants.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No contestants yet</p>
            <p className="text-sm text-muted-foreground">
              Contestants will be added by admins before the season starts
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
