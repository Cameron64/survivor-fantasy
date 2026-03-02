'use client'

import { useEffect } from 'react'

export function AdminDebugWrapperClient() {
  useEffect(() => {
    // Dynamically import eruda (client-side only)
    import('eruda').then((eruda) => {
      eruda.default.init({
        // Eruda config
        tool: ['console', 'network', 'elements', 'resources'],
        useShadowDom: true,
        autoScale: true,
        defaults: {
          displaySize: 50,
          transparency: 0.9,
          theme: 'Dark'
        }
      })
    })

    // Cleanup on unmount
    return () => {
      import('eruda').then((eruda) => {
        eruda.default.destroy()
      })
    }
  }, [])

  return null
}
