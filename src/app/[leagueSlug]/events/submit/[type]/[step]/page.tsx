'use client'

import { useParams, usePathname, redirect } from 'next/navigation'
import { slugToType } from '../../_lib/constants'
import {
  AttendeesStep,
  VotesStep,
  TieResolutionStep,
  RevoteStep,
  RockDrawStep,
  EliminationStep,
  ExtrasStep,
} from '../../_lib/tribal-steps'

const TRIBAL_STEPS = new Set(['attendees', 'votes', 'tie-resolution', 'revote', 'rock-draw', 'elimination', 'extras'])

export default function SubStepPage() {
  const params = useParams<{ type: string; step: string }>()
  const pathname = usePathname()
  const leagueSlug = pathname.split('/')[1]
  const eventType = slugToType(params.type)

  if (!eventType) {
    redirect(`/${leagueSlug}/events/submit`)
  }

  // Only tribal council has sub-steps
  if (eventType !== 'TRIBAL_COUNCIL' || !TRIBAL_STEPS.has(params.step)) {
    redirect(`/${leagueSlug}/events/submit/${params.type}`)
  }

  switch (params.step) {
    case 'attendees':
      return <AttendeesStep />
    case 'votes':
      return <VotesStep />
    case 'tie-resolution':
      return <TieResolutionStep />
    case 'revote':
      return <RevoteStep />
    case 'rock-draw':
      return <RockDrawStep />
    case 'elimination':
      return <EliminationStep />
    case 'extras':
      return <ExtrasStep />
    default:
      redirect(`/${leagueSlug}/events/submit/${params.type}`)
  }
}
