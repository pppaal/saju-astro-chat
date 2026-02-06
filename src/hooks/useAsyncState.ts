/**
 * Async State Hook
 * Consolidates duplicate loading/error state patterns across 12+ files
 *
 * Common patterns consolidated:
 * - loading + error + data state management
 * - try-catch-finally patterns
 * - Retry logic
 * - Abort controller handling
 */

import { useState, useCallback, useRef, useEffect } from 'react'

// ============ Types ============

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error'

export interface AsyncState<T> {
  /** Current data */
  data: T | null
  /** Loading state */
  loading: boolean
  /** Error message */
  error: string | null
  /** Detailed status */
  status: AsyncStatus
}

export interface UseAsyncStateOptions<T> {
  /** Initial data value */
  initialData?: T | null
  /** Auto-reset error after delay (ms) */
  errorResetDelay?: number
  /** Enable retry on error */
  enableRetry?: boolean
  /** Max retry attempts */
  maxRetries?: number
  /** Retry delay (ms) */
  retryDelay?: number
}

export interface UseAsyncStateReturn<T> extends AsyncState<T> {
  /** Set data manually */
  setData: (data: T | null) => void
  /** Set error manually */
  setError: (error: string | null) => void
  /** Set loading manually */
  setLoading: (loading: boolean) => void
  /** Reset to initial state */
  reset: () => void
  /** Execute async function with automatic state management */
  execute: <R = T>(asyncFn: () => Promise<R>) => Promise<R | null>
  /** Current retry count */
  retryCount: number
  /** Whether operation can be retried */
  canRetry: boolean
  /** Retry the last operation */
  retry: () => Promise<T | null>
}

// ============ Main Hook ============

/**
 * Hook for managing async operation state
 *
 * @example
 * const { data, loading, error, execute } = useAsyncState<User[]>()
 *
 * const fetchUsers = async () => {
 *   const users = await execute(async () => {
 *     const res = await fetch('/api/users')
 *     return res.json()
 *   })
 * }
 */
export function useAsyncState<T>(
  options: UseAsyncStateOptions<T> = {}
): UseAsyncStateReturn<T> {
  const {
    initialData = null,
    errorResetDelay,
    enableRetry = false,
    maxRetries = 3,
    retryDelay = 1000,
  } = options

  const [state, setState] = useState<AsyncState<T>>({
    data: initialData,
    loading: false,
    error: null,
    status: 'idle',
  })

  const [retryCount, setRetryCount] = useState(0)
  const lastAsyncFnRef = useRef<(() => Promise<T>) | null>(null)
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Clean up error timeout
  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current)
      }
    }
  }, [])

  // Set data
  const setData = useCallback((data: T | null) => {
    setState((prev) => ({
      ...prev,
      data,
      status: data !== null ? 'success' : prev.status,
    }))
  }, [])

  // Set error
  const setError = useCallback(
    (error: string | null) => {
      setState((prev) => ({
        ...prev,
        error,
        status: error ? 'error' : prev.status,
      }))

      // Auto-reset error if configured
      if (error && errorResetDelay) {
        if (errorTimeoutRef.current) {
          clearTimeout(errorTimeoutRef.current)
        }
        errorTimeoutRef.current = setTimeout(() => {
          setState((prev) => ({ ...prev, error: null }))
        }, errorResetDelay)
      }
    },
    [errorResetDelay]
  )

  // Set loading
  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({
      ...prev,
      loading,
      status: loading ? 'loading' : prev.status,
    }))
  }, [])

  // Reset state
  const reset = useCallback(() => {
    setState({
      data: initialData,
      loading: false,
      error: null,
      status: 'idle',
    })
    setRetryCount(0)
    lastAsyncFnRef.current = null
  }, [initialData])

  // Execute async function
  const execute = useCallback(
    async <R = T>(asyncFn: () => Promise<R>): Promise<R | null> => {
      lastAsyncFnRef.current = asyncFn as () => Promise<T>

      setState((prev) => ({
        ...prev,
        loading: true,
        error: null,
        status: 'loading',
      }))

      try {
        const result = await asyncFn()

        setState({
          data: result as unknown as T,
          loading: false,
          error: null,
          status: 'success',
        })

        setRetryCount(0)
        return result
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred'

        setState((prev) => ({
          ...prev,
          loading: false,
          error: errorMessage,
          status: 'error',
        }))

        // Auto-reset error if configured
        if (errorResetDelay) {
          if (errorTimeoutRef.current) {
            clearTimeout(errorTimeoutRef.current)
          }
          errorTimeoutRef.current = setTimeout(() => {
            setState((prev) => ({ ...prev, error: null }))
          }, errorResetDelay)
        }

        return null
      }
    },
    [errorResetDelay]
  )

  // Retry last operation
  const retry = useCallback(async (): Promise<T | null> => {
    if (!lastAsyncFnRef.current || !enableRetry || retryCount >= maxRetries) {
      return null
    }

    setRetryCount((prev) => prev + 1)

    // Wait before retry
    if (retryDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay))
    }

    return execute(lastAsyncFnRef.current)
  }, [enableRetry, maxRetries, retryCount, retryDelay, execute])

  return {
    ...state,
    setData,
    setError,
    setLoading,
    reset,
    execute,
    retryCount,
    canRetry: enableRetry && retryCount < maxRetries && lastAsyncFnRef.current !== null,
    retry,
  }
}

