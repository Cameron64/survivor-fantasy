'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useUser, SignInButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

interface InviteData {
  valid: boolean
  league: { id: string; name: string; slug: string; season: number }
  invite: { code: string; expiresAt: string | null; maxUses: number | null; usedCount: number }
  error?: string
}

export default function JoinPage() {
  const params = useParams<{ code: string }>()
  const router = useRouter()
  const { isLoaded, isSignedIn } = useUser()

  const [invite, setInvite] = useState<InviteData | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [joined, setJoined] = useState(false)

  useEffect(() => {
    async function fetchInvite() {
      try {
        const res = await fetch(`/api/invites/${params.code}`)
        const data = await res.json()
        if (!res.ok) {
          setFetchError(data.error ?? 'Invalid invite link')
          return
        }
        setInvite(data)
      } catch {
        setFetchError('Failed to load invite — please check your connection')
      }
    }
    fetchInvite()
  }, [params.code])

  async function handleJoin() {
    setJoinError(null)
    setJoining(true)
    try {
      const res = await fetch(`/api/invites/${params.code}/join`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) {
        setJoinError(data.error ?? 'Failed to join league')
        return
      }
      setJoined(true)
      setTimeout(() => router.push('/leaderboard'), 1500)
    } catch {
      setJoinError('Network error — please try again')
    } finally {
      setJoining(false)
    }
  }

  // Loading states
  if (!isLoaded || (!fetchError && !invite)) {
    return (
      <JoinLayout>
        <p className="text-muted-foreground text-center">Loading...</p>
      </JoinLayout>
    )
  }

  if (fetchError) {
    return (
      <JoinLayout>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Invite</CardTitle>
            <CardDescription>{fetchError}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This invite link may have expired or been revoked. Ask your commissioner for a new one.
            </p>
          </CardContent>
        </Card>
      </JoinLayout>
    )
  }

  if (joined) {
    return (
      <JoinLayout>
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>You&apos;re in!</CardTitle>
            <CardDescription>
              Welcome to {invite!.league.name}. Taking you to the leaderboard...
            </CardDescription>
          </CardHeader>
        </Card>
      </JoinLayout>
    )
  }

  return (
    <JoinLayout>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{invite!.league.name}</CardTitle>
          <CardDescription>
            Survivor Season {invite!.league.season} Fantasy League
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You&apos;ve been invited to join a fantasy league. Draft contestants,
            earn points for their game moves, and compete for the win.
          </p>

          {joinError && <p className="text-sm text-destructive">{joinError}</p>}

          {!isSignedIn ? (
            <div className="space-y-3">
              <SignInButton
                mode="redirect"
                forceRedirectUrl={`/join/${params.code}`}
              >
                <Button className="w-full">Sign in to Join</Button>
              </SignInButton>
              <p className="text-xs text-center text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link href="/sign-up" className="underline hover:text-foreground">
                  Sign up free
                </Link>
              </p>
            </div>
          ) : (
            <Button
              className="w-full"
              onClick={handleJoin}
              disabled={joining}
            >
              {joining ? 'Joining...' : 'Join League'}
            </Button>
          )}
        </CardContent>
      </Card>
    </JoinLayout>
  )
}

function JoinLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="mb-8">
        <img src="/logo.png" alt="Castaway" className="h-16 w-auto mx-auto" />
      </div>
      {children}
    </div>
  )
}
