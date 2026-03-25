import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { fetchDraftState } from '@/app/api/draft/_lib'
import { DraftRoom } from './DraftRoom'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function DraftPage({ params }: Props) {
  const { slug } = await params
  const user = await requireUser()

  const league = await db.league.findFirst({
    where: { slug },
    select: { id: true, name: true },
  })

  if (!league) {
    redirect('/leaderboard')
  }

  const initialState = await fetchDraftState(league.id)

  return (
    <div className="h-full">
      <DraftRoom
        leagueId={league.id}
        leagueName={league.name}
        leagueSlug={slug}
        currentUserId={user.id}
        isAdmin={user.role === 'ADMIN' || user.role === 'MODERATOR'}
        initialState={initialState}
      />
    </div>
  )
}
