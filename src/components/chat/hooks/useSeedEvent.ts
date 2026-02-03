/**
 * useSeedEvent Hook
 *
 * Listens for window seed events to inject questions into chat
 * Shared across SajuChat, AstrologyChat, and Destiny Chat
 */

import { useEffect, useRef } from 'react'

interface UseSeedEventOptions {
  /** Event name to listen for (e.g., "saju-chat:seed") */
  eventName: string
  /** Callback when seed event is received */
  onSeed: (seedText: string) => void
  /** Whether to enable seed event listening */
  enabled?: boolean
}

export function useSeedEvent({ eventName, onSeed, enabled = true }: UseSeedEventOptions) {
  const seedSentRef = useRef(false)

  useEffect(() => {
    if (!enabled) return

    const handleSeedEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ text: string }>
      if (customEvent.detail?.text && !seedSentRef.current) {
        seedSentRef.current = true
        onSeed(customEvent.detail.text)
      }
    }

    window.addEventListener(eventName, handleSeedEvent)

    return () => {
      window.removeEventListener(eventName, handleSeedEvent)
      seedSentRef.current = false
    }
  }, [eventName, onSeed, enabled])

  return { seedSentRef }
}
