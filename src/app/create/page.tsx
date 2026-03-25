import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { slugify } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trophy } from 'lucide-react'

async function createLeague(formData: FormData) {
  'use server'

  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const name = (formData.get('name') as string | null)?.trim()
  if (!name) return

  const dbUser = await db.user.findUnique({ where: { clerkId: userId } })
  if (!dbUser) redirect('/sign-in')

  // Generate a unique slug from the name
  const baseSlug = slugify(name)
  let slug = baseSlug
  let suffix = 1
  while (await db.league.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix++}`
  }

  // Find the active season (if any) to attach to the new league
  const activeSeason = await db.season.findFirst({ where: { isActive: true } })

  const league = await db.league.create({
    data: {
      name,
      slug,
      tier: 'FREE',
      seasonId: activeSeason?.id ?? null,
      season: activeSeason?.number ?? 0,
      isActive: true,
    },
  })

  await db.leagueMembership.create({
    data: {
      userId: dbUser.id,
      leagueId: league.id,
      role: 'COMMISSIONER',
    },
  })

  redirect(`/${league.slug}`)
}

export default async function CreateLeaguePage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Trophy className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl">Create a League</CardTitle>
          <CardDescription>
            Set up a new fantasy league and invite your friends.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createLeague} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">League Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g. Rodriguez Family S51"
                required
                maxLength={80}
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full">
              Create League
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
