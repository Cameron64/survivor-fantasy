'use client'

import { usePWAUpdate } from '@/hooks/use-pwa-update'
import { Button } from '@/components/ui/button'
import { RefreshCw, X } from 'lucide-react'

export function PWAUpdateNotification() {
  const { showReload, reloadPage, dismissReload } = usePWAUpdate()

  if (!showReload) {
    return null
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 lg:bottom-4 lg:left-auto lg:right-4 lg:w-96 z-50">
      <div className="flex items-center gap-3 rounded-lg border bg-background p-4 shadow-lg">
        <RefreshCw className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium">Update available</p>
          <p className="text-xs text-muted-foreground">
            A new version is ready to install
          </p>
        </div>
        <Button size="sm" onClick={reloadPage}>
          Update
        </Button>
        <Button size="sm" variant="ghost" onClick={dismissReload}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
