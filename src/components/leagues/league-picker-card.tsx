import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LeagueRole } from '@prisma/client'

interface LeaguePickerCardProps {
  leagueName: string
  leagueSlug: string
  season: number
  role: LeagueRole
  memberCount: number
  isActive: boolean
  lastEpisode: {
    number: number
    title: string | null
    airDate: Date
  } | null
}

export function LeaguePickerCard({
  leagueName,
  leagueSlug,
  season,
  role,
  memberCount,
  isActive,
  lastEpisode,
}: LeaguePickerCardProps) {
  const isCommissioner = role === LeagueRole.COMMISSIONER

  return (
    <Link href={`/leagues/${leagueSlug}/leaderboard`} className="block">
      <Card
        className={`transition-colors hover:bg-accent cursor-pointer ${
          isCommissioner ? 'border-primary' : ''
        }`}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{leagueName}</CardTitle>
            {isCommissioner && (
              <Badge variant="default" className="text-xs">
                Commissioner
              </Badge>
            )}
            {!isActive && (
              <Badge variant="secondary" className="text-xs text-muted-foreground">
                Inactive
              </Badge>
            )}
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Season {season}</span>
            <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
            {lastEpisode && (
              <span>
                Ep {lastEpisode.number}
                {lastEpisode.title ? ` — ${lastEpisode.title}` : ''}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
