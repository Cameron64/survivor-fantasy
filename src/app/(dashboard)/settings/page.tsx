'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Settings, Share2, Trash2, RefreshCw, Copy, Check, Bug, FlaskConical, Rocket, ChevronDown, ChevronUp, Database } from 'lucide-react'

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
  { id: 5, title: 'Larger Contestant Tiles', description: 'Bigger photos in event submission for faster face recognition', status: 'Done' },
  { id: 6, title: 'Routed Event Wizard', description: 'URL-based routing for event submission steps with browser navigation', status: 'Done' },
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
  { id: 20, title: 'Context-Aware Challenge Mode', description: 'Auto-detect team vs individual challenges based on merge status', status: 'Planned' },
]

export default function SettingsPage() {
  const [user, setUser] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isSwitchingRole, setIsSwitchingRole] = useState(false)
  const [showSimulation, setShowSimulation] = useState(false)
  const [roadmapExpanded, setRoadmapExpanded] = useState(false)
  const [isImportingData, setIsImportingData] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  // Feature toggles
  const [enableTribeSwap, setEnableTribeSwap] = useState(false)
  const [enableSwapMode, setEnableSwapMode] = useState(false)
  const [enableDissolutionMode, setEnableDissolutionMode] = useState(false)
  const [enableExpansionMode, setEnableExpansionMode] = useState(false)
  const [enableTribeMerge, setEnableTribeMerge] = useState(false)
  const [isUpdatingFlags, setIsUpdatingFlags] = useState(false)

  const isDev = process.env.NODE_ENV === 'development'
  const isAdmin = user?.role === 'ADMIN'

  useEffect(() => {
    fetchUser()
    fetchFeatureFlags()
    setShowSimulation(localStorage.getItem('showSimulation') === 'true')
  }, [])

  const fetchFeatureFlags = async () => {
    try {
      const res = await fetch('/api/feature-flags')
      const data = await res.json()
      setEnableTribeSwap(data.enableTribeSwap || false)
      setEnableSwapMode(data.enableSwapMode || false)
      setEnableDissolutionMode(data.enableDissolutionMode || false)
      setEnableExpansionMode(data.enableExpansionMode || false)
      setEnableTribeMerge(data.enableTribeMerge || false)
    } catch (error) {
      console.error('Failed to fetch feature flags:', error)
    }
  }

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

  const toggleFeature = async (key: string, checked: boolean, setter: (val: boolean) => void) => {
    if (!isAdmin) {
      console.warn('Only admins can toggle feature flags')
      return
    }

    setter(checked)
    setIsUpdatingFlags(true)

    try {
      const res = await fetch('/api/admin/feature-flags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: checked }),
      })

      if (!res.ok) {
        throw new Error('Failed to update feature flags')
      }

      // Reload the page to refresh feature flags context
      setTimeout(() => window.location.reload(), 500)
    } catch (error) {
      console.error('Failed to toggle feature flag:', error)
      // Revert on error
      setter(!checked)
    } finally {
      setIsUpdatingFlags(false)
    }
  }

  const clearCache = async () => {
    try {
      // Clear all caches (works even without service worker)
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map((name) => caches.delete(name)))
      }

      // Unregister service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(registrations.map((reg) => reg.unregister()))
      }

      // Hard reload the page (bypass cache)
      window.location.reload()
    } catch (error) {
      console.error('Failed to clear cache:', error)
      // Still reload even if clearing failed
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

  const importProdData = async () => {
    const confirmed = window.confirm(
      '⚠️ WARNING: This will OVERWRITE ALL local data with production data!\n\n' +
      'This action cannot be undone. Are you sure you want to continue?'
    )

    if (!confirmed) return

    setIsImportingData(true)
    setImportError(null)

    try {
      const res = await fetch('/api/dev/import-prod-data', {
        method: 'POST',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to import production data')
      }

      // Success - reload the page to show fresh data
      window.location.reload()
    } catch (error) {
      console.error('Failed to import production data:', error)
      setImportError(error instanceof Error ? error.message : 'Unknown error occurred')
    } finally {
      setIsImportingData(false)
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

      {/* Feature Toggles - Admin Only */}
      {isAdmin && (
        <Card className="border-dashed border-orange-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-orange-500" />
              Experimental Features
            </CardTitle>
            <CardDescription>
              Global feature flags for all users (changes take effect immediately)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Tribe Swap Events</p>
                <p className="text-sm text-muted-foreground">
                  Enable tribe swap event submission and display
                </p>
              </div>
              <Switch
                checked={enableTribeSwap}
                disabled={isUpdatingFlags}
                onCheckedChange={(checked) => toggleFeature('enableTribeSwap', checked, setEnableTribeSwap)}
              />
            </div>

            {enableTribeSwap && (
              <div className="pl-4 border-l-2 border-orange-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Standard Swap Mode</p>
                    <p className="text-xs text-muted-foreground">
                      Allow standard tribe swap submissions
                    </p>
                  </div>
                  <Switch
                    checked={enableSwapMode}
                    disabled={isUpdatingFlags}
                    onCheckedChange={(checked) => toggleFeature('enableSwapMode', checked, setEnableSwapMode)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Dissolution Mode</p>
                    <p className="text-xs text-muted-foreground">
                      Allow tribe dissolution submissions
                    </p>
                  </div>
                  <Switch
                    checked={enableDissolutionMode}
                    disabled={isUpdatingFlags}
                    onCheckedChange={(checked) => toggleFeature('enableDissolutionMode', checked, setEnableDissolutionMode)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Expansion Mode</p>
                    <p className="text-xs text-muted-foreground">
                      Allow tribe expansion submissions
                    </p>
                  </div>
                  <Switch
                    checked={enableExpansionMode}
                    disabled={isUpdatingFlags}
                    onCheckedChange={(checked) => toggleFeature('enableExpansionMode', checked, setEnableExpansionMode)}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t">
              <div>
                <p className="font-medium">Tribe Merge Events</p>
                <p className="text-sm text-muted-foreground">
                  Enable tribe merge event submission and display
                </p>
              </div>
              <Switch
                checked={enableTribeMerge}
                disabled={isUpdatingFlags}
                onCheckedChange={(checked) => toggleFeature('enableTribeMerge', checked, setEnableTribeMerge)}
              />
            </div>
          </CardContent>
        </Card>
      )}

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
          <CardContent className="space-y-6">
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

            <div className="border-t pt-4">
              <Label>Import Production Data</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Pull fresh data from production database (overwrites all local data)
              </p>
              {importError && (
                <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
                  <p className="text-sm text-red-900 font-medium">Import Failed</p>
                  <p className="text-xs text-red-700 mt-1">{importError}</p>
                </div>
              )}
              <Button
                variant="destructive"
                size="sm"
                onClick={importProdData}
                disabled={isImportingData}
              >
                {isImportingData ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Importing... (this may take a minute)
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Pull Production Data
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
