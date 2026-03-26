import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { PublicHeader } from '@/components/shared/public-header'
import { LandingHero } from '@/components/landing/hero'
import { LandingFeatures } from '@/components/landing/features'
import { LandingHowItWorks } from '@/components/landing/how-it-works'

export default async function LandingPage() {
  // Dev bypass: always redirect authenticated dev sessions
  const devBypass = process.env.NODE_ENV === 'development' && !!process.env.DEV_USER_ID
  if (devBypass) redirect('/leaderboard')

  // Authenticated users go straight to the app
  const { userId } = await auth()
  if (userId) redirect('/leaderboard')

  const league = await db.league.findFirst({
    select: { name: true, season: true, isPublic: true },
  }).catch(() => null)

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main>
        <LandingHero
          leagueName={league?.name}
          season={league?.season}
          isPublic={league?.isPublic}
        />
        <LandingFeatures />
        <LandingHowItWorks />
      </main>
    </div>
  )
}
