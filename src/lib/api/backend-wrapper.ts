/**
 * Backend API Call Wrapper
 * Consolidates duplicate backend API call patterns across 50+ routes
 */

import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { captureServerError } from '@/lib/telemetry'
import { HTTP_STATUS, errorResponse } from './validation-wrapper'

export interface BackendCallOptions {
  timeout?: number
  route?: string
  fallbackEnabled?: boolean
}

export interface BackendResponse<T = unknown> {
  ok: boolean
  status: number
  data?: T
  error?: string
}

export interface BackendCallResult<T> {
  success: true
  data: T
}

export interface BackendCallFailure {
  success: false
  response: NextResponse
  fallbackUsed: boolean
}

const DEFAULT_TIMEOUT = 30000

/**
 * Makes a backend API call with consistent error handling, logging, and optional fallback
 * Replaces 20-50 lines of duplicated API call code per route
 */
export async function callBackendWithFallback<T, P = unknown>(
  apiClient: { post: (endpoint: string, payload: P, options?: { timeout?: number }) => Promise<BackendResponse<T>> },
  endpoint: string,
  payload: P,
  fallbackFn?: () => T | Promise<T>,
  options: BackendCallOptions = {}
): Promise<BackendCallResult<T> | BackendCallFailure> {
  const { timeout = DEFAULT_TIMEOUT, route = 'API', fallbackEnabled = true } = options

  try {
    const response = await apiClient.post(endpoint, payload, { timeout })

    if (!response.ok) {
      logger.error(`[${route}] Backend error`, {
        endpoint,
        status: response.status,
        error: response.error,
      })

      // Try fallback if available
      if (fallbackEnabled && fallbackFn) {
        try {
          const fallbackData = await fallbackFn()
          logger.info(`[${route}] Using fallback response`)
          return {
            success: true,
            data: fallbackData,
          }
        } catch (fallbackError) {
          logger.error(`[${route}] Fallback also failed`, { error: fallbackError })
        }
      }

      return {
        success: false,
        response: errorResponse('Backend service unavailable', HTTP_STATUS.SERVICE_UNAVAILABLE),
        fallbackUsed: false,
      }
    }

    return {
      success: true,
      data: response.data as T,
    }
  } catch (error) {
    logger.error(`[${route}] Backend call exception`, { endpoint, error })
    captureServerError(error instanceof Error ? error : new Error(String(error)), {
      route,
      endpoint,
    })

    // Try fallback on exception
    if (fallbackEnabled && fallbackFn) {
      try {
        const fallbackData = await fallbackFn()
        logger.info(`[${route}] Using fallback after exception`)
        return {
          success: true,
          data: fallbackData,
        }
      } catch (fallbackError) {
        logger.error(`[${route}] Fallback also failed after exception`, { error: fallbackError })
      }
    }

    return {
      success: false,
      response: errorResponse('Internal server error', HTTP_STATUS.INTERNAL_SERVER_ERROR),
      fallbackUsed: false,
    }
  }
}

/**
 * Simple GET wrapper for backend calls
 */
export async function callBackendGet<T>(
  apiClient: { get: (endpoint: string, options?: { timeout?: number }) => Promise<BackendResponse<T>> },
  endpoint: string,
  options: BackendCallOptions = {}
): Promise<BackendCallResult<T> | BackendCallFailure> {
  const { timeout = DEFAULT_TIMEOUT, route = 'API' } = options

  try {
    const response = await apiClient.get(endpoint, { timeout })

    if (!response.ok) {
      logger.error(`[${route}] Backend GET error`, {
        endpoint,
        status: response.status,
        error: response.error,
      })

      return {
        success: false,
        response: errorResponse('Backend service unavailable', HTTP_STATUS.SERVICE_UNAVAILABLE),
        fallbackUsed: false,
      }
    }

    return {
      success: true,
      data: response.data as T,
    }
  } catch (error) {
    logger.error(`[${route}] Backend GET exception`, { endpoint, error })
    captureServerError(error instanceof Error ? error : new Error(String(error)), {
      route,
      endpoint,
    })

    return {
      success: false,
      response: errorResponse('Internal server error', HTTP_STATUS.INTERNAL_SERVER_ERROR),
      fallbackUsed: false,
    }
  }
}

/**
 * Transforms backend response data with consistent error handling
 */
export function transformBackendResponse<T, R>(
  data: T,
  transformer: (data: T) => R,
  options: { route?: string } = {}
): R | null {
  const { route = 'API' } = options

  try {
    return transformer(data)
  } catch (error) {
    logger.error(`[${route}] Response transformation failed`, { error })
    return null
  }
}
