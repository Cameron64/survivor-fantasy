'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { FeatureFlags } from './feature-flags'
import { DEFAULT_FLAGS } from './feature-flags'

const FeatureFlagsContext = createContext<FeatureFlags>(DEFAULT_FLAGS)

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FLAGS)

  useEffect(() => {
    // Fetch feature flags from the server
    fetch('/api/feature-flags')
      .then((res) => res.json())
      .then((data) => setFlags(data))
      .catch((error) => {
        console.error('Failed to fetch feature flags:', error)
      })
  }, [])

  return (
    <FeatureFlagsContext.Provider value={flags}>
      {children}
    </FeatureFlagsContext.Provider>
  )
}

export function useFeatureFlags(): FeatureFlags {
  return useContext(FeatureFlagsContext)
}
