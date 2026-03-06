'use client'

import { useState, useMemo } from 'react'
import { useParams, useRouter, redirect } from 'next/navigation'
import { Flame } from 'lucide-react'
import { deriveEvents } from '@/lib/event-derivation'
import { useSubmitContext } from '../../_lib/submit-context'
import { EVENT_TYPE_OPTIONS, EVENT_TYPE_THEMES, slugToType } from '../../_lib/constants'
import { EventReview } from '@/components/events/event-review'

export default function ReviewPage() {
  const params = useParams<{ type: string }>()
  const router = useRouter()
  const { contestantNames, pointValues, week, formData, setFormData } = useSubmitContext()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const eventType = slugToType(params.type)

  if (!eventType) {
    redirect('/events/submit')
  }

  if (!formData) {
    redirect(`/events/submit/${params.type}`)
  }

  const derivedEvents = useMemo(
    () => deriveEvents(eventType, formData, pointValues),
    [eventType, formData, pointValues]
  )

  const option = EVENT_TYPE_OPTIONS.find((o) => o.type === eventType)

  const handleConfirm = async () => {
    if (!week) return

    setIsSubmitting(true)
    try {
      const payload = {
        type: eventType,
        week: parseInt(week),
        data: formData,
      }

      const res = await fetch('/api/game-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setFormData(null)
        router.push('/events')
      } else {
        const err = await res.json()
        console.error('Failed to submit:', err)
      }
    } catch (error) {
      console.error('Failed to submit game event:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const goBack = () => {
    router.push(`/events/submit/${params.type}`)
  }

  return (
    <EventReview
      events={derivedEvents}
      contestantNames={contestantNames}
      eventType={eventType}
      eventTypeLabel={option?.label ?? ''}
      eventTypeIcon={option?.icon ?? Flame}
      eventTypeTheme={EVENT_TYPE_THEMES[eventType]}
      onConfirm={handleConfirm}
      onBack={goBack}
      isSubmitting={isSubmitting}
    />
  )
}
