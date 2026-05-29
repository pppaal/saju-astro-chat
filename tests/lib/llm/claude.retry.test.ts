/**
 * callClaude — Anthropic 529 (Overloaded) retry behavior.
 *
 * Anthropic explicitly returns 529 for capacity events. fetchWithRetry's
 * retryStatusCodes list must include 529 so transient overload doesn't
 * surface as a user-visible failure.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const ORIGINAL_FETCH = global.fetch

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('callClaude retry behavior on Anthropic 529 (Overloaded)', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv, ANTHROPIC_API_KEY: 'test-key' }
  })

  afterEach(() => {
    global.fetch = ORIGINAL_FETCH
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  it('retries when Anthropic returns 529 then succeeds with 200', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: { message: 'Overloaded' } }, 529))
      .mockResolvedValueOnce(
        jsonResponse({
          content: [{ type: 'text', text: 'ok' }],
          usage: { input_tokens: 10, output_tokens: 5 },
        })
      )

    global.fetch = fetchMock as unknown as typeof fetch

    const { callClaude } = await import('@/lib/llm/claude')

    const result = await callClaude({
      systemPrompt: 's',
      userPrompt: 'u',
      // keep delays small so the test runs quickly; fetchWithRetry uses
      // initialDelayMs=700 by default in claude.ts, which is fine.
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.text).toBe('ok')
  })

  it('default fetchWithRetry retryStatusCodes includes 529', async () => {
    // Defensive: also verify the http.ts default list at module level so
    // any direct fetchWithRetry caller (not just claude.ts) gets the fix.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('overloaded', { status: 529 }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }))

    global.fetch = fetchMock as unknown as typeof fetch

    const { fetchWithRetry } = await import('@/lib/http')

    const res = await fetchWithRetry('https://example.test/x', undefined, {
      // Override delays to keep the test fast — relies on defaults for status code list.
      maxRetries: 1,
      initialDelayMs: 1,
      maxDelayMs: 5,
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(res.status).toBe(200)
  })
})
