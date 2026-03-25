'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Copy, Check, Link as LinkIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface WaitingProps {
  phase: 'WAITING'
  leagueId: string
  inviteUrl: string
  isCommissioner: boolean
}

interface ActiveProps {
  phase: 'ACTIVE'
  leagueId: string
  isCommissioner: boolean
}

type Props = WaitingProps | ActiveProps

export function CommissionerActions(props: Props) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCopy = async () => {
    if (props.phase !== 'WAITING') return
    try {
      await navigator.clipboard.writeText(props.inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: select the URL text
    }
  }

  const handleInitializeDraft = async () => {
    setIsWorking(true)
    setError(null)
    try {
      const res = await fetch('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'initialize', draftOrder: [] }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to initialize draft')
      } else {
        router.push('/admin/draft')
      }
    } catch {
      setError('Failed to initialize draft')
    } finally {
      setIsWorking(false)
    }
  }

  if (props.phase === 'WAITING') {
    return (
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-muted rounded-md px-3 py-2 text-sm font-mono truncate text-muted-foreground">
            {props.inviteUrl}
          </div>
          <Button variant="outline" size="sm" onClick={handleCopy} disabled={!props.isCommissioner}>
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-1 text-green-500" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </>
            )}
          </Button>
        </div>

        {props.isCommissioner && (
          <div className="pt-2">
            <p className="text-sm text-muted-foreground mb-2">
              Once everyone has joined, initialize the draft to set the pick order.
            </p>
            <Button onClick={() => router.push('/admin/draft')}>
              <LinkIcon className="h-4 w-4 mr-2" />
              Set Up Draft Order
            </Button>
          </div>
        )}
      </div>
    )
  }

  // ACTIVE phase: show link to full draft room
  return (
    <div className="space-y-3">
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <div className="flex gap-2">
        <Button asChild>
          <a href="/admin/draft">View Draft Board</a>
        </Button>
      </div>
    </div>
  )
}
