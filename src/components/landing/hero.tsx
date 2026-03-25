import Link from 'next/link'
import { SignInButton, SignUpButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'

interface LandingHeroProps {
  leagueName?: string
  season?: number
  isPublic?: boolean
}

export function LandingHero({ leagueName, season, isPublic }: LandingHeroProps) {
  const title = leagueName ?? 'Survivor Fantasy League'
  const seasonLabel = season ? `Season ${season}` : null

  return (
    <section className="py-20 px-4 text-center">
      <div className="max-w-3xl mx-auto space-y-6">
        {seasonLabel && (
          <p className="text-sm font-semibold uppercase tracking-widest text-orange-500">
            {seasonLabel}
          </p>
        )}
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          {title}
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Draft your favorite Survivor contestants, earn points as they outwit, outplay, and
          outlast — and see if you can call the winner.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <SignUpButton>
            <Button size="lg">
              Create Account
            </Button>
          </SignUpButton>
          <SignInButton>
            <Button size="lg" variant="outline">
              Sign In
            </Button>
          </SignInButton>
          {isPublic && (
            <Button size="lg" variant="ghost" asChild>
              <Link href="/leaderboard">Browse as Guest</Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}
