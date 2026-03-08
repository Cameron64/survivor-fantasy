'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { TribeMergeData } from '@/lib/event-derivation'
import { ContestantSelectTile } from '@/components/shared/contestant-select-tile'
import type { FormContestant } from '@/components/shared/contestant-label'
import type { AllTribe } from '@/app/(dashboard)/events/submit/_lib/submit-context'

interface MergeFormProps {
  contestants: FormContestant[]
  allTribes: AllTribe[]
  week: string
  onSubmit: (data: TribeMergeData) => void
  onBack: () => void
}

export function MergeForm({ contestants, allTribes, week, onSubmit, onBack }: MergeFormProps) {
  const [mergeTribeId, setMergeTribeId] = useState('')
  const [juryStartsThisWeek, setJuryStartsThisWeek] = useState(false)
  const [deselected, setDeselected] = useState<Set<string>>(new Set())

  // Active (non-eliminated) contestants are selected by default
  const active = useMemo(
    () => contestants.filter((c) => !c.isEliminated),
    [contestants]
  )

  // Merge tribes (isMerge flag)
  const mergeTribes = useMemo(
    () => allTribes.filter((t) => t.isMerge),
    [allTribes]
  )

  const remainingContestants = useMemo(
    () => active.filter((c) => !deselected.has(c.id)).map((c) => c.id),
    [active, deselected]
  )

  const toggleContestant = (id: string) => {
    const next = new Set(deselected)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setDeselected(next)
  }

  const isValid = mergeTribeId && remainingContestants.length > 0

  const handleSubmit = () => {
    if (!isValid) return
    onSubmit({
      mergeTribeId,
      remainingContestants,
      mergeWeek: parseInt(week),
      juryStartsThisWeek,
    })
  }

  return (
    <div className="space-y-6">
      {/* Merge Tribe Selection */}
      <div className="space-y-2">
        <Label>Merge Tribe</Label>
        {mergeTribes.length > 0 ? (
          <Select value={mergeTribeId} onValueChange={setMergeTribeId}>
            <SelectTrigger>
              <SelectValue placeholder="Select merge tribe" />
            </SelectTrigger>
            <SelectContent>
              {mergeTribes.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  <span className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: t.color }}
                    />
                    {t.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-sm text-muted-foreground">
            No merge tribe found. Create a tribe with the &quot;Is Merge Tribe&quot; flag in admin settings first.
          </p>
        )}
      </div>

      {/* Jury Toggle */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <Label>Jury starts this week</Label>
          <p className="text-sm text-muted-foreground">
            First eliminated player after merge goes to jury
          </p>
        </div>
        <Switch
          checked={juryStartsThisWeek}
          onCheckedChange={setJuryStartsThisWeek}
        />
      </div>

      {/* Remaining Contestants */}
      <div className="space-y-2">
        <Label>
          Remaining Contestants ({remainingContestants.length})
        </Label>
        <p className="text-sm text-muted-foreground">
          All active contestants are selected. Deselect any who are not part of the merge.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {active.map((c) => (
            <ContestantSelectTile
              key={c.id}
              contestant={c}
              isSelected={!deselected.has(c.id)}
              onClick={() => toggleContestant(c.id)}
              variant="primary"
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!isValid}
          className="flex-1"
        >
          Submit Merge
        </Button>
      </div>
    </div>
  )
}
