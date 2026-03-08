'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Check } from 'lucide-react'
import { ContestantSelectTile } from '@/components/shared/contestant-select-tile'
import type { FormContestant } from '@/components/shared/contestant-label'

interface SplitTribalFormProps {
  contestants: FormContestant[]
  onSubmit: (groups: { groupA: string[]; groupB: string[] }) => void
  onBack: () => void
}

/**
 * Split Tribal Council setup form.
 * Divides active contestants into two voting groups, then the user
 * submits each group as a separate Tribal Council event.
 */
export function SplitTribalForm({ contestants, onSubmit, onBack }: SplitTribalFormProps) {
  const [groupA, setGroupA] = useState<Set<string>>(new Set())
  const [groupB, setGroupB] = useState<Set<string>>(new Set())

  const active = useMemo(
    () => contestants.filter((c) => !c.isEliminated),
    [contestants]
  )

  const unassigned = useMemo(
    () => active.filter((c) => !groupA.has(c.id) && !groupB.has(c.id)),
    [active, groupA, groupB]
  )

  const toggleGroup = (id: string, group: 'A' | 'B') => {
    if (group === 'A') {
      const nextA = new Set(groupA)
      const nextB = new Set(groupB)
      if (nextA.has(id)) {
        nextA.delete(id)
      } else {
        nextA.add(id)
        nextB.delete(id)
      }
      setGroupA(nextA)
      setGroupB(nextB)
    } else {
      const nextA = new Set(groupA)
      const nextB = new Set(groupB)
      if (nextB.has(id)) {
        nextB.delete(id)
      } else {
        nextB.add(id)
        nextA.delete(id)
      }
      setGroupA(nextA)
      setGroupB(nextB)
    }
  }

  const isValid = groupA.size >= 2 && groupB.size >= 2 && unassigned.length === 0

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Split Tribal Council</h3>
        <p className="text-sm text-muted-foreground">
          Divide contestants into two voting groups. Each group will have its own tribal council.
        </p>
      </div>

      {/* Group assignment */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Assign contestants to groups</Label>
          {unassigned.length > 0 && (
            <Badge variant="secondary">{unassigned.length} unassigned</Badge>
          )}
        </div>

        <div className="space-y-2">
          {active.map((c) => {
            const inA = groupA.has(c.id)
            const inB = groupB.has(c.id)

            return (
              <div key={c.id} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <ContestantSelectTile
                    contestant={c}
                    isSelected={inA || inB}
                    onClick={() => {}}
                    variant="primary"
                  />
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => toggleGroup(c.id, 'A')}
                    className={`flex items-center justify-center h-8 w-8 rounded-md border text-xs font-bold transition-colors ${
                      inA
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-background hover:bg-muted border-muted-foreground/30'
                    }`}
                  >
                    {inA ? <Check className="h-3.5 w-3.5" /> : 'A'}
                  </button>
                  <button
                    onClick={() => toggleGroup(c.id, 'B')}
                    className={`flex items-center justify-center h-8 w-8 rounded-md border text-xs font-bold transition-colors ${
                      inB
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-background hover:bg-muted border-muted-foreground/30'
                    }`}
                  >
                    {inB ? <Check className="h-3.5 w-3.5" /> : 'B'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Group summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-blue-500/30">
          <CardContent className="p-3">
            <p className="text-sm font-medium text-blue-500">Group A</p>
            <p className="text-2xl font-bold">{groupA.size}</p>
            <p className="text-xs text-muted-foreground">contestants</p>
          </CardContent>
        </Card>
        <Card className="border-orange-500/30">
          <CardContent className="p-3">
            <p className="text-sm font-medium text-orange-500">Group B</p>
            <p className="text-2xl font-bold">{groupB.size}</p>
            <p className="text-xs text-muted-foreground">contestants</p>
          </CardContent>
        </Card>
      </div>

      {!isValid && unassigned.length === 0 && (groupA.size < 2 || groupB.size < 2) && (
        <p className="text-sm text-destructive">Each group must have at least 2 contestants.</p>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button
          onClick={() => onSubmit({
            groupA: Array.from(groupA),
            groupB: Array.from(groupB),
          })}
          disabled={!isValid}
          className="flex-1"
        >
          Start Group A Tribal
        </Button>
      </div>
    </div>
  )
}
