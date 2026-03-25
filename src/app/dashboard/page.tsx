import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trophy, Plus, Users } from 'lucide-react'

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  const memberships = await db.leagueMembership.findMany({
    where: { user: { clerkId: userId } },
    include: { league: true },
    orderBy: { joinedAt: 'desc' },
  })

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Leagues</h1>
            <p className="text-muted-foreground mt-1">
              All leagues you&apos;re a member of
            </p>
          </div>
          <Button asChild>
            <Link href="/create">
              <Plus className="h-4 w-4 mr-2" />
              Create League
            </Link>
          </Button>
        </div>

        {memberships.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
              <Trophy className="h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">No leagues yet</p>
              <p className="text-sm text-muted-foreground text-center">
                You haven&apos;t joined any leagues. Create one or ask a commissioner for an invite link.
              </p>
              <Button asChild>
                <Link href="/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Create a League
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {memberships.map(({ league, role }) => (
              <Link key={league.id} href={`/${league.slug}`}>
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{league.name}</CardTitle>
                      <Badge variant={role === 'COMMISSIONER' ? 'default' : role === 'MODERATOR' ? 'secondary' : 'outline'}>
                        {role}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Trophy className="h-3.5 w-3.5" />
                        Season {league.season}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {league.slug}
                      </span>
                      <Badge variant={league.isActive ? 'success' : 'secondary'} className="ml-auto">
                        {league.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
