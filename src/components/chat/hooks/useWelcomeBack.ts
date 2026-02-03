/**
 * useWelcomeBack Hook
 *
 * Manages welcome back banner display when user returns
 * Shared across SajuChat, AstrologyChat, and Destiny Chat
 */

import { useState, useEffect } from 'react'

interface UseWelcomeBackOptions {
  /** Whether user is a returning visitor (sessionCount > 1) */
  shouldShow: boolean
  /** Duration to show banner in milliseconds */
  displayDuration?: number
}

export function useWelcomeBack({ shouldShow, displayDuration = 5000 }: UseWelcomeBackOptions) {
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    if (shouldShow) {
      setShowWelcome(true)
      const timer = setTimeout(() => {
        setShowWelcome(false)
      }, displayDuration)
      return () => clearTimeout(timer)
    }
  }, [shouldShow, displayDuration])

  return { showWelcome }
}
