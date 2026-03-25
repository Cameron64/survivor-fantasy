import Link from 'next/link'
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface LeagueCardProps {
  league: {
    id: string
    name: string
    slug: string
    season: number
  }
  hasTeam: boolean
  isAuthenticated: boolean
}

export function LeagueCard({ league, hasTeam, isAuthenticated }: LeagueCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg leading-tight">{league.name}</CardTitle>
          <Badge variant="secondary" className="shrink-0">
            Season {league.season}
          </Badge>
        </div>
        <CardDescription>Survivor Season {league.season} Fantasy League</CardDescription>
      </CardHeader>
      <CardContent>
        {hasTeam ? (
          <Button asChild className="w-full">
            <Link href="/leaderboard">Go to League</Link>
          </Button>
        ) : isAuthenticated ? (
          <p className="text-sm text-muted-foreground text-center py-1">
            Contact the league admin to be added.
          </p>
        ) : (
          <Button asChild className="w-full">
            <Link href="/sign-up">Join</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
