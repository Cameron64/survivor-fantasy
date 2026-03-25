import { db } from '@/lib/db'
import { calculateTotalPoints } from '@/lib/scoring'
import { cn, getValidImageUrl } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
            select: { id: true, name: true, color: true, buffImage: true, isMerge: true },
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
    imageUrl: getValidImageUrl(c.imageUrl, c.originalImageUrl),
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
      const tribeName = contestant.currentTribe?.name || 'Unknown'
      if (!acc[tribeName]) {
        acc[tribeName] = {
          contestants: [],
          color: contestant.currentTribe?.color || null,
          buffImage: contestant.currentTribe?.buffImage || null,
          isMerge: contestant.currentTribe?.isMerge || false,
        }
      }
      acc[tribeName].contestants.push(contestant)
      return acc
    },
    {} as Record<string, { contestants: typeof contestants; color: string | null; buffImage: string | null; isMerge: boolean }>
  )

  const activeCount = contestants.filter((c) => !c.isEliminated).length
  const eliminatedCount = contestants.filter((c) => c.isEliminated).length

  return (
    <div className="space-y-6 pb-20 lg:pb-6 overflow-hidden">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contestants</h1>
        <p className="text-muted-foreground">
          {activeCount} active, {eliminatedCount} eliminated
        </p>
      </div>

      {Object.entries(tribes).map(([tribeName, { contestants: tribeContestants, color, buffImage, isMerge }]) => (
        <div key={tribeName} className="space-y-4">
          <div className="relative overflow-hidden rounded-lg px-4 py-3">
            {buffImage && !isMerge && (
              <div
                className="absolute inset-0 z-0 bg-cover bg-center opacity-[0.12] dark:opacity-[0.10]"
                style={{ backgroundImage: `url(${buffImage})` }}
              />
            )}
            {color && !isMerge && (
              <div
                className="absolute inset-0 z-0 opacity-[0.10]"
                style={{ backgroundColor: color }}
              />
            )}
            <h2 className="relative z-10 text-xl font-semibold flex items-center gap-2">
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
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {tribeContestants.map((contestant) => (
              <Card
                key={contestant.id}
                className={cn(
                  'relative overflow-hidden',
                  contestant.isEliminated && 'opacity-60'
                )}
              >
                {buffImage && !isMerge && (
                  <div
                    className="absolute inset-0 z-0 bg-cover bg-center opacity-[0.12] dark:opacity-[0.10]"
                    style={{ backgroundImage: `url(${buffImage})` }}
                  />
                )}
                {color && !isMerge && (
                  <div
                    className="absolute inset-0 z-0 opacity-[0.10]"
                    style={{ backgroundColor: color }}
                  />
                )}

                <div className="relative z-10 flex h-full">
                  {/* Photo slice */}
                  <div
                    className="relative w-16 sm:w-20 shrink-0 bg-muted"
                    style={color ? { borderBottom: `3px solid ${color}` } : undefined}
                  >
                    {contestant.imageUrl ? (
                      <img
                        src={contestant.imageUrl}
                        alt={contestant.nickname || contestant.name}
                        className="absolute inset-0 w-full h-full object-cover object-top"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground font-medium text-sm">
                        {contestant.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 p-2.5 flex flex-col justify-center">
                    <p className="font-medium text-sm truncate">
                      {contestant.nickname || contestant.name.split(' ')[0]}
                    </p>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-lg font-bold tabular-nums">{contestant.totalPoints}</span>
                      <span className="text-[11px] text-muted-foreground">pts</span>
                    </div>
                    {contestant.isEliminated && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0 mt-1 w-fit">
                        Out
                      </Badge>
                    )}
                    {contestant.originalSeasons && (
                      <p className="text-[11px] text-muted-foreground mt-1 truncate">
                        S{contestant.originalSeasons.replace(/,/g, ', S')}
                      </p>
                    )}
                    {contestant.draftedBy && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {contestant.draftedBy.name}
                      </p>
                    )}
                  </div>
                </div>
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
