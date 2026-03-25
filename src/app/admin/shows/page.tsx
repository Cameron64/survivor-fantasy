export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tv2 } from 'lucide-react'

async function getShows() {
  return db.show.findMany({
    include: {
      seasons: {
        orderBy: { number: 'desc' },
      },
    },
    orderBy: { name: 'asc' },
  })
}

export default async function AdminShowsPage() {
  await requireAdmin()
  const shows = await getShows()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Shows & Seasons</h1>
        <p className="text-muted-foreground">All configured shows and their seasons (read-only)</p>
      </div>

      {shows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Tv2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No shows configured</p>
            <p className="text-sm text-muted-foreground">Run the seed script to create a show.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {shows.map((show) => (
            <Card key={show.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tv2 className="h-5 w-5" />
                    <CardTitle>{show.name}</CardTitle>
                  </div>
                  <Badge variant={show.isActive ? 'success' : 'secondary'}>
                    {show.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                {show.description && (
                  <CardDescription>{show.description}</CardDescription>
                )}
                <p className="text-xs text-muted-foreground font-mono">slug: {show.slug}</p>
              </CardHeader>
              <CardContent>
                {show.seasons.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No seasons yet.</p>
                ) : (
                  <div className="space-y-2">
                    {show.seasons.map((season) => (
                      <div
                        key={season.id}
                        className="flex items-center justify-between rounded-lg border px-4 py-3"
                      >
                        <div>
                          <p className="font-medium">
                            Season {season.number}
                            {season.name ? `: ${season.name}` : ''}
                          </p>
                          <div className="flex gap-4 mt-1">
                            {season.premiereDate && (
                              <p className="text-xs text-muted-foreground">
                                Premiere:{' '}
                                {new Date(season.premiereDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </p>
                            )}
                            {season.finaleDate && (
                              <p className="text-xs text-muted-foreground">
                                Finale:{' '}
                                {new Date(season.finaleDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge variant={season.isActive ? 'success' : 'secondary'}>
                          {season.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
