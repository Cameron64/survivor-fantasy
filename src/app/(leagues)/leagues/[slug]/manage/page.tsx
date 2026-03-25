import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trophy, Users, AlertTriangle, ArrowLeft, ExternalLink, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { CommissionerActions } from './commissioner-actions'
import { getGameEventTypeLabel } from '@/lib/event-derivation'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function ManagePage({ params }: Props) {
  const { slug } = await params

  const [currentUser, league] = await Promise.all([
    requireUser(),
    db.league.findFirst({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        draft: {
          select: {
            id: true,
            status: true,
            currentPick: true,
            currentRound: true,
            isComplete: true,
            draftOrder: true,
            picksPerUser: true,
          },
        },
      },
    }),
  ])

  if (!league) {
    notFound()
  }

  const isCommissioner = currentUser.role === 'ADMIN' || currentUser.role === 'MODERATOR'

  // Resolve draft phase
  const draft = league.draft
  const draftPhase: 'WAITING' | 'ACTIVE' | 'COMPLETE' = !draft
    ? 'WAITING'
    : draft.isComplete || draft.status === 'COMPLETE'
      ? 'COMPLETE'
      : 'ACTIVE'

  // Load members (all users with a team, or all users)
  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      team: {
        select: {
          _count: { select: { contestants: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  // Load draft order names if draft exists
  const draftOrderNames: string[] = []
  if (draft) {
    const draftOrderIds = draft.draftOrder as string[]
    for (const userId of draftOrderIds) {
      const u = users.find((u) => u.id === userId)
      draftOrderNames.push(u?.name ?? 'Unknown')
    }
  }

  // Load pending game events for COMPLETE phase
  const pendingGameEvents = draftPhase === 'COMPLETE'
    ? await db.gameEvent.findMany({
        where: { isApproved: false },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          week: true,
          createdAt: true,
          submittedBy: { select: { name: true } },
        },
        take: 20,
      })
    : []

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const inviteUrl = `${appUrl}/sign-up`

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-8 px-4">
      <div>
        <Link
          href={`/leagues/${slug}/leaderboard`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Leaderboard
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{league.name}</h1>
            <p className="text-muted-foreground">Commissioner Dashboard</p>
          </div>
          <Badge variant={draftPhase === 'WAITING' ? 'secondary' : draftPhase === 'ACTIVE' ? 'default' : 'outline'}>
            {draftPhase === 'WAITING' ? 'Pre-Draft' : draftPhase === 'ACTIVE' ? 'Draft Active' : 'Season Active'}
          </Badge>
        </div>
      </div>

      {/* WAITING phase: member roster + invite + initialize draft */}
      {draftPhase === 'WAITING' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Members
                <Badge variant="secondary">{users.length}</Badge>
              </CardTitle>
              <CardDescription>
                Players who have joined. Share the invite link to add more.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between py-1">
                    <div>
                      <span className="text-sm font-medium">{u.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{u.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {(u.role === 'ADMIN' || u.role === 'MODERATOR') && (
                        <Badge variant="outline" className="text-xs">
                          {u.role === 'ADMIN' ? 'Admin' : 'Mod'}
                        </Badge>
                      )}
                      {u.team && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {inviteUrl && (
                <CommissionerActions
                  phase="WAITING"
                  leagueId={league.id}
                  inviteUrl={inviteUrl}
                  isCommissioner={isCommissioner}
                />
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ACTIVE phase: who's joined, start draft, draft order preview */}
      {draftPhase === 'ACTIVE' && draft && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Draft Order
              </CardTitle>
              <CardDescription>
                Round {draft.currentRound} · Pick {draft.currentPick} of {draftOrderNames.length * (draft.picksPerUser ?? 2)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {draftOrderNames.map((name, i) => (
                  <div key={i} className="flex items-center gap-3 py-1">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-muted text-sm font-bold">
                      {i + 1}
                    </div>
                    <span className="text-sm font-medium">{name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Members
                <Badge variant="secondary">{users.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between py-1">
                  <span className="text-sm font-medium">{u.name}</span>
                  {u.team && u.team._count.contestants > 0 ? (
                    <Badge variant="secondary">{u.team._count.contestants} picks</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">No picks yet</span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {isCommissioner && (
            <CommissionerActions
              phase="ACTIVE"
              leagueId={league.id}
              isCommissioner={isCommissioner}
            />
          )}
        </>
      )}

      {/* COMPLETE phase: pending events + link to admin */}
      {draftPhase === 'COMPLETE' && (
        <>
          {/* Warning banner — GameEvent has no leagueId yet, so always shows all */}
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
            <CardContent className="flex items-start gap-3 pt-4">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-300">
                Events are not yet scoped per-league. Showing all pending events across the app.
                Once <code className="font-mono text-xs">GameEvent.leagueId</code> is added, this
                will filter to your league only.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pending Events</CardTitle>
              <CardDescription>
                Game events awaiting approval.{' '}
                {pendingGameEvents.length === 0
                  ? 'All caught up!'
                  : `${pendingGameEvents.length} pending`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingGameEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending events.</p>
              ) : (
                <div className="space-y-2">
                  {pendingGameEvents.map((ge) => (
                    <div
                      key={ge.id}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div>
                        <span className="text-sm font-medium">
                          {getGameEventTypeLabel(ge.type)} — Week {ge.week}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          Submitted by {ge.submittedBy.name}
                        </p>
                      </div>
                      <Badge variant="outline">Pending</Badge>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4">
                <Button asChild variant="outline" size="sm">
                  <Link href="/admin/events">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Manage in Admin
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Final Standings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between py-1">
                    <span className="text-sm font-medium">{u.name}</span>
                    {u.team ? (
                      <Badge variant="secondary">{u.team._count.contestants} players</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">No team</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/leagues/${slug}/leaderboard`}>
                    <Trophy className="h-4 w-4 mr-2" />
                    View Leaderboard
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
