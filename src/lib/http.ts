import { NextResponse } from "next/server";
import { logger } from '@/lib/logger';


/**
 * Options for fetchWithRetry
 */
export interface FetchWithRetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in ms before first retry (default: 1000) */
  initialDelayMs?: number;
  /** Maximum delay in ms between retries (default: 10000) */
  maxDelayMs?: number;
  /** Request timeout in ms (default: 30000) */
  timeoutMs?: number;
  /** HTTP status codes to retry on (default: [408, 429, 500, 502, 503, 504]) */
  retryStatusCodes?: number[];
  /** Callback called on each retry attempt */
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

/**
 * Custom error for fetch with retry failures
 */
export class FetchWithRetryError extends Error {
  public readonly attempts: number;
  public readonly lastError: Error;
  public readonly isTimeout: boolean;

  constructor(message: string, attempts: number, lastError: Error, isTimeout = false) {
    super(message);
    this.name = 'FetchWithRetryError';
    this.attempts = attempts;
    this.lastError = lastError;
    this.isTimeout = isTimeout;
  }
}

/**
 * Fetch with automatic retry and exponential backoff
 *
 * Features:
 * - Configurable timeout per request
 * - Exponential backoff with jitter
 * - Retries on network errors and specified HTTP status codes
 * - Abortable via AbortController
 *
 * @example
 * ```ts
 * const response = await fetchWithRetry('/api/personality', {
 *   method: 'POST',
 *   body: JSON.stringify(data),
 * }, {
 *   maxRetries: 3,
 *   timeoutMs: 15000,
 *   onRetry: (attempt, error, delay) => {
 *     logger.info(`Retry ${attempt} after ${delay}ms: ${error.message}`);
 *   }
 * });
 * ```
 */
export async function fetchWithRetry(
  url: string | URL,
  init?: RequestInit,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    timeoutMs = 30000,
    retryStatusCodes = [408, 429, 500, 502, 503, 504],
    onRetry,
  } = options;

  let lastError: Error = new Error('Unknown error');
  let attempts = 0;

  while (attempts <= maxRetries) {
    attempts++;

    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      // Merge abort signals if one was provided
      const signal = init?.signal
        ? anySignal([controller.signal, init.signal])
        : controller.signal;

      try {
        const response = await fetch(url, {
          ...init,
          signal,
        });

        clearTimeout(timeoutId);

        // Check if we should retry based on status code
        if (retryStatusCodes.includes(response.status) && attempts <= maxRetries) {
          lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
          throw lastError;
        }

        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    } catch (error) {
      if (error instanceof Error) {
        lastError = error;

        // Check if abort was from external signal (user cancellation)
        if (init?.signal?.aborted) {
          throw new FetchWithRetryError(
            'Request was cancelled',
            attempts,
            lastError,
            false
          );
        }

        // Check if it was a timeout
        const isTimeout = error.name === 'AbortError';

        // Don't retry if we've exhausted attempts
        if (attempts > maxRetries) {
          throw new FetchWithRetryError(
            `Failed after ${attempts} attempts: ${error.message}`,
            attempts,
            lastError,
            isTimeout
          );
        }

        // Calculate delay with exponential backoff and jitter
        const baseDelay = initialDelayMs * Math.pow(2, attempts - 1);
        const jitter = Math.random() * 0.3 * baseDelay;
        const delay = Math.min(baseDelay + jitter, maxDelayMs);

        // Notify about retry
        onRetry?.(attempts, error, delay);

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }

  throw new FetchWithRetryError(
    `Failed after ${attempts} attempts`,
    attempts,
    lastError,
    false
  );
}

/**
 * Combines multiple AbortSignals into one
 */
function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();

  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }

    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
  }

  return controller.signal;
}

/**
 * Enforce a maximum request body size based on the Content-Length header.
 * Returns a 413 response when the declared length exceeds the limit.
 * Note: if Content-Length is absent, the check is skipped.
 */
export function enforceBodySize(
  req: Request,
  maxBytes = 256 * 1024,
  passthroughHeaders?: HeadersInit
) {
  const lenHeader = req.headers.get("content-length");
  if (!lenHeader) {return null;}

  const len = Number(lenHeader);
  if (!Number.isFinite(len)) {return null;}
  if (len < 0) {return null;} // Negative values should be ignored
  if (len <= maxBytes) {return null;}

  const res = NextResponse.json(
    { error: "payload_too_large", limit: maxBytes },
    { status: 413 }
  );

  if (passthroughHeaders) {
    new Headers(passthroughHeaders).forEach((v, k) => res.headers.set(k, v));
  }
  return res;
}
