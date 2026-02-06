/**
 * Storage State Hook
 * Consolidates duplicate localStorage/sessionStorage patterns across 4+ files
 *
 * Common patterns consolidated:
 * - Debounced storage writes
 * - JSON serialization/deserialization
 * - Storage quota error handling
 * - Cross-tab synchronization
 * - Cleanup on unmount
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { logger } from '@/lib/logger'

// ============ Types ============

export type StorageType = 'local' | 'session'

export interface UseStorageStateOptions<T> {
  /** Storage type (default: 'local') */
  storage?: StorageType
  /** Debounce delay in ms (default: 500) */
  debounceMs?: number
  /** Serialize function (default: JSON.stringify) */
  serialize?: (value: T) => string
  /** Deserialize function (default: JSON.parse) */
  deserialize?: (value: string) => T
  /** Validate function for deserialized data */
  validate?: (value: unknown) => value is T
  /** Sync across tabs (default: true for localStorage) */
  syncTabs?: boolean
  /** Log errors (default: true) */
  logErrors?: boolean
}

export interface UseStorageStateReturn<T> {
  /** Current value */
  value: T
  /** Set value (debounced write to storage) */
  setValue: (value: T | ((prev: T) => T)) => void
  /** Force immediate write to storage */
  flush: () => void
  /** Remove from storage */
  remove: () => void
  /** Whether there's a pending write */
  isPending: boolean
  /** Last error message */
  error: string | null
}

// ============ Storage Helper ============

function getStorage(type: StorageType): Storage | null {
  if (typeof window === 'undefined') return null

  try {
    return type === 'local' ? localStorage : sessionStorage
  } catch {
    return null
  }
}

// ============ Main Hook ============

/**
 * Hook for persisting state to storage with debouncing
 *
 * @example
 * // Basic usage
 * const { value, setValue } = useStorageState('user-preferences', {
 *   theme: 'dark',
 *   language: 'ko',
 * })
 *
 * // With options
 * const { value, setValue, remove } = useStorageState(
 *   'chat-messages',
 *   [],
 *   { debounceMs: 1000, storage: 'session' }
 * )
 */
