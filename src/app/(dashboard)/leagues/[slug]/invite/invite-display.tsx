'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Copy, RefreshCw } from 'lucide-react'

interface Props {
  leagueName: string
  leagueSlug: string
  inviteUrl: string
  code: string
}

export function InviteDisplay({ leagueName, leagueSlug, inviteUrl, code }: Props) {
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [currentUrl, setCurrentUrl] = useState(inviteUrl)
  const [currentCode, setCurrentCode] = useState(code)
  const [error, setError] = useState<string | null>(null)

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(currentUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for browsers without clipboard API
      const input = document.querySelector<HTMLInputElement>('#invite-url')
      input?.select()
    }
  }

  async function regenerate() {
    setRegenerating(true)
    setError(null)
    try {
      const res = await fetch(`/api/leagues/${leagueSlug}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to generate invite')
        return
      }
      setCurrentUrl(data.url)
      setCurrentCode(data.invite.code)
    } catch {
      setError('Network error — please try again')
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">League Created!</h1>
        <p className="text-muted-foreground mt-1">
          Share this link with your players to invite them to{' '}
          <span className="font-medium text-foreground">{leagueName}</span>.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invite Link</CardTitle>
          <CardDescription>
            Anyone with this link can join your league.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              id="invite-url"
              value={currentUrl}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={copyToClipboard}
              title="Copy link"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>Code: <span className="font-mono font-medium text-foreground">{currentCode}</span></span>
            <span>·</span>
            <span>No expiry · Unlimited uses</span>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={copyToClipboard} className="flex-1">
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Invite Link
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={regenerate}
              disabled={regenerating}
              title="Generate new code"
            >
              <RefreshCw className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground text-center">
        Players will land on a join page where they can sign in and join your league.
      </p>
    </div>
  )
}
