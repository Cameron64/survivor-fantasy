'use client'

import { useCallback } from 'react'
import { useParams, useRouter, redirect } from 'next/navigation'
import type { GameEventData } from '@/lib/event-derivation'
import { useSubmitContext } from '../_lib/submit-context'
import { slugToType } from '../_lib/constants'
import {
  ImmunityChallengeForm,
  RewardChallengeForm,
} from '@/components/events/challenge-form'
import {
  IdolFoundForm,
  FireMakingForm,
  QuitMedevacForm,
  EndgameForm,
} from '@/components/events/simple-event-form'

export default function EventFormPage() {
  const params = useParams<{ type: string }>()
  const router = useRouter()
  const { contestants, tribes, setFormData, isLoading } = useSubmitContext()

  const eventType = slugToType(params.type)

  if (!eventType) {
    redirect('/events/submit')
  }

  // Tribal council uses sub-step routes
  if (eventType === 'TRIBAL_COUNCIL') {
    redirect(`/events/submit/${params.type}/attendees`)
  }

  const handleFormSubmit = useCallback(
    (data: GameEventData) => {
      setFormData(data)
      router.push(`/events/submit/${params.type}/review`)
    },
    [setFormData, router, params.type]
  )

  const goBack = () => {
    router.push('/events/submit')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  switch (eventType) {
    case 'IMMUNITY_CHALLENGE':
      return <ImmunityChallengeForm contestants={contestants} tribes={tribes} onSubmit={handleFormSubmit} onBack={goBack} />
    case 'REWARD_CHALLENGE':
      return <RewardChallengeForm contestants={contestants} tribes={tribes} onSubmit={handleFormSubmit} onBack={goBack} />
    case 'IDOL_FOUND':
      return <IdolFoundForm contestants={contestants} onSubmit={handleFormSubmit} onBack={goBack} />
    case 'FIRE_MAKING':
      return <FireMakingForm contestants={contestants} onSubmit={handleFormSubmit} onBack={goBack} />
    case 'QUIT_MEDEVAC':
      return <QuitMedevacForm contestants={contestants} onSubmit={handleFormSubmit} onBack={goBack} />
    case 'ENDGAME':
      return <EndgameForm contestants={contestants} onSubmit={handleFormSubmit} onBack={goBack} />
  }
}
