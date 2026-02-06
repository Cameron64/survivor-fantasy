import { describe, it, expect, vi } from 'vitest'
import { cn, formatDate, formatRelativeTime, generateInviteCode, slugify } from '@/lib/utils'

describe('cn', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('should handle conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
  })

  it('should merge tailwind classes correctly', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })
})

describe('formatDate', () => {
  it('should format Date objects', () => {
    const date = new Date(2025, 5, 15) // June 15, 2025 in local time
    const result = formatDate(date)
    expect(result).toContain('Jun')
    expect(result).toContain('15')
    expect(result).toContain('2025')
  })

  it('should format date strings', () => {
    const result = formatDate('2025-12-25')
    expect(result).toContain('Dec')
    expect(result).toContain('25')
    expect(result).toContain('2025')
  })
})

describe('formatRelativeTime', () => {
  it('should return "just now" for recent times', () => {
    const now = new Date()
    expect(formatRelativeTime(now)).toBe('just now')
  })

  it('should return minutes for times within an hour', () => {
    const date = new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
    expect(formatRelativeTime(date)).toBe('5m ago')
  })

  it('should return hours for times within a day', () => {
    const date = new Date(Date.now() - 3 * 60 * 60 * 1000) // 3 hours ago
    expect(formatRelativeTime(date)).toBe('3h ago')
  })

  it('should return days for times within a week', () => {
    const date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
    expect(formatRelativeTime(date)).toBe('2d ago')
  })

  it('should return formatted date for older times', () => {
    const date = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) // 2 weeks ago
    const result = formatRelativeTime(date)
    expect(result).not.toContain('ago')
  })
})

describe('generateInviteCode', () => {
  it('should generate 8 character codes', () => {
    const code = generateInviteCode()
    expect(code).toHaveLength(8)
  })

  it('should only contain uppercase letters and numbers', () => {
    const code = generateInviteCode()
    expect(code).toMatch(/^[A-Z0-9]+$/)
  })

  it('should generate unique codes', () => {
    const codes = new Set()
    for (let i = 0; i < 100; i++) {
      codes.add(generateInviteCode())
    }
    // Should have at least 95 unique codes out of 100 (allowing for rare collisions)
    expect(codes.size).toBeGreaterThan(95)
  })
})

describe('slugify', () => {
  it('should convert to lowercase', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('should replace spaces with hyphens', () => {
    expect(slugify('foo bar baz')).toBe('foo-bar-baz')
  })

  it('should remove special characters', () => {
    expect(slugify('Hello! World?')).toBe('hello-world')
  })

  it('should collapse multiple hyphens', () => {
    expect(slugify('foo   bar')).toBe('foo-bar')
  })

  it('should trim whitespace', () => {
    expect(slugify('  hello  ')).toBe('hello')
  })
})
