'use client'

import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

interface PrivacySettingsFormProps {
  initialIsPublic: boolean
  initialAllowGuestEvents: boolean
  initialAllowUserEvents: boolean
}

export function PrivacySettingsForm({
  initialIsPublic,
  initialAllowGuestEvents,
  initialAllowUserEvents,
}: PrivacySettingsFormProps) {
  const [isPublic, setIsPublic] = useState(initialIsPublic)
  const [allowGuestEvents, setAllowGuestEvents] = useState(initialAllowGuestEvents)
  const [allowUserEvents, setAllowUserEvents] = useState(initialAllowUserEvents)
  const [isSaving, setIsSaving] = useState(false)

  const save = async (data: { isPublic?: boolean; allowGuestEvents?: boolean; allowUserEvents?: boolean }) => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/league', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        const result = await res.json()
        setIsPublic(result.isPublic)
        setAllowGuestEvents(result.allowGuestEvents)
        setAllowUserEvents(result.allowUserEvents)
      }
    } catch (error) {
      console.error('Failed to update privacy settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublicToggle = (checked: boolean) => {
    setIsPublic(checked)
    if (!checked) setAllowGuestEvents(false)
    save({ isPublic: checked })
  }

  const handleGuestEventsToggle = (checked: boolean) => {
    setAllowGuestEvents(checked)
    save({ allowGuestEvents: checked })
  }

  const handleUserEventsToggle = (checked: boolean) => {
    setAllowUserEvents(checked)
    save({ allowUserEvents: checked })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="public-mode" className="text-base font-medium">
            Public Mode
          </Label>
          <p className="text-sm text-muted-foreground">
            Allow anyone to view the leaderboard, contestants, and events without signing in.
          </p>
        </div>
        <Switch
          id="public-mode"
          checked={isPublic}
          onCheckedChange={handlePublicToggle}
          disabled={isSaving}
        />
      </div>

      {isPublic && (
        <div className="flex items-center justify-between pl-4 border-l-2 border-muted">
          <div className="space-y-0.5">
            <Label htmlFor="guest-events" className="text-base font-medium">
              Allow Guest Event Submissions
            </Label>
            <p className="text-sm text-muted-foreground">
              Let unauthenticated visitors submit game events for scoring.
            </p>
          </div>
          <Switch
            id="guest-events"
            checked={allowGuestEvents}
            onCheckedChange={handleGuestEventsToggle}
            disabled={isSaving}
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="user-events" className="text-base font-medium">
            Allow User Event Submissions
          </Label>
          <p className="text-sm text-muted-foreground">
            Let registered users submit game events. When off, only admins and moderators can submit.
          </p>
        </div>
        <Switch
          id="user-events"
          checked={allowUserEvents}
          onCheckedChange={handleUserEventsToggle}
          disabled={isSaving}
        />
      </div>
    </div>
  )
}
