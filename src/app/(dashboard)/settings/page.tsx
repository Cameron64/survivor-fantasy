'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Settings, Share2, Trash2, RefreshCw, Copy, Check, Bug } from 'lucide-react'

interface UserData {
  id: string
  name: string
  email: string
  role: string
  isPaid: boolean
  inviteCode: string | null
}

export default function SettingsPage() {
  const [user, setUser] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isSwitchingRole, setIsSwitchingRole] = useState(false)
  const isDev = process.env.NODE_ENV === 'development'

  useEffect(() => {
    fetchUser()
  }, [])

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/users/me')
      const data = await res.json()
      setUser(data)
    } catch (error) {
      console.error('Failed to fetch user:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateInviteCode = async () => {
    setIsGenerating(true)
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generateInvite: true }),
      })
      const data = await res.json()
      setUser(data)
    } catch (error) {
      console.error('Failed to generate invite code:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const copyInviteLink = async () => {
    if (!user?.inviteCode) return

    const inviteUrl = `${window.location.origin}/invite/${user.inviteCode}`
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const clearCache = async () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      // Clear all caches
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map((name) => caches.delete(name)))

      // Reload the page
      window.location.reload()
    }
  }

  const switchRole = async (role: string) => {
    setIsSwitchingRole(true)
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devRole: role }),
      })
      const data = await res.json()
      setUser(data)
    } catch (error) {
      console.error('Failed to switch role:', error)
    } finally {
      setIsSwitchingRole(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 pb-20 lg:pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Account
          </CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input value={user?.name || ''} disabled />
          </div>
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input value={user?.email || ''} disabled />
          </div>
          <div className="flex items-center gap-2">
            <Label>Status</Label>
            <Badge variant={user?.isPaid ? 'success' : 'outline'}>
              {user?.isPaid ? 'Paid' : 'Unpaid'}
            </Badge>
            <Badge variant="secondary">{user?.role}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Invite Friends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Invite Friends
          </CardTitle>
          <CardDescription>Share your invite link to add friends to the league</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {user?.inviteCode ? (
            <>
              <div className="flex gap-2">
                <Input
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${user.inviteCode}`}
                  readOnly
                />
                <Button variant="outline" size="icon" onClick={copyInviteLink}>
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Your invite code: <code className="font-mono">{user.inviteCode}</code>
              </p>
            </>
          ) : (
            <Button onClick={generateInviteCode} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4 mr-2" />
                  Generate Invite Link
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* PWA Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            App Settings
          </CardTitle>
          <CardDescription>Progressive Web App settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Clear Cache</p>
              <p className="text-sm text-muted-foreground">
                Force refresh all cached data and reload the app
              </p>
            </div>
            <Button variant="outline" onClick={clearCache}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Cache
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dev Tools - only visible in development */}
      {isDev && (
        <Card className="border-dashed border-yellow-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5 text-yellow-500" />
              Dev Tools
            </CardTitle>
            <CardDescription>Development-only tools (not visible in production)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Switch Role</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Temporarily change your role to test different permission levels
              </p>
              <div className="flex gap-2">
                {(['USER', 'MODERATOR', 'ADMIN'] as const).map((role) => (
                  <Button
                    key={role}
                    variant={user?.role === role ? 'default' : 'outline'}
                    size="sm"
                    disabled={isSwitchingRole || user?.role === role}
                    onClick={() => switchRole(role)}
                  >
                    {role}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
