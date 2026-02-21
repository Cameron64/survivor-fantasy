export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Settings, Trophy } from 'lucide-react'
import { formatDate } from '@/lib/utils'

async function getLeague() {
  const league = await db.league.findFirst({
    orderBy: { createdAt: 'desc' },
  })
  return league
}

export default async function AdminLeaguePage() {
  const league = await getLeague()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">League Settings</h1>
        <p className="text-muted-foreground">Manage league configuration</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            League Info
          </CardTitle>
          <CardDescription>Current league configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {league ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">League Name</p>
                  <p className="font-medium">{league.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Season</p>
                  <p className="font-medium">Season {league.season}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={league.isActive ? 'success' : 'secondary'}>
                    {league.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">{formatDate(league.createdAt)}</p>
                </div>
              </div>

              {league.paymentInfo && (
                <div>
                  <p className="text-sm text-muted-foreground">Payment Info</p>
                  <p className="font-medium">{league.paymentInfo}</p>
                </div>
              )}

              {league.slackWebhook && (
                <div>
                  <p className="text-sm text-muted-foreground">Slack Notifications</p>
                  <Badge variant="secondary">Configured</Badge>
                </div>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">
              No league configured. Run the seed script to create one.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Scoring Rules
          </CardTitle>
          <CardDescription>Point values for each event type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <h4 className="font-medium text-sm text-primary mb-2">Challenge Performance</h4>
              <ul className="space-y-1 text-sm">
                <li className="flex justify-between">
                  <span>Individual Immunity Win</span>
                  <span className="text-green-600">+5</span>
                </li>
                <li className="flex justify-between">
                  <span>Reward Challenge Win</span>
                  <span className="text-green-600">+3</span>
                </li>
                <li className="flex justify-between">
                  <span>Team Challenge Win</span>
                  <span className="text-green-600">+1</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-sm text-primary mb-2">Strategy</h4>
              <ul className="space-y-1 text-sm">
                <li className="flex justify-between">
                  <span>Correct Vote</span>
                  <span className="text-green-600">+2</span>
                </li>
                <li className="flex justify-between">
                  <span>Idol Play Success</span>
                  <span className="text-green-600">+5</span>
                </li>
                <li className="flex justify-between">
                  <span>Idol Find</span>
                  <span className="text-green-600">+3</span>
                </li>
                <li className="flex justify-between">
                  <span>Fire Making Win</span>
                  <span className="text-green-600">+5</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-sm text-primary mb-2">Social Game</h4>
              <ul className="space-y-1 text-sm">
                <li className="flex justify-between">
                  <span>Zero Votes Received</span>
                  <span className="text-green-600">+1</span>
                </li>
                <li className="flex justify-between">
                  <span>Survived with Votes</span>
                  <span className="text-green-600">+2</span>
                </li>
                <li className="flex justify-between">
                  <span>Caused Blindside</span>
                  <span className="text-green-600">+2</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-sm text-primary mb-2">Endgame</h4>
              <ul className="space-y-1 text-sm">
                <li className="flex justify-between">
                  <span>Made Jury</span>
                  <span className="text-green-600">+5</span>
                </li>
                <li className="flex justify-between">
                  <span>Finalist</span>
                  <span className="text-green-600">+10</span>
                </li>
                <li className="flex justify-between">
                  <span>Winner</span>
                  <span className="text-green-600">+20</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-sm text-destructive mb-2">Deductions</h4>
              <ul className="space-y-1 text-sm">
                <li className="flex justify-between">
                  <span>Voted Out with Idol</span>
                  <span className="text-red-600">-3</span>
                </li>
                <li className="flex justify-between">
                  <span>Quit</span>
                  <span className="text-red-600">-10</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
