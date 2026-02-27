'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EventType } from '@prisma/client'
import { getEventTypeLabel, getEventTypesByCategory } from '@/lib/scoring'

interface ScoringConfigFormProps {
  defaults: Record<EventType, number>
  initialOverrides: Partial<Record<EventType, number>>
}

export function ScoringConfigForm({ defaults, initialOverrides }: ScoringConfigFormProps) {
  const [values, setValues] = useState<Record<EventType, string>>(() => {
    const merged = { ...defaults, ...initialOverrides }
    return Object.fromEntries(
      Object.entries(merged).map(([k, v]) => [k, v.toString()])
    ) as Record<EventType, string>
  })
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const categories = getEventTypesByCategory()

  const handleChange = (type: EventType, val: string) => {
    setValues((prev) => ({ ...prev, [type]: val }))
    setMessage(null)
  }

  const isModified = (type: EventType): boolean => {
    const current = parseInt(values[type])
    if (isNaN(current)) return false
    return current !== defaults[type]
  }

  const hasChanges = Object.keys(defaults).some((t) => isModified(t as EventType))

  const handleSave = async () => {
    setIsSaving(true)
    setMessage(null)

    // Build overrides: all current values (let the API strip matching defaults)
    const overrides: Partial<Record<EventType, number>> = {}
    for (const [type, val] of Object.entries(values)) {
      const num = parseInt(val)
      if (isNaN(num)) {
        setMessage({ type: 'error', text: `Invalid value for ${getEventTypeLabel(type as EventType)}` })
        setIsSaving(false)
        return
      }
      overrides[type as EventType] = num
    }

    try {
      const res = await fetch('/api/league/scoring', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrides }),
      })

      if (res.ok) {
        const data = await res.json()
        setMessage({
          type: 'success',
          text: data.recalculated
            ? 'Scoring config saved. All existing events recalculated.'
            : 'Scoring config saved.',
        })
      } else {
        const err = await res.json()
        setMessage({ type: 'error', text: err.error || 'Failed to save' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setValues(
      Object.fromEntries(
        Object.entries(defaults).map(([k, v]) => [k, v.toString()])
      ) as Record<EventType, string>
    )
    setMessage(null)
  }

  const categoryStyle = (category: string) => {
    if (category === 'Deductions') return 'text-destructive'
    return 'text-primary'
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(categories).map(([category, types]) => (
          <div key={category}>
            <h4 className={`font-medium text-sm mb-3 ${categoryStyle(category)}`}>
              {category}
            </h4>
            <div className="space-y-2">
              {types.map((type) => (
                <div key={type} className="flex items-center gap-2">
                  <label
                    htmlFor={`scoring-${type}`}
                    className={`text-sm flex-1 ${isModified(type) ? 'font-medium' : ''}`}
                  >
                    {getEventTypeLabel(type)}
                    {isModified(type) && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        (default: {defaults[type] > 0 ? '+' : ''}{defaults[type]})
                      </span>
                    )}
                  </label>
                  <Input
                    id={`scoring-${type}`}
                    type="number"
                    value={values[type]}
                    onChange={(e) => handleChange(type, e.target.value)}
                    className={`w-20 h-8 text-right ${isModified(type) ? 'border-primary' : ''}`}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {message && (
        <p className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
          {message.text}
        </p>
      )}

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Scoring Config'}
        </Button>
        {hasChanges && (
          <Button variant="outline" onClick={handleReset} disabled={isSaving}>
            Reset to Defaults
          </Button>
        )}
      </div>
    </div>
  )
}
