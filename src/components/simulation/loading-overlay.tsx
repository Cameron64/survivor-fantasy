'use client'

import { Loader2 } from 'lucide-react'

interface LoadingOverlayProps {
  isLoading: boolean
  message?: string
}

export function LoadingOverlay({ isLoading, message }: LoadingOverlayProps) {
  if (!isLoading) return null

  return (
    <div className="flex items-center gap-3 p-4 rounded-lg bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800">
      <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
      <span className="text-sm text-teal-700 dark:text-teal-300">
        {message ?? 'Running simulation...'}
      </span>
    </div>
  )
}
