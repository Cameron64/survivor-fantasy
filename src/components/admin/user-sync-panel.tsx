'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  RefreshCw,
  Link2,
  Mail,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  CloudOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SyncStatus {
  status: string
  dbClerkId: string
  isPending: boolean
  clerkAccount: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
  } | null
  emailMatch: boolean
  error?: string
}

interface UserSyncPanelProps {
  userId: string
  userEmail: string
  onRelinked?: () => void
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  'linked': { label: 'Linked', color: 'text-green-600', icon: <CheckCircle2 className="h-4 w-4 text-green-600" /> },
  'email-mismatch': { label: 'Email Mismatch', color: 'text-amber-600', icon: <AlertTriangle className="h-4 w-4 text-amber-600" /> },
  'pending-can-link': { label: 'Pending — Account Found', color: 'text-amber-600', icon: <AlertTriangle className="h-4 w-4 text-amber-600" /> },
  'pending-no-clerk': { label: 'Pending — No Account', color: 'text-red-600', icon: <XCircle className="h-4 w-4 text-red-600" /> },
  'stale-can-link': { label: 'Stale — Account Found', color: 'text-amber-600', icon: <AlertTriangle className="h-4 w-4 text-amber-600" /> },
  'no-clerk-account': { label: 'No Clerk Account', color: 'text-red-600', icon: <XCircle className="h-4 w-4 text-red-600" /> },
  'clerk-unreachable': { label: 'Clerk Unreachable', color: 'text-gray-500', icon: <CloudOff className="h-4 w-4 text-gray-500" /> },
}

export function UserSyncPanel({ userId, userEmail, onRelinked }: UserSyncPanelProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [manualId, setManualId] = useState('')
  const [showManual, setShowManual] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchStatus = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/users/${userId}/sync`)
      const data = await res.json()
      setSyncStatus(data)
    } catch {
      setMessage({ type: 'error', text: 'Failed to check sync status' })
    } finally {
      setLoading(false)
    }
  }

  const doAction = async (action: string, extra?: Record<string, string>) => {
    setActionLoading(action)
    setMessage(null)
    try {
      const res = await fetch(`/api/users/${userId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Action failed' })
        return
      }
      if (action === 'resend-invite') {
        setMessage({ type: 'success', text: 'Invitation sent' })
      } else {
        setMessage({ type: 'success', text: `Linked to ${data.clerkId}` })
        onRelinked?.()
      }
      // Refresh status
      await fetchStatus()
    } catch {
      setMessage({ type: 'error', text: 'Action failed' })
    } finally {
      setActionLoading(null)
    }
  }

  // Not yet loaded — show check button
  if (!syncStatus && !loading) {
    return (
      <Button size="sm" variant="ghost" onClick={fetchStatus} className="gap-1.5 text-xs">
        <RefreshCw className="h-3 w-3" />
        Check Sync
      </Button>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <Loader2 className="h-3 w-3 animate-spin" />
        Checking Clerk...
      </div>
    )
  }

  if (!syncStatus) return null

  const config = STATUS_CONFIG[syncStatus.status] || STATUS_CONFIG['no-clerk-account']
  const canRelink = syncStatus.status === 'pending-can-link' || syncStatus.status === 'stale-can-link'
  const needsInvite = syncStatus.status === 'pending-no-clerk' || syncStatus.status === 'no-clerk-account'

  return (
    <div className="border-t mt-3 pt-3 space-y-3 animate-in slide-in-from-top-1 duration-200">
      {/* Status row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {config.icon}
          <span className={cn('text-sm font-medium', config.color)}>{config.label}</span>
        </div>
        <Button size="sm" variant="ghost" onClick={fetchStatus} className="h-7 w-7 p-0">
          <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
        </Button>
      </div>

      {/* Details */}
      <div className="text-xs space-y-1 bg-muted/50 rounded-md p-2.5 font-mono">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">DB clerkId</span>
          <span className="truncate ml-2 max-w-[200px]">
            {syncStatus.isPending ? (
              <Badge variant="outline" className="text-[10px] font-mono text-amber-600 border-amber-300">
                pending
              </Badge>
            ) : (
              syncStatus.dbClerkId.slice(0, 20) + '...'
            )}
          </span>
        </div>
        {syncStatus.clerkAccount && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Clerk account</span>
              <span className="truncate ml-2 max-w-[200px]">{syncStatus.clerkAccount.id.slice(0, 20)}...</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Clerk name</span>
              <span>{[syncStatus.clerkAccount.firstName, syncStatus.clerkAccount.lastName].filter(Boolean).join(' ') || '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Email match</span>
              <span>{syncStatus.emailMatch ? '✓' : '✗ ' + syncStatus.clerkAccount.email}</span>
            </div>
          </>
        )}
        {!syncStatus.clerkAccount && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Clerk account</span>
            <span className="text-red-500">None found for {userEmail}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {canRelink && (
          <Button
            size="sm"
            variant="default"
            onClick={() => doAction('relink')}
            disabled={!!actionLoading}
            className="gap-1.5 text-xs"
          >
            {actionLoading === 'relink' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3" />}
            Re-link
          </Button>
        )}
        {needsInvite && (
          <Button
            size="sm"
            variant="default"
            onClick={() => doAction('resend-invite')}
            disabled={!!actionLoading}
            className="gap-1.5 text-xs"
          >
            {actionLoading === 'resend-invite' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
            Resend Invite
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowManual(!showManual)}
          disabled={!!actionLoading}
          className="gap-1.5 text-xs"
        >
          Manual ID
        </Button>
      </div>

      {/* Manual link input */}
      {showManual && (
        <div className="flex gap-2">
          <Input
            placeholder="user_abc123..."
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            className="text-xs font-mono h-8"
          />
          <Button
            size="sm"
            onClick={() => doAction('manual-link', { clerkId: manualId })}
            disabled={!manualId.trim() || !!actionLoading}
            className="h-8 text-xs"
          >
            {actionLoading === 'manual-link' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Link'}
          </Button>
        </div>
      )}

      {/* Feedback message */}
      {message && (
        <p className={cn('text-xs', message.type === 'success' ? 'text-green-600' : 'text-destructive')}>
          {message.text}
        </p>
      )}
    </div>
  )
}

/** Small badge for user cards — shows warning when clerkId is pending */
export function SyncStatusBadge({ clerkId }: { clerkId?: string }) {
  if (!clerkId?.startsWith('pending_')) return null
  return (
    <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 gap-1">
      <AlertTriangle className="h-2.5 w-2.5" />
      Unlinked
    </Badge>
  )
}
