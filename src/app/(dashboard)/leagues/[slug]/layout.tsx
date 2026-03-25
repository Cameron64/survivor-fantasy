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
    select: { id: true, name: true },
  })

  if (!league) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">League not found.</p>
      </div>
    )
  }

  return <>{children}</>
}
