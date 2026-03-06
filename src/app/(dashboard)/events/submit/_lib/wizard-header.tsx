'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Calendar, Check } from 'lucide-react'
import { getCurrentWeek } from '@/lib/season'
import { useSubmitContext } from './submit-context'
import { EVENT_TYPE_OPTIONS, slugToType } from './constants'

type WizardStep = 'type' | 'form' | 'review'

const WIZARD_STEPS: { key: WizardStep; label: string }[] = [
  { key: 'type', label: 'Select Type' },
  { key: 'form', label: 'Details' },
  { key: 'review', label: 'Review' },
]

function getSlugFromPath(pathname: string): string | null {
  const segments = pathname.split('/')
  const submitIndex = segments.indexOf('submit')
  if (submitIndex >= 0 && submitIndex + 1 < segments.length) {
    return segments[submitIndex + 1] || null
  }
  return null
}

function getSubStepFromPath(pathname: string): string | null {
  const segments = pathname.split('/')
  const submitIndex = segments.indexOf('submit')
  if (submitIndex >= 0 && submitIndex + 2 < segments.length) {
    return segments[submitIndex + 2] || null
  }
  return null
}

function getStepFromPath(pathname: string): WizardStep {
  const subStep = getSubStepFromPath(pathname)
  if (subStep === 'review') return 'review'
  if (getSlugFromPath(pathname)) return 'form'
  return 'type'
}

function StepIndicator({ currentStep }: { currentStep: WizardStep }) {
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

function WeekEditor() {
  const { week, setWeek } = useSubmitContext()
  const [isEditing, setIsEditing] = useState(false)

  return (
    <div className="flex items-center gap-2">
      {isEditing ? (
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
                setIsEditing(false)
              }
            }}
            onBlur={() => {
              const val = parseInt(week)
              if (!val || val < 1 || val > 14) setWeek(getCurrentWeek().toString())
              setIsEditing(false)
            }}
          />
        </div>
      ) : (
        <button
          type="button"
          data-testid="week-edit-button"
          onClick={() => setIsEditing(true)}
          className="inline-flex items-center gap-1.5 bg-muted/50 hover:bg-muted rounded-full px-3 py-1.5 text-sm font-medium text-foreground transition-colors"
        >
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          Week {week}
          <span className="text-xs text-muted-foreground ml-0.5">tap to edit</span>
        </button>
      )}
    </div>
  )
}

export function WizardHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const currentStep = getStepFromPath(pathname)
  const slug = getSlugFromPath(pathname)
  const selectedType = slug ? slugToType(slug) : null

  const subStep = getSubStepFromPath(pathname)

  const goBack = () => {
    if (currentStep === 'review') {
      // For TC, go back to last sub-step; for others, go back to form
      if (selectedType === 'TRIBAL_COUNCIL') {
        router.push(`/events/submit/${slug}/extras`)
      } else {
        router.push(`/events/submit/${slug}`)
      }
      return
    }

    // TC sub-step back navigation
    if (currentStep === 'form' && subStep) {
      const tcStepOrder = ['attendees', 'votes', 'elimination', 'extras']
      const idx = tcStepOrder.indexOf(subStep)
      if (idx > 0) {
        router.push(`/events/submit/${slug}/${tcStepOrder[idx - 1]}`)
        return
      }
    }

    if (currentStep === 'form') {
      router.push('/events/submit')
    } else {
      router.push('/events')
    }
  }

  const subtitle =
    currentStep === 'type'
      ? 'What happened?'
      : currentStep === 'form'
        ? EVENT_TYPE_OPTIONS.find((o) => o.type === selectedType)?.label ?? ''
        : 'Confirm & submit'

  return (
    <>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={goBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Log Game Event</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <StepIndicator currentStep={currentStep} />

      {currentStep !== 'type' && <WeekEditor />}
    </>
  )
}
