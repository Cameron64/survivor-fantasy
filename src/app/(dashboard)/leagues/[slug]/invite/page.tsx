import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { generateInviteCode } from '@/lib/utils'
import { InviteDisplay } from './invite-display'
import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function InvitePage({ params }: PageProps) {
  await requireUser().catch(() => redirect('/sign-in'))

  const { slug } = await params

  const league = await db.league.findFirst({ where: { slug } })
  if (!league) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <p className="text-muted-foreground">League not found.</p>
      </div>
    )
  }

  // Get the latest valid invite, or create one on first visit
  let invite = await db.leagueInvite.findFirst({
    where: {
      leagueId: league.id,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!invite) {
    invite = await db.leagueInvite.create({
      data: { leagueId: league.id, code: generateInviteCode() },
    })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const inviteUrl = `${appUrl}/join/${invite.code}`

  return (
    <InviteDisplay
      leagueName={league.name}
      leagueSlug={league.slug}
      inviteUrl={inviteUrl}
      code={invite.code}
    />
  )
}
