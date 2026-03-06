'use client'

import { useRouter } from 'next/navigation'
import type { GameEventType } from '@prisma/client'
import { Card, CardContent } from '@/components/ui/card'
import { EVENT_TYPE_OPTIONS, EVENT_TYPE_THEMES, typeToSlug } from './_lib/constants'
import { useSubmitContext } from './_lib/submit-context'

export default function SelectTypePage() {
  const router = useRouter()
  const { setFormData, resetTribalState } = useSubmitContext()

  const handleTypeSelect = (type: GameEventType) => {
    setFormData(null)
    resetTribalState()
    router.push(`/events/submit/${typeToSlug(type)}`)
  }

  return (
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
  )
}
