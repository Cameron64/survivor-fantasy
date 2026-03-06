export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Settings, Trophy, Eye, Gamepad2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { EVENT_POINTS } from '@/lib/constants/scoring-constants'
import { EventType } from '@prisma/client'
import { ScoringConfigForm } from '@/components/admin/scoring-config-form'
import { PrivacySettingsForm } from '@/components/admin/privacy-settings-form'
import { FunSettingsForm } from '@/components/admin/fun-settings-form'

async function getLeague() {
  const league = await db.league.findFirst({
    orderBy: { createdAt: 'desc' },
  })
  return league
}

export default async function AdminLeaguePage() {
  const league = await getLeague()

  const scoringOverrides = (league?.scoringConfig as Partial<Record<EventType, number>>) || {}

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
            <Eye className="h-5 w-5" />
            Privacy
          </CardTitle>
          <CardDescription>
            Control who can view and interact with the league
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PrivacySettingsForm
            initialIsPublic={league?.isPublic ?? false}
            initialAllowGuestEvents={league?.allowGuestEvents ?? false}
            initialAllowUserEvents={league?.allowUserEvents ?? true}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5" />
            Fun Settings
          </CardTitle>
          <CardDescription>
            Optional features to spice up the league
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FunSettingsForm
            initialShowLastPlace={league?.showLastPlace ?? false}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Scoring Rules
          </CardTitle>
          <CardDescription>
            Point values for each event type. Changes apply retroactively to all existing events.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScoringConfigForm defaults={EVENT_POINTS} initialOverrides={scoringOverrides} />
        </CardContent>
      </Card>
    </div>
  )
}
