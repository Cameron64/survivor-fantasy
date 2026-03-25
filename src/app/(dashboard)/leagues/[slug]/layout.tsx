import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

interface Props {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

export default async function LeagueSlugLayout({ children, params }: Props) {
  const { slug } = await params
  const user = await getCurrentUser()

  if (!user) {
    redirect('/sign-in')
  }

  const league = await db.league.findFirst({
    where: { slug },
    select: { id: true },
  })

  if (!league) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">League not found.</p>
      </div>
    )
  }

  const isAdmin = user.role === 'ADMIN'

  if (!isAdmin) {
    const membership = await db.leagueMembership.findFirst({
      where: { leagueId: league.id, userId: user.id },
      select: { id: true },
    })

    if (!membership) {
      const invite = await db.leagueInvite.findFirst({
        where: {
          leagueId: league.id,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: { code: true },
      })

      if (invite) {
        redirect(`/join/${invite.code}`)
      }

      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            You don&apos;t have access to this league. Ask your commissioner for an invite link.
          </p>
        </div>
      )
    }
  }

  return <>{children}</>
}
