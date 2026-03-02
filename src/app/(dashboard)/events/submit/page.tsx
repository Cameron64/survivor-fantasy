import { auth } from '@clerk/nextjs/server'
import { getLeagueSettings } from '@/lib/league-settings'
import { Card, CardContent } from '@/components/ui/card'
import { LogIn } from 'lucide-react'
import Link from 'next/link'
import SubmitEventForm from './submit-event-form'

export default async function SubmitEventPage() {
  const { userId } = await auth()

  // Authenticated users can always submit
  if (userId) {
    return <SubmitEventForm />
  }

  // Guest: check if guest event submissions are allowed
  const { allowGuestEvents } = await getLeagueSettings()

  if (!allowGuestEvents) {
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

  // Guest submissions allowed — render the form
  return <SubmitEventForm />
}
