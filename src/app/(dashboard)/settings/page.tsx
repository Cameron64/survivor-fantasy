'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Settings, Share2, Trash2, RefreshCw, Copy, Check, Bug, FlaskConical, Rocket, ChevronDown, ChevronUp } from 'lucide-react'

interface UserData {
  id: string
  name: string
  email: string
  role: string
  isPaid: boolean
  inviteCode: string | null
}

const ROADMAP_ITEMS: { id: number; title: string; description: string; status: 'Planned' | 'In Progress' | 'Done' }[] = [
  { id: 1, title: 'Player Pages', description: 'Detailed contestant profiles with events, draft info, and admin editing', status: 'Planned' },
  { id: 2, title: 'Merge Functionality', description: 'End-to-end tribe merge workflow with correct app-wide display', status: 'Planned' },
  { id: 3, title: 'Simplified Player Breakdowns', description: 'Show category rollups instead of per-week badges', status: 'Planned' },
  { id: 4, title: 'Public Team Breakdowns', description: "View any player's team breakdown from the leaderboard", status: 'Planned' },
  { id: 5, title: 'Larger Contestant Tiles', description: 'Bigger photos in event submission for faster face recognition', status: 'Planned' },
  { id: 6, title: 'Routed Event Wizard', description: 'URL-based routing for event submission steps with browser navigation', status: 'Planned' },
  { id: 7, title: 'Tribal Council Breakdown', description: 'View who voted for whom each week', status: 'Planned' },
  { id: 8, title: 'Tribe-Styled Challenge Drawers', description: 'Team challenges grouped by tribe with color-coded drawers', status: 'Planned' },
  { id: 9, title: 'Tribes in Main Nav', description: 'Browse tribes from the main menu with buff image uploads', status: 'Planned' },
  { id: 10, title: 'Merge as Game Event', description: 'Submit merge through the normal event flow instead of admin-only', status: 'Planned' },
  { id: 11, title: 'Draft Rehearsal & Admin Picks', description: 'Practice drafts and admin pick-on-behalf for absent users', status: 'Planned' },
  { id: 12, title: 'User Impersonation', description: 'Admins can view the app as another user for debugging', status: 'Planned' },
  { id: 13, title: 'Advantage Scoring', description: 'Points for finding and using advantages beyond idols', status: 'Planned' },
  { id: 14, title: 'Event Metadata', description: 'Descriptions and types for events like idol kind and expiration', status: 'Planned' },
  { id: 15, title: 'Moment of the Week', description: 'Vote on the best meme or moment each week', status: 'Planned' },
  { id: 16, title: 'Point Betting', description: 'Wager points on predictions — eliminations, placements, and more', status: 'Planned' },
  { id: 17, title: 'In-App Chat', description: 'Trash talk and discuss episodes without leaving the app', status: 'Planned' },
  { id: 18, title: 'In-App Roadmap', description: 'Read-only view of planned features', status: 'Done' },
  { id: 19, title: 'Feature Request Submission', description: 'Submit feature ideas directly in the app', status: 'Planned' },
]

export default function SettingsPage() {
  const [user, setUser] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isSwitchingRole, setIsSwitchingRole] = useState(false)
  const [showSimulation, setShowSimulation] = useState(false)
  const [roadmapExpanded, setRoadmapExpanded] = useState(false)
  const isDev = process.env.NODE_ENV === 'development'

  useEffect(() => {
    fetchUser()
    setShowSimulation(localStorage.getItem('showSimulation') === 'true')
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

  const toggleSimulation = (checked: boolean) => {
    setShowSimulation(checked)
    if (checked) {
      localStorage.setItem('showSimulation', 'true')
    } else {
      localStorage.removeItem('showSimulation')
    }
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'showSimulation',
        newValue: checked ? 'true' : null,
      })
    )
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

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Preferences
          </CardTitle>
          <CardDescription>Customize your experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Show Simulation Tools</p>
              <p className="text-sm text-muted-foreground">
                Enable simulation tools in the navigation
              </p>
            </div>
            <Switch
              checked={showSimulation}
              onCheckedChange={toggleSimulation}
            />
          </div>
        </CardContent>
      </Card>

      {/* Roadmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Roadmap
          </CardTitle>
          <CardDescription>Planned features and improvements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(roadmapExpanded ? ROADMAP_ITEMS : ROADMAP_ITEMS.slice(0, 5)).map((item) => (
              <div key={item.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                <span className="text-xs font-mono text-muted-foreground mt-0.5 w-5 shrink-0">
                  {item.id}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                </div>
                <Badge
                  variant={item.status === 'Done' ? 'success' : item.status === 'In Progress' ? 'default' : 'outline'}
                  className="shrink-0 text-xs"
                >
                  {item.status}
                </Badge>
              </div>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-3 text-muted-foreground"
            onClick={() => setRoadmapExpanded(!roadmapExpanded)}
          >
            {roadmapExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show All {ROADMAP_ITEMS.length} Features
              </>
            )}
          </Button>
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
