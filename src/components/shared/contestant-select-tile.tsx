'use client'

import { Check, X } from 'lucide-react'
import { cn, getContestantDisplayName } from '@/lib/utils'
import type { FormContestant } from './contestant-label'

type SelectVariant = 'primary' | 'destructive' | 'success' | 'warning'

const VARIANT_STYLES: Record<SelectVariant, { border: string; bg: string; badge: string }> = {
  primary: {
    border: 'border-primary',
    bg: 'bg-primary/5',
    badge: 'bg-primary text-primary-foreground',
  },
  destructive: {
    border: 'border-red-500',
    bg: 'bg-red-50 dark:bg-red-950/20',
    badge: 'bg-red-500 text-white',
  },
  success: {
    border: 'border-green-500',
    bg: 'bg-green-50 dark:bg-green-950/20',
    badge: 'bg-green-500 text-white',
  },
  warning: {
    border: 'border-yellow-500',
    bg: 'bg-yellow-50 dark:bg-yellow-950/20',
    badge: 'bg-yellow-500 text-white',
  },
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

interface ContestantSelectTileProps {
  contestant: FormContestant
  isSelected: boolean
  onClick: () => void
  variant?: SelectVariant
  disabled?: boolean
  /** Extra info shown below the name (e.g. vote count) */
  detail?: string
  'data-testid'?: string
}

export function ContestantSelectTile({
  contestant,
  isSelected,
  onClick,
  variant = 'primary',
  disabled = false,
  detail,
  'data-testid': testId,
}: ContestantSelectTileProps) {
  const displayName = getContestantDisplayName(contestant)
  const style = VARIANT_STYLES[variant]
  const CheckIcon = variant === 'destructive' ? X : Check

  return (
    <button
      type="button"
      data-testid={testId}
      aria-selected={isSelected}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative overflow-hidden rounded-lg border text-left transition-all',
        isSelected
          ? `${style.border} ${style.bg}`
          : 'border-muted hover:border-muted-foreground',
        disabled && !isSelected && 'opacity-40 cursor-not-allowed',
      )}
    >
      <div className="flex h-full min-h-[4.5rem]">
        {/* Photo slice */}
        <div
          className="relative w-16 sm:w-[4.5rem] shrink-0 bg-muted"
          style={contestant.tribeColor ? { borderBottom: `3px solid ${contestant.tribeColor}` } : undefined}
        >
          {contestant.imageUrl ? (
            <img
              src={contestant.imageUrl}
              alt={displayName}
              className="absolute inset-0 w-full h-full object-cover object-top"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground font-medium text-sm">
              {getInitials(contestant.name)}
            </div>
          )}

          {/* Selection badge overlay */}
          {isSelected && (
            <div
              className={cn(
                'absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-sm',
                style.badge,
              )}
            >
              <CheckIcon className="h-3 w-3" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 p-2.5 flex flex-col justify-center">
          <p className="font-medium text-sm truncate">{displayName}</p>
          {detail && (
            <p className="text-[11px] text-muted-foreground mt-0.5">{detail}</p>
          )}
        </div>
      </div>
    </button>
  )
}
