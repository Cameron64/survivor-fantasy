'use client'

import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { RefreshCw } from 'lucide-react'
import type { FeatureFlags } from '@/lib/feature-flags'

interface FeatureFlagsFormProps {
  initialFlags: FeatureFlags
}

export function FeatureFlagsForm({ initialFlags }: FeatureFlagsFormProps) {
  const [flags, setFlags] = useState<FeatureFlags>(initialFlags)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const updateFlag = async (flagName: keyof FeatureFlags, value: boolean) => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/admin/feature-flags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [flagName]: value }),
      })

      if (res.ok) {
        const updated = await res.json()
        setFlags(updated)
        setHasChanges(true)
      } else {
        console.error('Failed to update feature flag')
        // Revert on error
        setFlags(flags)
      }
    } catch (error) {
      console.error('Failed to update feature flag:', error)
      // Revert on error
      setFlags(flags)
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggle = (flagName: keyof FeatureFlags) => (checked: boolean) => {
    // Optimistically update UI
    setFlags({ ...flags, [flagName]: checked })
    // Save to server
    updateFlag(flagName, checked)
  }

  return (
    <div className="space-y-6">
      {hasChanges && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
          <RefreshCw className="h-4 w-4" />
          <span>Feature flags updated! Refresh the page to see changes in event submission.</span>
        </div>
      )}

      {/* Main Tribe Swap Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="enable-tribe-swap" className="text-base font-medium">
            Enable Tribe Swap
          </Label>
          <p className="text-sm text-muted-foreground">
            Allow tribe swap events to be submitted. This is the master toggle for all swap-related features.
          </p>
        </div>
        <Switch
          id="enable-tribe-swap"
          checked={flags.enableTribeSwap}
          onCheckedChange={handleToggle('enableTribeSwap')}
          disabled={isSaving}
        />
      </div>

      {/* Nested Swap Mode Options */}
      {flags.enableTribeSwap && (
        <div className="space-y-6 pl-4 border-l-2 border-muted">
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="text-xs">
              Swap Modes
            </Badge>
            <p className="text-xs">
              Choose which types of tribe swaps are allowed in your league
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enable-swap-mode" className="text-base font-medium">
                Standard Swap
              </Label>
              <p className="text-sm text-muted-foreground">
                Contestants shuffle between existing tribes (e.g., &ldquo;Draw buffs and switch tribes&rdquo;)
              </p>
            </div>
            <Switch
              id="enable-swap-mode"
              checked={flags.enableSwapMode}
              onCheckedChange={handleToggle('enableSwapMode')}
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enable-dissolution-mode" className="text-base font-medium">
                Tribe Dissolution
              </Label>
              <p className="text-sm text-muted-foreground">
                One or more tribes are dissolved and members redistributed to remaining tribes
              </p>
            </div>
            <Switch
              id="enable-dissolution-mode"
              checked={flags.enableDissolutionMode}
              onCheckedChange={handleToggle('enableDissolutionMode')}
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enable-expansion-mode" className="text-base font-medium">
                Tribe Expansion
              </Label>
              <p className="text-sm text-muted-foreground">
                New tribes are created and contestants are redistributed (e.g., &ldquo;Drop your buffs, two tribes become three&rdquo;)
              </p>
            </div>
            <Switch
              id="enable-expansion-mode"
              checked={flags.enableExpansionMode}
              onCheckedChange={handleToggle('enableExpansionMode')}
              disabled={isSaving}
            />
          </div>
        </div>
      )}

      {/* Tribe Merge Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5 flex items-center gap-2">
          <div className="space-y-0.5">
            <Label htmlFor="enable-tribe-merge" className="text-base font-medium">
              Enable Tribe Merge
            </Label>
            <p className="text-sm text-muted-foreground">
              Allow merge events (individual immunity, reward challenges, jury tracking, finale events)
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            Coming Soon
          </Badge>
        </div>
        <Switch
          id="enable-tribe-merge"
          checked={flags.enableTribeMerge}
          onCheckedChange={handleToggle('enableTribeMerge')}
          disabled={isSaving}
        />
      </div>
    </div>
  )
}
