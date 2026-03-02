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
  Calendar,
  Check,
} from 'lucide-react'
import { GameEventType, EventType } from '@prisma/client'
import { deriveEvents, type GameEventData } from '@/lib/event-derivation'
import { getCurrentWeek } from '@/lib/season'
import { getDisplayName } from '@/components/shared/contestant-label'
import type { FormContestant } from '@/components/shared/contestant-label'
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

interface TribeMembership {
  tribe: { id: string; name: string; color: string; buffImage?: string | null }
}

interface RawContestant {
  id: string
  name: string
  nickname?: string | null
  imageUrl?: string | null
  tribe: string | null
  isEliminated: boolean
  tribeMemberships?: TribeMembership[]
}

interface TribeGroup {
  id: string
  name: string
  color: string
  buffImage?: string | null
  contestantIds: string[]
  contestantNames: string[]
}

type WizardStep = 'type' | 'form' | 'review'

const WIZARD_STEPS: { key: WizardStep; label: string }[] = [
  { key: 'type', label: 'Select Type' },
  { key: 'form', label: 'Details' },
  { key: 'review', label: 'Review' },
]

function WizardStepIndicator({ currentStep }: { currentStep: WizardStep }) {
  const currentIndex = WIZARD_STEPS.findIndex((s) => s.key === currentStep)

  return (
    <div className="flex items-center justify-between">
      {WIZARD_STEPS.map((wizardStep, i) => {
        const isCompleted = i < currentIndex
        const isCurrent = i === currentIndex

        return (
          <div key={wizardStep.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-200 ${
                  isCompleted
                    ? 'bg-primary border-primary text-primary-foreground'
                    : isCurrent
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-muted-foreground/30 text-muted-foreground/50'
                }`}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span className="text-xs font-semibold">{i + 1}</span>
                )}
              </div>
              <span
                className={`text-xs font-medium transition-colors duration-200 ${
                  isCompleted || isCurrent ? 'text-foreground' : 'text-muted-foreground/50'
                }`}
              >
                {wizardStep.label}
              </span>
            </div>
            {i < WIZARD_STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 mb-5 transition-colors duration-200 ${
                  i < currentIndex ? 'bg-primary' : 'bg-muted-foreground/20'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

export interface EventTypeTheme {
  iconBg: string
  iconText: string
  borderColor: string
  hoverBorder: string
}

const EVENT_TYPE_THEMES: Record<GameEventType, EventTypeTheme> = {
  TRIBAL_COUNCIL: {
    iconBg: 'bg-orange-500/10',
    iconText: 'text-orange-500',
    borderColor: 'border-l-orange-500',
    hoverBorder: 'hover:border-orange-400',
  },
  IMMUNITY_CHALLENGE: {
    iconBg: 'bg-blue-500/10',
    iconText: 'text-blue-500',
    borderColor: 'border-l-blue-500',
    hoverBorder: 'hover:border-blue-400',
  },
  REWARD_CHALLENGE: {
    iconBg: 'bg-emerald-500/10',
    iconText: 'text-emerald-500',
    borderColor: 'border-l-emerald-500',
    hoverBorder: 'hover:border-emerald-400',
  },
  IDOL_FOUND: {
    iconBg: 'bg-yellow-500/10',
    iconText: 'text-yellow-500',
    borderColor: 'border-l-yellow-500',
    hoverBorder: 'hover:border-yellow-400',
  },
  FIRE_MAKING: {
    iconBg: 'bg-red-500/10',
    iconText: 'text-red-500',
    borderColor: 'border-l-red-500',
    hoverBorder: 'hover:border-red-400',
  },
  QUIT_MEDEVAC: {
    iconBg: 'bg-slate-500/10',
    iconText: 'text-slate-500',
    borderColor: 'border-l-slate-500',
    hoverBorder: 'hover:border-slate-400',
  },
  ENDGAME: {
    iconBg: 'bg-yellow-400/10',
    iconText: 'text-yellow-400',
    borderColor: 'border-l-yellow-400',
    hoverBorder: 'hover:border-yellow-300',
  },
}

const EVENT_TYPE_OPTIONS: {
  type: GameEventType
  label: string
  description: string
  icon: typeof Flame
}[] = [
  {
    type: 'TRIBAL_COUNCIL',
    label: 'Tribal Council',
    description: 'Votes, elimination, idols, jury',
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

export default function SubmitEventForm() {
  const router = useRouter()
  const [contestants, setContestants] = useState<FormContestant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Wizard state
  const [step, setStep] = useState<WizardStep>('type')
  const [selectedType, setSelectedType] = useState<GameEventType | null>(null)
  const [week, setWeek] = useState(() => getCurrentWeek().toString())
  const [isEditingWeek, setIsEditingWeek] = useState(false)
  const [formData, setFormData] = useState<GameEventData | null>(null)

  const [tribes, setTribes] = useState<TribeGroup[]>([])
  const [pointValues, setPointValues] = useState<Record<EventType, number> | undefined>(undefined)

  useEffect(() => {
    fetch('/api/league/scoring')
      .then((res) => res.json())
      .then((data) => {
        if (data.effective) {
          setPointValues(data.effective)
        }
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    fetch('/api/contestants?includeMemberships=true')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          // Enrich contestants with tribeColor from memberships
          const enriched: FormContestant[] = (data as RawContestant[]).map((c) => ({
            id: c.id,
            name: c.name,
            nickname: c.nickname,
            imageUrl: c.imageUrl,
            tribe: c.tribe,
            tribeColor: c.tribeMemberships?.[0]?.tribe.color ?? null,
            isEliminated: c.isEliminated,
          }))
          setContestants(enriched)

          // Build tribe groups from membership data
          const tribeMap = new Map<string, TribeGroup>()
          for (const raw of data as RawContestant[]) {
            if (raw.isEliminated) continue
            const membership = raw.tribeMemberships?.[0]
            if (!membership) continue
            const t = membership.tribe
            if (!tribeMap.has(t.id)) {
              tribeMap.set(t.id, { id: t.id, name: t.name, color: t.color, buffImage: t.buffImage, contestantIds: [], contestantNames: [] })
            }
            const group = tribeMap.get(t.id)!
            group.contestantIds.push(raw.id)
            group.contestantNames.push(raw.nickname || raw.name)
          }
          setTribes(Array.from(tribeMap.values()))
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  const contestantNames = useMemo(
    () => Object.fromEntries(contestants.map((c) => [c.id, getDisplayName(c)])),
    [contestants]
  )

  const derivedEvents = useMemo(() => {
    if (!selectedType || !formData) return []
    return deriveEvents(selectedType, formData, pointValues)
  }, [selectedType, formData, pointValues])

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

      {/* Wizard Step Indicator */}
      <WizardStepIndicator currentStep={step} />

      {/* Step: Select Event Type */}
      {step === 'type' && (
        <div className="grid gap-3">
          {EVENT_TYPE_OPTIONS.map((option) => {
            const Icon = option.icon
            const theme = EVENT_TYPE_THEMES[option.type]
            return (
              <Card
                key={option.type}
                data-testid={`event-type-${option.type}`}
                className={`cursor-pointer border-l-4 ${theme.borderColor} ${theme.hoverBorder} hover:shadow-md active:scale-[0.98] transition-all duration-200`}
                onClick={() => handleTypeSelect(option.type)}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full ${theme.iconBg}`}>
                    <Icon className={`h-5 w-5 ${theme.iconText}`} />
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
            <div className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
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
                className="w-16 h-7 text-sm"
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
            </div>
          ) : (
            <button
              type="button"
              data-testid="week-edit-button"
              onClick={() => setIsEditingWeek(true)}
              className="inline-flex items-center gap-1.5 bg-muted/50 hover:bg-muted rounded-full px-3 py-1.5 text-sm font-medium text-foreground transition-colors"
            >
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              Week {week}
              <span className="text-xs text-muted-foreground ml-0.5">tap to edit</span>
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
          tribes={tribes}
          onSubmit={handleFormSubmit}
          onBack={goBack}
        />
      )}
      {step === 'form' && selectedType === 'REWARD_CHALLENGE' && (
        <RewardChallengeForm
          contestants={contestants}
          tribes={tribes}
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
      {step === 'review' && selectedType && (
        <EventReview
          events={derivedEvents}
          contestantNames={contestantNames}
          eventType={selectedType}
          eventTypeLabel={EVENT_TYPE_OPTIONS.find((o) => o.type === selectedType)?.label ?? ''}
          eventTypeIcon={EVENT_TYPE_OPTIONS.find((o) => o.type === selectedType)?.icon ?? Flame}
          eventTypeTheme={EVENT_TYPE_THEMES[selectedType]}
          onConfirm={handleConfirm}
          onBack={goBack}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  )
}
