'use client'

import React, { createContext, useContext } from 'react'
import type { League } from '@prisma/client'
import type { LeagueRole } from '@prisma/client'

interface LeagueContextValue {
  league: League
  role: LeagueRole
  userId: string
}

const LeagueContext = createContext<LeagueContextValue | null>(null)

export function LeagueProvider({
  league,
  role,
  userId,
  children,
}: {
  league: League
  role: LeagueRole
  userId: string
  children: React.ReactNode
}) {
  return (
    <LeagueContext.Provider value={{ league, role, userId }}>
      {children}
    </LeagueContext.Provider>
  )
}

export function useLeague(): LeagueContextValue {
  const ctx = useContext(LeagueContext)
  if (!ctx) {
    throw new Error('useLeague must be used within a LeagueProvider')
  }
  return ctx
}
