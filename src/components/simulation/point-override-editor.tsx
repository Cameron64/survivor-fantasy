'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronRight, RotateCcw } from 'lucide-react'
import type { SimEventType } from '@/simulation/engine/types'
import {
  DEFAULT_BASE_POINTS,
  SIM_EVENT_LABELS,
  EVENT_CATEGORIES,
  CATEGORY_COLORS,
} from './sim-constants'

interface PointOverrideEditorProps {
  overrides: Partial<Record<SimEventType, number>>
  onChange: (overrides: Partial<Record<SimEventType, number>>) => void
}

export function PointOverrideEditor({ overrides, onChange }: PointOverrideEditorProps) {
  const [expanded, setExpanded] = useState(false)

  const hasOverrides = Object.keys(overrides).length > 0

  return (
    <Card>
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <CardTitle className="text-base">
              Point Overrides
              {hasOverrides && (
                <span className="ml-2 text-xs font-normal text-teal-600">
                  ({Object.keys(overrides).length} modified)
                </span>
              )}
            </CardTitle>
          </div>
          {hasOverrides && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onChange({})
              }}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset All
            </Button>
          )}
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-6">
          {Object.entries(EVENT_CATEGORIES).map(([category, eventTypes]) => (
            <div key={category}>
              <h4
                className="text-sm font-semibold mb-2"
                style={{ color: CATEGORY_COLORS[category] }}
              >
                {category}
              </h4>
              <div className="space-y-2">
                {eventTypes.map((eventType) => {
                  const baseValue = DEFAULT_BASE_POINTS[eventType]
                  const currentValue = overrides[eventType]
                  const isOverridden = currentValue !== undefined

                  return (
                    <div key={eventType} className="flex items-center gap-3">
                      <span className="text-sm flex-1 min-w-0 truncate">
                        {SIM_EVENT_LABELS[eventType]}
                      </span>
                      <span className="text-xs text-muted-foreground w-8 text-right">
                        {baseValue}
                      </span>
                      <Input
                        type="number"
                        className={`w-20 h-8 text-sm ${isOverridden ? 'border-teal-500' : ''}`}
                        value={isOverridden ? currentValue : baseValue}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10)
                          if (isNaN(val) || val === baseValue) {
                            const next = { ...overrides }
                            delete next[eventType]
                            onChange(next)
                          } else {
                            onChange({ ...overrides, [eventType]: val })
                          }
                        }}
                      />
                      {isOverridden && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            const next = { ...overrides }
                            delete next[eventType]
                            onChange(next)
                          }}
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  )
}
