/**
 * Feature flag utilities for experimental features
 *
 * Server-side flags stored in the League model that you control globally.
 * Client-side components use React context to access these flags.
 */

export interface FeatureFlags {
  enableTribeSwap: boolean
  enableSwapMode: boolean
  enableDissolutionMode: boolean
  enableExpansionMode: boolean
  enableTribeMerge: boolean
}

// Default flags (all disabled)
export const DEFAULT_FLAGS: FeatureFlags = {
  enableTribeSwap: false,
  enableSwapMode: false,
  enableDissolutionMode: false,
  enableExpansionMode: false,
  enableTribeMerge: false,
}

/**
 * Helper to check individual flags from the flags object
 */
export function isTribeSwapEnabled(flags: FeatureFlags): boolean {
  return flags.enableTribeSwap
}

export function isSwapModeEnabled(flags: FeatureFlags): boolean {
  return flags.enableTribeSwap && flags.enableSwapMode
}

export function isDissolutionModeEnabled(flags: FeatureFlags): boolean {
  return flags.enableTribeSwap && flags.enableDissolutionMode
}

export function isExpansionModeEnabled(flags: FeatureFlags): boolean {
  return flags.enableTribeSwap && flags.enableExpansionMode
}

export function isTribeMergeEnabled(flags: FeatureFlags): boolean {
  return flags.enableTribeMerge
}

/**
 * Get available swap modes based on enabled feature flags
 */
export function getAvailableSwapModes(flags: FeatureFlags): Array<'SWAP' | 'DISSOLUTION' | 'EXPANSION'> {
  const modes: Array<'SWAP' | 'DISSOLUTION' | 'EXPANSION'> = []

  if (isSwapModeEnabled(flags)) modes.push('SWAP')
  if (isDissolutionModeEnabled(flags)) modes.push('DISSOLUTION')
  if (isExpansionModeEnabled(flags)) modes.push('EXPANSION')

  return modes
}
