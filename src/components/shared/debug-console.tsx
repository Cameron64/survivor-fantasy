'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Minimize2, Maximize2, Terminal, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface ConsoleEntry {
  id: number
  type: 'log' | 'warn' | 'error' | 'info'
  message: string
  timestamp: Date
  count: number
}

export function DebugConsole() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [position, setPosition] = useState({ x: 20, y: 80 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [entries, setEntries] = useState<ConsoleEntry[]>([])
  const [nextId, setNextId] = useState(0)
  const consoleRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Intercept console methods
  useEffect(() => {
    const originalLog = console.log
    const originalWarn = console.warn
    const originalError = console.error
    const originalInfo = console.info

    const addEntry = (type: ConsoleEntry['type'], args: any[]) => {
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ')

      setEntries(prev => {
        // Check if last entry is the same message (for grouping)
        const lastEntry = prev[prev.length - 1]
        if (lastEntry && lastEntry.message === message && lastEntry.type === type) {
          return prev.map((entry, i) =>
            i === prev.length - 1
              ? { ...entry, count: entry.count + 1, timestamp: new Date() }
              : entry
          )
        }

        const newEntry: ConsoleEntry = {
          id: nextId,
          type,
          message,
          timestamp: new Date(),
          count: 1
        }
        setNextId(n => n + 1)

        // Keep last 100 entries
        const updated = [...prev, newEntry].slice(-100)
        return updated
      })
    }

    console.log = (...args) => {
      originalLog.apply(console, args)
      addEntry('log', args)
    }

    console.warn = (...args) => {
      originalWarn.apply(console, args)
      addEntry('warn', args)
    }

    console.error = (...args) => {
      originalError.apply(console, args)
      addEntry('error', args)
    }

    console.info = (...args) => {
      originalInfo.apply(console, args)
      addEntry('info', args)
    }

    // Intercept unhandled errors
    const handleError = (event: ErrorEvent) => {
      addEntry('error', [`${event.message} at ${event.filename}:${event.lineno}:${event.colno}`])
    }

    const handleRejection = (event: PromiseRejectionEvent) => {
      addEntry('error', [`Unhandled Promise Rejection: ${event.reason}`])
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleRejection)

    return () => {
      console.log = originalLog
      console.warn = originalWarn
      console.error = originalError
      console.info = originalInfo
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleRejection)
    }
  }, [nextId])

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (scrollRef.current && !isMinimized) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [entries, isMinimized])

  // Handle dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    setIsDragging(true)
    const rect = consoleRef.current?.getBoundingClientRect()
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    const touch = e.touches[0]
    setIsDragging(true)
    const rect = consoleRef.current?.getBoundingClientRect()
    if (rect) {
      setDragOffset({
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      })
    }
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMove = (clientX: number, clientY: number) => {
      setPosition({
        x: clientX - dragOffset.x,
        y: clientY - dragOffset.y
      })
    }

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault()
      handleMove(e.clientX, e.clientY)
    }

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      const touch = e.touches[0]
      handleMove(touch.clientX, touch.clientY)
    }

    const handleEnd = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleEnd)
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleEnd)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleEnd)
    }
  }, [isDragging, dragOffset])

  const clearEntries = () => {
    setEntries([])
  }

  const getTypeColor = (type: ConsoleEntry['type']) => {
    switch (type) {
      case 'error': return 'text-red-600 dark:text-red-400'
      case 'warn': return 'text-yellow-600 dark:text-yellow-400'
      case 'info': return 'text-blue-600 dark:text-blue-400'
      default: return 'text-gray-600 dark:text-gray-400'
    }
  }

  const getTypeIcon = (type: ConsoleEntry['type']) => {
    switch (type) {
      case 'error': return '❌'
      case 'warn': return '⚠️'
      case 'info': return 'ℹ️'
      default: return '📝'
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-[9999] p-3 bg-gray-900 text-white rounded-full shadow-lg hover:bg-gray-800 transition-colors"
        title="Open Debug Console"
      >
        <Terminal className="h-5 w-5" />
      </button>
    )
  }

  return (
    <div
      ref={consoleRef}
      className={cn(
        'fixed z-[9999] bg-black border-2 border-green-500 rounded-lg shadow-2xl overflow-hidden',
        'font-mono text-xs',
        isDragging && 'cursor-move',
        isMinimized ? 'w-64' : 'w-[90vw] max-w-2xl'
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        maxHeight: isMinimized ? 'auto' : '60vh'
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* Header */}
      <div className="flex items-center justify-between bg-green-600 text-black px-3 py-2 cursor-move select-none">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4" />
          <span className="font-bold">Debug Console</span>
          {entries.length > 0 && (
            <span className="bg-green-800 text-white px-2 py-0.5 rounded text-[10px]">
              {entries.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-green-700"
            onClick={(e) => {
              e.stopPropagation()
              clearEntries()
            }}
            title="Clear console"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-green-700"
            onClick={(e) => {
              e.stopPropagation()
              setIsMinimized(!isMinimized)
            }}
            title={isMinimized ? 'Maximize' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-green-700"
            onClick={(e) => {
              e.stopPropagation()
              setIsOpen(false)
            }}
            title="Close"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Console Content */}
      {!isMinimized && (
        <div
          ref={scrollRef}
          className="overflow-y-auto bg-black text-green-400 p-3 space-y-1"
          style={{ maxHeight: '50vh' }}
        >
          {entries.length === 0 ? (
            <div className="text-gray-600 italic">Console is empty. Waiting for logs...</div>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className={cn('flex gap-2 items-start border-b border-gray-800 pb-1', getTypeColor(entry.type))}
              >
                <span className="shrink-0">{getTypeIcon(entry.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-[11px] break-all whitespace-pre-wrap">
                    {entry.message}
                  </div>
                  <div className="text-[9px] text-gray-600 mt-0.5 flex items-center gap-2">
                    <span>{entry.timestamp.toLocaleTimeString()}</span>
                    {entry.count > 1 && (
                      <span className="bg-gray-800 px-1 rounded">×{entry.count}</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
