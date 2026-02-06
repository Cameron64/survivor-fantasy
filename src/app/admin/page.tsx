import { db } from '@/lib/db'
import { checkSeasonReadiness } from '@/lib/season-readiness'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Calendar, Trophy, Clock, CheckCircle2, XCircle } from 'lucide-react'
import Link from 'next/link'

async function getStats() {
  const [userCount, contestantCount, eventCount, pendingEventCount, teamCount] =
    await Promise.all([
      db.user.count(),
      db.contestant.count(),
      db.event.count({ where: { isApproved: true } }),
      db.event.count({ where: { isApproved: false } }),
      db.team.count(),
    ])

  const paidUsers = await db.user.count({ where: { isPaid: true } })
  const activeContestants = await db.contestant.count({ where: { isEliminated: false } })

  return {
    userCount,
    paidUsers,
    contestantCount,
    activeContestants,
    eventCount,
    pendingEventCount,
    teamCount,
  }
}

export default async function AdminOverviewPage() {
  const [stats, readiness] = await Promise.all([getStats(), checkSeasonReadiness()])

  const setupItems = [
    {
      label: 'Add contestants',
      done: readiness.checks.hasContestants,
      detail: `${readiness.details.contestantCount} added`,
      href: '/admin/contestants',
    },
    {
      label: 'Create tribes',
      done: readiness.checks.hasTribes,
      detail: `${readiness.details.tribeCount} created`,
      href: '/admin/tribes',
    },
    {
      label: 'Assign all contestants to tribes',
      done: readiness.checks.allContestantsAssigned,
      detail: readiness.details.unassignedCount > 0
        ? `${readiness.details.unassignedCount} unassigned`
        : 'All assigned',
      href: '/admin/contestants',
    },
    {
      label: 'Set up episode schedule',
      done: readiness.checks.hasEpisodes,
      detail: `${readiness.details.episodeCount} scheduled`,
      href: '/admin/episodes',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Overview</h1>
        <p className="text-muted-foreground">League management dashboard</p>
      </div>

      {!readiness.isReady && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Season Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {setupItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 rounded-lg p-2 -mx-2 hover:bg-accent transition-colors"
              >
                {item.done ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                )}
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.userCount}</div>
            <p className="text-xs text-muted-foreground">
              {stats.paidUsers} paid
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contestants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.contestantCount}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeContestants} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.eventCount}</div>
            <p className="text-xs text-muted-foreground">
              total scoring events
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Events</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingEventCount}</div>
            <p className="text-xs text-muted-foreground">
              awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teams</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.teamCount}</div>
            <p className="text-xs text-muted-foreground">
              drafted teams
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
