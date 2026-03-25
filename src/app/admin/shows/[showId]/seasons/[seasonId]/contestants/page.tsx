export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { getContestantDisplayName, getValidImageUrl } from '@/lib/utils'

export default async function SeasonContestantsPage({
  params,
}: {
  params: Promise<{ showId: string; seasonId: string }>
}) {
  await requireAdmin()

  const { showId, seasonId } = await params

  const season = await db.season.findFirst({
    where: { id: seasonId, showId },
    include: {
      show: true,
      contestants: {
        orderBy: { name: 'asc' },
      },
    },
  })

  if (!season) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/shows">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Shows
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {season.show.name} — Season {season.number}
        </h1>
        {season.name && (
          <p className="text-muted-foreground">{season.name}</p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Contestants
          </CardTitle>
          <CardDescription>
            {season.contestants.length} contestant{season.contestants.length !== 1 ? 's' : ''} in this season (read-only)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {season.contestants.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No contestants seeded for this season yet.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {season.contestants.map((c) => {
                const imageUrl = getValidImageUrl(c.imageUrl, c.originalImageUrl)
                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <div className="shrink-0 h-10 w-10 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={c.name}
                          width={40}
                          height={40}
                          className="object-cover h-full w-full"
                        />
                      ) : (
                        <Users className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {getContestantDisplayName(c)}
                      </p>
                      {c.originalSeasons && (
                        <p className="text-xs text-muted-foreground truncate">
                          Seasons: {c.originalSeasons}
                        </p>
                      )}
                    </div>
                    {c.isEliminated && (
                      <Badge variant="secondary" className="ml-auto shrink-0 text-xs">
                        Out
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
