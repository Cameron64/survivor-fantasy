'use client'

import { useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Flame } from 'lucide-react'
import { deriveEvents } from '@/lib/event-derivation'
import { useSubmitContext } from '../../_lib/submit-context'
import { EVENT_TYPE_OPTIONS, EVENT_TYPE_THEMES, slugToType } from '../../_lib/constants'
import { EventReview } from '@/components/events/event-review'

export default function ReviewPage() {
  const params = useParams<{ type: string }>()
  const router = useRouter()
  const { contestants, contestantNames, pointValues, week, formData, setFormData, splitTribal, setSplitTribal, tribalState, resetTribalState } = useSubmitContext()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const eventType = slugToType(params.type)

  const derivedEvents = useMemo(() => {
    if (!eventType || !formData) return []
    try {
      console.log('Deriving events for:', eventType, 'with data:', formData)
      return deriveEvents(eventType, formData, pointValues)
    } catch (err) {
      console.error('Error deriving events:', err)
      return []
    }
  }, [eventType, formData, pointValues])

  const option = eventType ? EVENT_TYPE_OPTIONS.find((o) => o.type === eventType) : undefined

  const handleConfirm = async () => {
    if (!week) return

    setIsSubmitting(true)
    setError(null)
    try {
      const payload = {
        type: eventType,
        week: parseInt(week),
        data: formData,
      }

      console.log('Submitting game event:', JSON.stringify(payload, null, 2))

      const res = await fetch('/api/game-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setFormData(null)
        resetTribalState()

        // If this TC was part of a split tribal, mark the group as complete
        if (splitTribal && eventType === 'TRIBAL_COUNCIL') {
          const attendees = Array.from(tribalState.selectedAttendees)
          const isGroupA = splitTribal.groupA.some((id) => attendees.includes(id))
          setSplitTribal({
            ...splitTribal,
            groupAComplete: isGroupA ? true : splitTribal.groupAComplete,
            groupBComplete: !isGroupA ? true : splitTribal.groupBComplete,
          })
          router.push('/events/submit/split-tribal')
        } else {
          router.push('/events')
        }
      } else {
        const err = await res.json()
        const errorMessage = err.error || 'Failed to submit event'
        console.error('Failed to submit:', err)
        setError(errorMessage)
      }
    } catch (error) {
      console.error('Failed to submit game event:', error)
      setError(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const goBack = () => {
    router.push(`/events/submit/${params.type}`)
  }

  // Simple validation - just show loading if no data
  if (!eventType || !formData) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-medium text-red-900">Submission Error</p>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      )}
      <EventReview
        events={derivedEvents}
        contestantNames={contestantNames}
        contestants={contestants}
        eventType={eventType ?? ''}
        eventTypeLabel={option?.label ?? ''}
        eventTypeIcon={option?.icon ?? Flame}
        eventTypeTheme={eventType ? EVENT_TYPE_THEMES[eventType] : EVENT_TYPE_THEMES.TRIBAL_COUNCIL}
        onConfirm={handleConfirm}
        onBack={goBack}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}
