import type { PointOverrides, SimEventType } from '../engine/types'

// --- Argument Parsing ---

export function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const next = argv[i + 1]
      if (next && !next.startsWith('--')) {
        args[key] = next
        i++
      } else {
        args[key] = 'true'
      }
    }
  }
  return args
}

export function getArg(args: Record<string, string>, key: string, defaultValue?: string): string {
  return args[key] ?? defaultValue ?? ''
}

export function getNumArg(args: Record<string, string>, key: string, defaultValue: number): number {
  const val = args[key]
  if (!val) return defaultValue
  const num = parseInt(val, 10)
  if (isNaN(num)) {
    console.error(`Invalid number for --${key}: ${val}`)
    process.exit(1)
  }
  return num
}

/**
 * Parse override string like "WINNER:30,FINALIST:15" into PointOverrides
 */
export function parseOverrides(str: string): PointOverrides {
  if (!str) return {}
  const overrides: PointOverrides = {}
  for (const part of str.split(',')) {
    const [type, val] = part.split(':')
    if (type && val) {
      overrides[type.trim() as SimEventType] = parseInt(val.trim(), 10)
    }
  }
  return overrides
}

/**
 * Parse manual picks string like "0:US0701,US0705;1:US0703"
 */
export function parseManualPicks(str: string): Record<number, string[]> {
  if (!str) return {}
  const picks: Record<number, string[]> = {}
  for (const part of str.split(';')) {
    const [idx, ids] = part.split(':')
    if (idx && ids) {
      picks[parseInt(idx.trim(), 10)] = ids.split(',').map((s) => s.trim())
    }
  }
  return picks
}

// --- Table Formatting ---

export function padRight(str: string, len: number): string {
  return str.length >= len ? str.slice(0, len) : str + ' '.repeat(len - str.length)
}

export function padLeft(str: string, len: number): string {
  return str.length >= len ? str.slice(0, len) : ' '.repeat(len - str.length) + str
}

export function colorPoints(points: number): string {
  if (points > 0) return `+${points}`
  if (points < 0) return `${points}`
  return '0'
}

export interface TableColumn {
  header: string
  width: number
  align?: 'left' | 'right'
}

export function formatTable(columns: TableColumn[], rows: string[][]): string {
  const lines: string[] = []
  const separator = '+' + columns.map((c) => '-'.repeat(c.width + 2)).join('+') + '+'

  // Header
  lines.push(separator)
  lines.push(
    '|' +
      columns.map((c) => ' ' + padRight(c.header, c.width) + ' ').join('|') +
      '|'
  )
  lines.push(separator)

  // Rows
  for (const row of rows) {
    lines.push(
      '|' +
        columns
          .map((c, i) => {
            const val = row[i] || ''
            const padded = c.align === 'right' ? padLeft(val, c.width) : padRight(val, c.width)
            return ' ' + padded + ' '
          })
          .join('|') +
        '|'
    )
  }
  lines.push(separator)

  return lines.join('\n')
}

// --- JSON Output ---

export function isJsonMode(args: Record<string, string>): boolean {
  return args.json === 'true'
}

export function outputResult(args: Record<string, string>, data: unknown, textFn: () => void): void {
  if (isJsonMode(args)) {
    console.log(JSON.stringify(data, null, 2))
  } else {
    textFn()
  }
}
