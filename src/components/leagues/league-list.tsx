import { LeagueCard } from './league-card'

interface League {
  id: string
  name: string
  slug: string
  season: number
}

interface LeagueListProps {
  leagues: League[]
  hasTeam: boolean
  isAuthenticated: boolean
}

export function LeagueList({ leagues, hasTeam, isAuthenticated }: LeagueListProps) {
  if (leagues.length === 0) {
    return (
      <div className="text-center py-12 space-y-2">
        <p className="text-muted-foreground">No public leagues found.</p>
        <p className="text-sm text-muted-foreground">
          If you have an invite link, you can join directly from that link.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {leagues.map((league) => (
        <LeagueCard
          key={league.id}
          league={league}
          hasTeam={hasTeam}
          isAuthenticated={isAuthenticated}
        />
      ))}
    </div>
  )
}
