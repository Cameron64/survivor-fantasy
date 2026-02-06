'use client'

import { useEffect, useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface MultiSeasonSelectorProps {
  value: string[]
  onChange: (value: string[]) => void
  disabled?: boolean
}

export function MultiSeasonSelector({ value, onChange, disabled }: MultiSeasonSelectorProps) {
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

  const allSelected = seasons.length > 0 && value.length === seasons.length

  function toggleAll() {
    if (allSelected) {
      onChange([])
    } else {
      onChange(seasons.map(String))
    }
  }

  function toggleSeason(s: number) {
    const str = String(s)
    if (value.includes(str)) {
      onChange(value.filter((v) => v !== str))
    } else {
      onChange([...value, str])
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Seasons</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading seasons...</p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Checkbox
                id="all-seasons"
                checked={allSelected}
                onCheckedChange={toggleAll}
                disabled={disabled}
              />
              <Label htmlFor="all-seasons" className="text-sm font-medium cursor-pointer">
                All Seasons ({seasons.length})
              </Label>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1.5 border-t pt-2">
              {seasons.map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <Checkbox
                    id={`season-${s}`}
                    checked={value.includes(String(s))}
                    onCheckedChange={() => toggleSeason(s)}
                    disabled={disabled}
                  />
                  <Label htmlFor={`season-${s}`} className="text-sm cursor-pointer">
                    Season {s}
                  </Label>
                </div>
              ))}
            </div>
            {value.length > 0 && (
              <p className="text-xs text-muted-foreground pt-1">
                {value.length} season{value.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
