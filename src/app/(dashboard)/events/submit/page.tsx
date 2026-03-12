'use client'

import { useRouter } from 'next/navigation'
import type { GameEventType } from '@prisma/client'
import { Card, CardContent } from '@/components/ui/card'
import { Split } from 'lucide-react'
import { EVENT_TYPE_OPTIONS, EVENT_TYPE_THEMES, typeToSlug } from './_lib/constants'
import { useSubmitContext } from './_lib/submit-context'
import { isTribeSwapEnabled, isTribeMergeEnabled } from '@/lib/feature-flags'
import { useFeatureFlags } from '@/lib/feature-flags-context'

export default function SelectTypePage() {
  const router = useRouter()
  const { setFormData, resetTribalState, setSplitTribal, episodePhase } = useSubmitContext()
  const flags = useFeatureFlags()

  const handleTypeSelect = (type: GameEventType) => {
    setFormData(null)
    resetTribalState()
    setSplitTribal(null)
    router.push(`/events/submit/${typeToSlug(type)}`)
  }

  const handleSplitTribal = () => {
    setFormData(null)
    resetTribalState()
    setSplitTribal(null)
    router.push('/events/submit/split-tribal')
  }

  // Show split tribal option when in merged or final phase
  const showSplitTribal = episodePhase === 'MERGED' || episodePhase === 'FINAL_PHASE'

  // Filter event types based on feature flags
  const availableEventTypes = EVENT_TYPE_OPTIONS.filter((option) => {
    if (option.type === 'TRIBE_SWAP') return isTribeSwapEnabled(flags)
    if (option.type === 'TRIBE_MERGE') return isTribeMergeEnabled(flags)
    return true
  })

  return (
    <div className="grid gap-3">
      {availableEventTypes.map((option) => {
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

      {showSplitTribal && (
        <Card
          data-testid="event-type-SPLIT_TRIBAL"
          className="cursor-pointer border-l-4 border-l-orange-400 hover:border-orange-300 hover:shadow-md active:scale-[0.98] transition-all duration-200"
          onClick={handleSplitTribal}
        >
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-400/10">
              <Split className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <p className="font-medium">Split Tribal Council</p>
              <p className="text-sm text-muted-foreground">Two tribal councils in one episode</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
