'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CheckCircle2, XCircle, Shield } from 'lucide-react'
import type { SeasonReadiness } from '@/lib/season-readiness'

const ALLOWED_PATHS = ['/settings', '/my-team']

interface SeasonSetupGateProps {
  readiness: SeasonReadiness
  isAdmin: boolean
  children: React.ReactNode
}

export function SeasonSetupGate({
  readiness,
  isAdmin,
  children,
}: SeasonSetupGateProps) {
  const pathname = usePathname()

  if (readiness.isReady) {
    return <>{children}</>
  }

  if (ALLOWED_PATHS.some((p) => pathname.startsWith(p))) {
    return <>{children}</>
  }

  // Only show items that are required for the gate to open
  const items = [
    {
      label: 'Contestants added',
      done: readiness.checks.hasContestants,
      detail: `${readiness.details.contestantCount} contestant${readiness.details.contestantCount !== 1 ? 's' : ''}`,
    },
    {
      label: 'Episode schedule configured',
      done: readiness.checks.hasEpisodes,
      detail: `${readiness.details.episodeCount} episode${readiness.details.episodeCount !== 1 ? 's' : ''}`,
    },
  ]

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <AlertTriangle className="h-12 w-12 text-yellow-500" />
          </div>
          <CardTitle className="text-xl">Season Setup In Progress</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            The season needs to be configured before this page is available.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.label} className="flex items-start gap-3">
                {item.done ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                )}
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>

          {isAdmin ? (
            <Link href="/admin">
              <Button className="w-full mt-4">
                <Shield className="h-4 w-4 mr-2" />
                Go to Admin Panel
              </Button>
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground text-center mt-4">
              Contact your league admin to complete the season setup.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
