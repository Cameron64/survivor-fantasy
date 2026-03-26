import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { PublicHeader } from '@/components/shared/public-header'
import { LeagueList } from '@/components/leagues/league-list'

export default async function FindLeaguePage() {
  const { userId } = await auth()
  const currentUser = userId ? await getCurrentUser() : null

  const rawLeagues = await db.league.findMany({
    where: { isPublic: true, isActive: true, slug: { not: null } },
    select: {
      id: true,
      name: true,
      slug: true,
      season: true,
    },
    orderBy: { createdAt: 'desc' },
  })
  const leagues = rawLeagues.filter((l): l is typeof l & { slug: string } => l.slug !== null)

  const hasTeam = !!currentUser?.team

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="max-w-5xl mx-auto py-10 px-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Find a League</h1>
          <p className="text-muted-foreground mt-1">Browse public leagues and join the competition.</p>
        </div>
        <LeagueList
          leagues={leagues}
          hasTeam={hasTeam}
          isAuthenticated={!!currentUser}
        />
      </main>
    </div>
  )
}
