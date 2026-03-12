'use client'

import { useEffect, useState, useCallback } from 'react'

export function usePWAUpdate() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)
  const [showReload, setShowReload] = useState(false)

  const reloadPage = useCallback(() => {
    waitingWorker?.postMessage({ type: 'SKIP_WAITING' })
    setShowReload(false)
    window.location.reload()
  }, [waitingWorker])

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    const handleStateChange = (registration: ServiceWorkerRegistration) => {
      if (registration.waiting) {
        setWaitingWorker(registration.waiting)
        setShowReload(true)
      }
    }

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.ready

        // Check if there's already a waiting worker
        if (registration.waiting) {
          setWaitingWorker(registration.waiting)
          setShowReload(true)
        }

        // Listen for new service worker installing
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                handleStateChange(registration)
              }
            })
          }
        })
      } catch (error) {
        console.error('Service worker registration failed:', error)
      }
    }

    // Listen for controller change — show update prompt instead of auto-reloading
    // Auto-reload was killing in-flight fetch requests (e.g. feature flag toggles)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      setShowReload(true)
    })

    registerServiceWorker()
  }, [showReload])

  return {
    showReload,
    reloadPage,
    dismissReload: () => setShowReload(false),
  }
}
