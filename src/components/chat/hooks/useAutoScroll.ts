/**
 * useAutoScroll Hook
 *
 * Automatically scrolls to bottom when new messages arrive
 * Shared across SajuChat, AstrologyChat, and Destiny Chat
 */

import { useEffect, useRef } from 'react'

interface UseAutoScrollOptions {
  /** Dependency that triggers scroll (e.g., messages array) */
  dependency: unknown
  /** Whether auto-scroll is enabled */
  enabled?: boolean
}

export function useAutoScroll({ dependency, enabled = true }: UseAutoScrollOptions) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (enabled && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [dependency, enabled])

  return { scrollRef }
}
