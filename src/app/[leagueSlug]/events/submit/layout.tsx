import { getCurrentUser } from '@/lib/auth'
import { getLeagueSettings } from '@/lib/league-settings'
import { Card, CardContent } from '@/components/ui/card'
import { LogIn, Lock } from 'lucide-react'
import Link from 'next/link'
import { SubmitProvider } from './_lib/submit-context'
import { WizardHeader } from './_lib/wizard-header'

export default async function SubmitLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  const settings = await getLeagueSettings()

  // Authenticated user — check if user events are disabled
  if (user) {
    if (!settings.allowUserEvents) {
      if (user.role !== 'ADMIN' && user.role !== 'MODERATOR') {
        return (
          <div className="max-w-lg mx-auto space-y-6 pb-20 lg:pb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Log Game Event</h1>
              <p className="text-sm text-muted-foreground">Submit events for scoring</p>
            </div>
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Lock className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Event submissions are disabled</p>
                <p className="text-sm text-muted-foreground text-center">
                  Only admins and moderators can submit events right now.
                </p>
              </CardContent>
            </Card>
          </div>
        )
      }
    }
  } else if (!settings.allowGuestEvents) {
    // Guest and guest events not allowed
    return (
      <div className="max-w-lg mx-auto space-y-6 pb-20 lg:pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Log Game Event</h1>
          <p className="text-sm text-muted-foreground">Submit events for scoring</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <LogIn className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Sign in to submit events</p>
            <p className="text-sm text-muted-foreground text-center mb-4">
              You need an account to log game events for scoring.
            </p>
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <SubmitProvider>
      <div className="max-w-lg mx-auto space-y-6 pb-20 lg:pb-6">
        <WizardHeader />
        {children}
      </div>
    </SubmitProvider>
  )
}