// ============ Fetch Hook ============

export interface UseFetchOptions<T> extends UseAsyncStateOptions<T> {
  /** Fetch immediately on mount */
  immediate?: boolean
  /** Dependencies that trigger refetch */
  deps?: unknown[]
  /** Transform response data */
  transform?: (data: unknown) => T
  /** Request timeout (ms) */
  timeout?: number
}

/**
 * Hook for fetching data with state management
 *
 * @example
 * const { data, loading, error, refetch } = useFetch<User[]>(
 *   '/api/users',
 *   { immediate: true }
 * )
 */
export function useFetch<T>(
  url: string | (() => string),
  options: UseFetchOptions<T> & RequestInit = {}
): UseAsyncStateReturn<T> & { refetch: () => Promise<T | null> } {
  const {
    immediate = false,
    deps = [],
    transform,
    timeout = 30000,
    initialData,
    errorResetDelay,
    enableRetry,
    maxRetries,
    retryDelay,
    ...fetchOptions
  } = options

  const asyncState = useAsyncState<T>({
    initialData,
    errorResetDelay,
    enableRetry,
    maxRetries,
    retryDelay,
  })

  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async (): Promise<T | null> => {
    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    // Timeout handling
    const timeoutId = setTimeout(() => {
      abortControllerRef.current?.abort()
    }, timeout)

    try {
      const result = await asyncState.execute(async () => {
        const resolvedUrl = typeof url === 'function' ? url() : url
        const response = await fetch(resolvedUrl, {
          ...fetchOptions,
          signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        return transform ? transform(data) : (data as T)
      })

      clearTimeout(timeoutId)
      return result
    } catch (err) {
      clearTimeout(timeoutId)
      if ((err as Error).name === 'AbortError') {
        return null
      }
      throw err
    }
  }, [url, fetchOptions, timeout, transform, asyncState])

  // Fetch on mount if immediate
  useEffect(() => {
    if (immediate) {
      fetchData()
    }

    return () => {
      abortControllerRef.current?.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate, ...deps])

  return {
    ...asyncState,
    refetch: fetchData,
  }
}

// ============ Mutation Hook ============

export interface UseMutationOptions<T, V> {
  /** Success callback */
  onSuccess?: (data: T, variables: V) => void
  /** Error callback */
  onError?: (error: Error, variables: V) => void
  /** Settled callback (success or error) */
  onSettled?: (data: T | null, error: Error | null, variables: V) => void
}

/**
 * Hook for mutations (POST, PUT, DELETE)
 *
 * @example
 * const { mutate, loading } = useMutation(
 *   (user: CreateUserInput) => fetch('/api/users', {
 *     method: 'POST',
 *     body: JSON.stringify(user),
 *   }).then(r => r.json()),
 *   { onSuccess: () => refetchUsers() }
 * )
 */
export function useMutation<T, V = void>(
  mutationFn: (variables: V) => Promise<T>,
  options: UseMutationOptions<T, V> = {}
) {
  const { onSuccess, onError, onSettled } = options
  const asyncState = useAsyncState<T>()

  const mutate = useCallback(
    async (variables: V): Promise<T | null> => {
      const result = await asyncState.execute(async () => {
        try {
          const data = await mutationFn(variables)
          onSuccess?.(data, variables)
          onSettled?.(data, null, variables)
          return data
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err))
          onError?.(error, variables)
          onSettled?.(null, error, variables)
          throw error
        }
      })

      return result
    },
    [mutationFn, onSuccess, onError, onSettled, asyncState]
  )

  return {
    ...asyncState,
    mutate,
    mutateAsync: mutate,
  }
}
