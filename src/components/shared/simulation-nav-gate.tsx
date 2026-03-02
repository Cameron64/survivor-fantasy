'use client'

import { useState, useEffect } from 'react'

export function SimulationNavGate({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    setShow(localStorage.getItem('showSimulation') === 'true')

    const handler = (e: StorageEvent) => {
      if (e.key === 'showSimulation') {
        setShow(e.newValue === 'true')
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  if (!show) return null
  return <>{children}</>
}
