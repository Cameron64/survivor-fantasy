import { notFound } from 'next/navigation'
import { requireLeagueMember, UnauthorizedError, ForbiddenError } from '@/lib/auth-helpers'
import { LeagueProvider } from '@/lib/league-provider'

export default async function LeagueSlugLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ leagueSlug: string }>
}) {
  const { leagueSlug } = await params

  let membership: Awaited<ReturnType<typeof requireLeagueMember>>

  try {
    membership = await requireLeagueMember(leagueSlug)
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      // redirect to sign-in by re-throwing — Clerk middleware handles it
      throw err
    }
    if (err instanceof ForbiddenError) {
      notFound()
    }
    // League not found (findFirst returned null → ForbiddenError) is handled above
    throw err
  }

  if (!membership) {
    notFound()
  }

  return (
    <LeagueProvider
      league={membership.league}
      role={membership.role}
      userId={membership.userId}
    >
      {children}
    </LeagueProvider>
  )
}
