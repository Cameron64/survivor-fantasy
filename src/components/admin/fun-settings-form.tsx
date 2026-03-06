'use client'

import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

interface FunSettingsFormProps {
  initialShowLastPlace: boolean
}

export function FunSettingsForm({ initialShowLastPlace }: FunSettingsFormProps) {
  const [showLastPlace, setShowLastPlace] = useState(initialShowLastPlace)
  const [isSaving, setIsSaving] = useState(false)

  const handleToggle = async (checked: boolean) => {
    setShowLastPlace(checked)
    setIsSaving(true)
    try {
      const res = await fetch('/api/league', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showLastPlace: checked }),
      })
      if (res.ok) {
        const result = await res.json()
        setShowLastPlace(result.showLastPlace)
      }
    } catch (error) {
      console.error('Failed to update fun settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="show-last-place" className="text-base font-medium">
            Dead Last Award
          </Label>
          <p className="text-sm text-muted-foreground">
            Pin the last-place player to the bottom of the standings with a skull badge.
          </p>
        </div>
        <Switch
          id="show-last-place"
          checked={showLastPlace}
          onCheckedChange={handleToggle}
          disabled={isSaving}
        />
      </div>
    </div>
  )
}
