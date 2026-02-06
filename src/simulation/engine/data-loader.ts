import * as fs from 'fs'
import * as path from 'path'
import type { SimSeason } from './types'
import { SIM_DEFAULTS } from '../config/defaults'

const cache = new Map<number, SimSeason>()

function resolveDataDir(): string {
  return path.resolve(process.cwd(), SIM_DEFAULTS.dataDir)
}

export function loadSeason(seasonNumber: number): SimSeason {
  if (cache.has(seasonNumber)) return cache.get(seasonNumber)!

  const filePath = path.join(resolveDataDir(), `season-${seasonNumber}.json`)
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Season ${seasonNumber} not found at ${filePath}. Run "pnpm sim:import" first.`
    )
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as SimSeason
  cache.set(seasonNumber, data)
  return data
}

export function loadAllSeasons(): SimSeason[] {
  const dir = resolveDataDir()
  if (!fs.existsSync(dir)) {
    throw new Error(`Data directory not found: ${dir}. Run "pnpm sim:import" first.`)
  }

  const files = fs.readdirSync(dir).filter((f) => f.startsWith('season-') && f.endsWith('.json'))
  if (files.length === 0) {
    throw new Error(`No season files found in ${dir}. Run "pnpm sim:import" first.`)
  }

  return files
    .map((f) => {
      const num = parseInt(f.replace('season-', '').replace('.json', ''), 10)
      return loadSeason(num)
    })
    .sort((a, b) => a.season - b.season)
}

export function getAvailableSeasons(): number[] {
  const dir = resolveDataDir()
  if (!fs.existsSync(dir)) return []

  return fs
    .readdirSync(dir)
    .filter((f) => f.startsWith('season-') && f.endsWith('.json'))
    .map((f) => parseInt(f.replace('season-', '').replace('.json', ''), 10))
    .sort((a, b) => a - b)
}

export function clearCache(): void {
  cache.clear()
}
