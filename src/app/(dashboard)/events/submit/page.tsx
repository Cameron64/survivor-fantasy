'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft,
  Flame,
  Shield,
  Gift,
  Search,
  Swords,
  LogOut,
  Trophy,
} from 'lucide-react'
import { GameEventType } from '@prisma/client'
import { deriveEvents, type GameEventData } from '@/lib/event-derivation'
import { getCurrentWeek } from '@/lib/season'
import { TribalCouncilForm } from '@/components/events/tribal-council-form'
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
import { EventReview } from '@/components/events/event-review'

interface Contestant {
  id: string
  name: string
  tribe: string | null
  isEliminated: boolean
}

type WizardStep = 'type' | 'form' | 'review'

const EVENT_TYPE_OPTIONS: {
  type: GameEventType
  label: string
  description: string
  icon: typeof Flame
}[] = [
  {
    type: 'TRIBAL_COUNCIL',
    label: 'Tribal Council',
    description: 'Votes, elimination, blindsides',
    icon: Flame,
  },
  {
    type: 'IMMUNITY_CHALLENGE',
    label: 'Immunity Challenge',
    description: 'Individual immunity win',
    icon: Shield,
  },
  {
    type: 'REWARD_CHALLENGE',
    label: 'Reward Challenge',
    description: 'Reward or team challenge win',
    icon: Gift,
  },
  {
    type: 'IDOL_FOUND',
    label: 'Idol Found',
    description: 'Hidden immunity idol discovery',
    icon: Search,
  },
  {
    type: 'FIRE_MAKING',
    label: 'Fire Making',
    description: 'Fire making challenge',
    icon: Swords,
  },
  {
    type: 'QUIT_MEDEVAC',
    label: 'Quit / Medevac',
    description: 'Player quit or medical evacuation',
    icon: LogOut,
  },
  {
    type: 'ENDGAME',
    label: 'Endgame',
    description: 'Finalists and winner',
    icon: Trophy,
  },
]

export default function SubmitEventPage() {
  const router = useRouter()
  const [contestants, setContestants] = useState<Contestant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Wizard state
  const [step, setStep] = useState<WizardStep>('type')
  const [selectedType, setSelectedType] = useState<GameEventType | null>(null)
  const [week, setWeek] = useState(() => getCurrentWeek().toString())
  const [isEditingWeek, setIsEditingWeek] = useState(false)
  const [formData, setFormData] = useState<GameEventData | null>(null)

  useEffect(() => {
    fetch('/api/contestants')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setContestants(data)
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  const contestantNames = useMemo(
    () => Object.fromEntries(contestants.map((c) => [c.id, c.name])),
    [contestants]
  )

  const derivedEvents = useMemo(() => {
    if (!selectedType || !formData) return []
    return deriveEvents(selectedType, formData)
  }, [selectedType, formData])

  const handleTypeSelect = (type: GameEventType) => {
    setSelectedType(type)
    setStep('form')
  }

  const handleFormSubmit = useCallback((data: GameEventData) => {
    setFormData(data)
    setStep('review')
  }, [])

  const handleConfirm = async () => {
    if (!selectedType || !formData || !week) return

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/game-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          week: parseInt(week),
          data: formData,
        }),
      })

      if (res.ok) {
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
    switch (step) {
      case 'form':
        setStep('type')
        break
      case 'review':
        setStep('form')
        setFormData(null)
        break
      default:
        router.push('/events')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/events')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Log Game Event</h1>
          <p className="text-sm text-muted-foreground">
            {step === 'type' && 'What happened?'}
            {step === 'form' && EVENT_TYPE_OPTIONS.find((o) => o.type === selectedType)?.label}
            {step === 'review' && 'Confirm & submit'}
          </p>
        </div>
      </div>

      {/* Step: Select Event Type */}
      {step === 'type' && (
        <div className="grid gap-3">
          {EVENT_TYPE_OPTIONS.map((option) => {
            const Icon = option.icon
            return (
              <Card
                key={option.type}
                data-testid={`event-type-${option.type}`}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => handleTypeSelect(option.type)}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{option.label}</p>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Week indicator (editable) */}
      {(step === 'form' || step === 'review') && (
        <div className="flex items-center gap-2">
          {isEditingWeek ? (
            <>
              <Label htmlFor="week-edit" className="text-sm font-medium whitespace-nowrap">
                Week
              </Label>
              <Input
                id="week-edit"
                data-testid="week-input"
                type="number"
                min="1"
                max="14"
                value={week}
                onChange={(e) => setWeek(e.target.value)}
                className="w-20 h-8"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'Escape') {
                    const val = parseInt(week)
                    if (!val || val < 1 || val > 14) setWeek(getCurrentWeek().toString())
                    setIsEditingWeek(false)
                  }
                }}
                onBlur={() => {
                  const val = parseInt(week)
                  if (!val || val < 1 || val > 14) setWeek(getCurrentWeek().toString())
                  setIsEditingWeek(false)
                }}
              />
            </>
          ) : (
            <button
              type="button"
              data-testid="week-edit-button"
              onClick={() => setIsEditingWeek(true)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Week {week} <span className="text-xs">(edit)</span>
            </button>
          )}
        </div>
      )}

      {/* Step: Event-Specific Form */}
      {step === 'form' && selectedType === 'TRIBAL_COUNCIL' && (
        <TribalCouncilForm
          contestants={contestants}
          onSubmit={handleFormSubmit}
          onBack={goBack}
        />
      )}
      {step === 'form' && selectedType === 'IMMUNITY_CHALLENGE' && (
        <ImmunityChallengeForm
          contestants={contestants}
          onSubmit={handleFormSubmit}
          onBack={goBack}
        />
      )}
      {step === 'form' && selectedType === 'REWARD_CHALLENGE' && (
        <RewardChallengeForm
          contestants={contestants}
          onSubmit={handleFormSubmit}
          onBack={goBack}
        />
      )}
      {step === 'form' && selectedType === 'IDOL_FOUND' && (
        <IdolFoundForm
          contestants={contestants}
          onSubmit={handleFormSubmit}
          onBack={goBack}
        />
      )}
      {step === 'form' && selectedType === 'FIRE_MAKING' && (
        <FireMakingForm
          contestants={contestants}
          onSubmit={handleFormSubmit}
          onBack={goBack}
        />
      )}
      {step === 'form' && selectedType === 'QUIT_MEDEVAC' && (
        <QuitMedevacForm
          contestants={contestants}
          onSubmit={handleFormSubmit}
          onBack={goBack}
        />
      )}
      {step === 'form' && selectedType === 'ENDGAME' && (
        <EndgameForm
          contestants={contestants}
          onSubmit={handleFormSubmit}
          onBack={goBack}
        />
      )}

      {/* Step: Review */}
      {step === 'review' && (
        <EventReview
          events={derivedEvents}
          contestantNames={contestantNames}
          onConfirm={handleConfirm}
          onBack={goBack}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  )
}
