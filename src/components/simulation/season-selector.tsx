'use client'

import { useEffect, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface SeasonSelectorProps {
  value: string
  onChange: (value: string) => void
  allowAll?: boolean
  disabled?: boolean
}

export function SeasonSelector({ value, onChange, allowAll, disabled }: SeasonSelectorProps) {
  const [seasons, setSeasons] = useState<number[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/simulation/seasons')
      .then((res) => res.json())
      .then((data) => {
        setSeasons(data.seasons ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-2">
      <Label>Season</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled || loading}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder={loading ? 'Loading...' : 'Select season'} />
        </SelectTrigger>
        <SelectContent>
          {allowAll && <SelectItem value="all">All Seasons</SelectItem>}
          {seasons.map((s) => (
            <SelectItem key={s} value={String(s)}>
              Season {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
