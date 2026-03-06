'use client'

import { useParams, redirect } from 'next/navigation'
import { slugToType } from '../../_lib/constants'
import {
  AttendeesStep,
  VotesStep,
  EliminationStep,
  ExtrasStep,
} from '../../_lib/tribal-steps'

const TRIBAL_STEPS = new Set(['attendees', 'votes', 'elimination', 'extras'])

export default function SubStepPage() {
  const params = useParams<{ type: string; step: string }>()
  const eventType = slugToType(params.type)

  if (!eventType) {
    redirect('/events/submit')
  }

  // Only tribal council has sub-steps
  if (eventType !== 'TRIBAL_COUNCIL' || !TRIBAL_STEPS.has(params.step)) {
    redirect(`/events/submit/${params.type}`)
  }

  switch (params.step) {
    case 'attendees':
      return <AttendeesStep />
    case 'votes':
      return <VotesStep />
    case 'elimination':
      return <EliminationStep />
    case 'extras':
      return <ExtrasStep />
    default:
      redirect(`/events/submit/${params.type}`)
  }
}