export function useStorageState<T>(
  key: string,
  initialValue: T,
  options: UseStorageStateOptions<T> = {}
): UseStorageStateReturn<T> {
  const {
    storage = 'local',
    debounceMs = 500,
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    validate,
    syncTabs = storage === 'local',
    logErrors = true,
  } = options

  const [value, setValueState] = useState<T>(() => {
    const storageInstance = getStorage(storage)
    if (!storageInstance) return initialValue

    try {
      const stored = storageInstance.getItem(key)
      if (stored === null) return initialValue

      const parsed = deserialize(stored)
      if (validate && !validate(parsed)) {
        return initialValue
      }
      return parsed as T
    } catch (err) {
      if (logErrors) {
        logger.warn(`[useStorageState] Failed to read "${key}":`, err)
      }
      return initialValue
    }
  })

  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pendingValueRef = useRef<T | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Write to storage
  const writeToStorage = useCallback(
    (valueToWrite: T) => {
      const storageInstance = getStorage(storage)
      if (!storageInstance) return

      try {
        const serialized = serialize(valueToWrite)
        storageInstance.setItem(key, serialized)
        setError(null)
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to write to storage'
        setError(message)
        if (logErrors) {
          logger.error(`[useStorageState] Failed to write "${key}":`, err)
        }
      }
    },
    [key, storage, serialize, logErrors]
  )

  // Flush pending write immediately
  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    if (pendingValueRef.current !== null) {
      writeToStorage(pendingValueRef.current)
      pendingValueRef.current = null
      setIsPending(false)
    }
  }, [writeToStorage])

  // Set value with debounced write
  const setValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      setValueState((prev) => {
        const resolvedValue =
          typeof newValue === 'function'
            ? (newValue as (prev: T) => T)(prev)
            : newValue

        // Store pending value
        pendingValueRef.current = resolvedValue
        setIsPending(true)

        // Clear existing timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }

        // Schedule debounced write
        if (debounceMs > 0) {
          timeoutRef.current = setTimeout(() => {
            writeToStorage(resolvedValue)
            pendingValueRef.current = null
            setIsPending(false)
            timeoutRef.current = null
          }, debounceMs)
        } else {
          // Immediate write if no debounce
          writeToStorage(resolvedValue)
          pendingValueRef.current = null
          setIsPending(false)
        }

        return resolvedValue
      })
    },
    [debounceMs, writeToStorage]
  )

  // Remove from storage
  const remove = useCallback(() => {
    const storageInstance = getStorage(storage)
    if (!storageInstance) return

    try {
      storageInstance.removeItem(key)
      setValueState(initialValue)
      pendingValueRef.current = null
      setIsPending(false)
      setError(null)
    } catch (err) {
      if (logErrors) {
        logger.error(`[useStorageState] Failed to remove "${key}":`, err)
      }
    }
  }, [key, storage, initialValue, logErrors])

  // Cross-tab synchronization
  useEffect(() => {
    if (!syncTabs || storage !== 'local') return

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== key || event.storageArea !== localStorage) return

      if (event.newValue === null) {
        setValueState(initialValue)
        return
      }

      try {
        const parsed = deserialize(event.newValue)
        if (validate && !validate(parsed)) return
        setValueState(parsed as T)
      } catch (err) {
        if (logErrors) {
          logger.warn(`[useStorageState] Failed to sync "${key}":`, err)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [key, storage, syncTabs, initialValue, deserialize, validate, logErrors])

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      // Write any pending value
      if (pendingValueRef.current !== null) {
        writeToStorage(pendingValueRef.current)
      }
    }
  }, [writeToStorage])

  // Flush on beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (pendingValueRef.current !== null) {
        // Use sendBeacon for reliable delivery
        const storageInstance = getStorage(storage)
        if (storageInstance) {
          try {
            const serialized = serialize(pendingValueRef.current)
            storageInstance.setItem(key, serialized)
          } catch {
            // Silent fail on unload
          }
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [key, storage, serialize])

  return {
    value,
    setValue,
    flush,
    remove,
    isPending,
    error,
  }
}

// ============ Session Storage Hook ============

/**
 * Convenience hook for session storage
 */
export function useSessionState<T>(
  key: string,
  initialValue: T,
  options: Omit<UseStorageStateOptions<T>, 'storage'> = {}
): UseStorageStateReturn<T> {
  return useStorageState(key, initialValue, { ...options, storage: 'session' })
}

// ============ Local Storage Hook ============

/**
 * Convenience hook for local storage
 */
export function useLocalState<T>(
  key: string,
  initialValue: T,
  options: Omit<UseStorageStateOptions<T>, 'storage'> = {}
): UseStorageStateReturn<T> {
  return useStorageState(key, initialValue, { ...options, storage: 'local' })
}

// ============ Chat Messages Storage Hook ============

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  id?: string
  timestamp?: number
}

/**
 * Specialized hook for chat message persistence
 */
export function useChatStorage(sessionKey: string) {
  const { value: messages, setValue: setMessages, flush, remove } = useStorageState<ChatMessage[]>(
    `chat:${sessionKey}:messages`,
    [],
    {
      storage: 'session',
      debounceMs: 1000,
      validate: (val): val is ChatMessage[] =>
        Array.isArray(val) &&
        val.every(
          (m) =>
            typeof m === 'object' &&
            m !== null &&
            'role' in m &&
            'content' in m
        ),
    }
  )

  const addMessage = useCallback(
    (message: ChatMessage) => {
      setMessages((prev) => [...prev, { ...message, timestamp: Date.now() }])
    },
    [setMessages]
  )

  const updateLastMessage = useCallback(
    (content: string) => {
      setMessages((prev) => {
        if (prev.length === 0) return prev
        const updated = [...prev]
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content,
        }
        return updated
      })
    },
    [setMessages]
  )

  const clearMessages = useCallback(() => {
    remove()
  }, [remove])

  return {
    messages,
    setMessages,
    addMessage,
    updateLastMessage,
    clearMessages,
    flush,
  }
}
