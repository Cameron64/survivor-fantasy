'use client'

import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import type { GameSettings } from '@/lib/game-settings'

interface GameSettingsFormProps {
  initialSettings: GameSettings
}

export function GameSettingsForm({ initialSettings }: GameSettingsFormProps) {
  const [settings, setSettings] = useState(initialSettings)
  const [isSaving, setIsSaving] = useState(false)

  const handleToggle = async (key: keyof GameSettings, checked: boolean) => {
    const next = { ...settings, [key]: checked }
    setSettings(next)
    setIsSaving(true)
    try {
      const res = await fetch('/api/league/game-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })
      if (res.ok) {
        const result = await res.json()
        setSettings(result)
      }
    } catch (error) {
      console.error('Failed to update game settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="extra-vote-scoring" className="text-base font-medium">
            Extra votes award Correct Vote points
          </Label>
          <p className="text-sm text-muted-foreground">
            When enabled, each correct extra vote (e.g., from an Extra Vote advantage) awards a separate +2 Correct Vote.
            When disabled, only the regular vote counts.
          </p>
        </div>
        <Switch
          id="extra-vote-scoring"
          checked={settings.extraVoteAwardsCorrectVote}
          onCheckedChange={(v) => handleToggle('extraVoteAwardsCorrectVote', v)}
          disabled={isSaving}
        />
      </div>
    </div>
  )
}
