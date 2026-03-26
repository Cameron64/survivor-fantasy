import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { LeaguePickerCard } from '@/components/leagues/league-picker-card'

async function getLeaguesData() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  const memberships = await db.leagueMembership.findMany({
    where: { userId: user.id },
    include: {
      league: {
        include: {
          episodes: {
            orderBy: { number: 'desc' },
            take: 1,
            select: { title: true, airDate: true, number: true },
          },
          _count: {
            select: { memberships: true },
          },
        },
      },
    },
    orderBy: { joinedAt: 'desc' },
  })

  return { user, memberships }
}

export default async function LeaguesPage() {
  const { memberships } = await getLeaguesData()

  if (memberships.length === 0) {
    redirect('/leagues/find')
  }

  if (memberships.length === 1) {
    redirect(`/leagues/${memberships[0].league.slug ?? memberships[0].league.id}/leaderboard`)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Your Leagues</h1>
          <p className="text-muted-foreground mt-1">
            Select a league to view its leaderboard.
          </p>
        </div>

        <div className="space-y-3">
          {memberships.map((membership) => {
            const { league, role } = membership
            const lastEpisode = league.episodes[0]
              ? {
                  number: league.episodes[0].number,
                  title: league.episodes[0].title ?? null,
                  airDate: league.episodes[0].airDate,
                }
              : null

            return (
              <LeaguePickerCard
                key={league.id}
                leagueName={league.name}
                leagueSlug={league.slug ?? league.id}
                season={league.season}
                role={role}
                memberCount={league._count.memberships}
                isActive={league.isActive}
                lastEpisode={lastEpisode}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
