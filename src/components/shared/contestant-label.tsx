'use client'

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { getContestantDisplayName } from '@/lib/utils'

/** Shared contestant shape used across all event forms */
export interface FormContestant {
  id: string
  name: string
  nickname?: string | null
  imageUrl?: string | null
  tribeColor?: string | null
  tribe: string | null
  isEliminated: boolean
}

/** @deprecated Use getContestantDisplayName from @/lib/utils directly */
export const getDisplayName = getContestantDisplayName

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Inline contestant display: small avatar with tribe-colored ring + display name.
 * Use inside selection buttons, list items, etc.
 */
export function ContestantLabel({ contestant }: { contestant: FormContestant }) {
  const displayName = getDisplayName(contestant)

  return (
    <span className="flex items-center gap-2 min-w-0">
      <Avatar className="h-6 w-6 shrink-0"
        style={contestant.tribeColor ? {
          boxShadow: `0 0 0 2px ${contestant.tribeColor}`,
        } : undefined}
      >
        {contestant.imageUrl && (
          <AvatarImage src={contestant.imageUrl} alt={displayName} />
        )}
        <AvatarFallback className="text-[10px]">
          {getInitials(contestant.name)}
        </AvatarFallback>
      </Avatar>
      <span className="text-sm font-medium truncate">{displayName}</span>
    </span>
  )
}
