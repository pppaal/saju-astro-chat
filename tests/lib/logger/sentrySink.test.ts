// @vitest-environment node
/**
 * src/lib/logger/sentrySink.ts — Sentry forwarding shared by logger and telemetry.
 *
 * The node environment matters: the logger only forwards to Sentry when
 * `window` is undefined (server side).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { captureException, captureMessage } = vi.hoisted(() => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}))

vi.mock('@sentry/nextjs', () => ({ captureException, captureMessage }))

import { captureToSentry, scrubObject } from '@/lib/logger/sentrySink'
import { logger } from '@/lib/logger'

const ROOT = join(__dirname, '..', '..', '..')

describe('sentrySink', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('scrubObject masks sensitive keys and keeps harmless ones', () => {
    expect(
      scrubObject({ token: 't', name: 'n', fileName: 'a.pdf', nested: { password: 'p' } })
    ).toEqual({
      token: '[redacted]',
      name: '[redacted]',
      fileName: 'a.pdf',
      nested: { password: '[redacted]' },
    })
  })

  it('sends an Error through captureException with scrubbed extra', async () => {
    const err = new Error('boom')
    captureToSentry(err, { userId: 'u1', authorization: 'Bearer x' })
    await vi.waitFor(() => expect(captureException).toHaveBeenCalledTimes(1))
    expect(captureException).toHaveBeenCalledWith(err, {
      extra: { userId: 'u1', authorization: '[redacted]' },
    })
    expect(captureMessage).not.toHaveBeenCalled()
  })

  it('sends a non-Error value as an error-level message', async () => {
    captureToSentry('plain failure')
    await vi.waitFor(() => expect(captureMessage).toHaveBeenCalledTimes(1))
    expect(captureMessage).toHaveBeenCalledWith('plain failure', {
      extra: undefined,
      level: 'error',
    })
  })

  it('logger.error on the server reaches Sentry through the sink', async () => {
    const err = new Error('db down')
    logger.error('[test] query failed', { err })
    await vi.waitFor(() => expect(captureException).toHaveBeenCalledTimes(1))
    expect(captureException.mock.calls[0][0]).toBe(err)
  })

  it('keeps logger and telemetry free of an import cycle', () => {
    const sink = readFileSync(join(ROOT, 'src/lib/logger/sentrySink.ts'), 'utf8')
    const telemetry = readFileSync(join(ROOT, 'src/lib/telemetry.ts'), 'utf8')
    const loggerSrc = readFileSync(join(ROOT, 'src/lib/logger/index.ts'), 'utf8')
    const importsOf = (src: string) =>
      [...src.matchAll(/(?:from|import\()\s*['"]([^'"]+)['"]/g)].map((m) => m[1])

    expect(importsOf(sink).filter((s) => /logger|telemetry/.test(s))).toEqual([])
    expect(importsOf(telemetry)).not.toContain('@/lib/logger')
    expect(importsOf(loggerSrc)).not.toContain('@/lib/telemetry')
  })
})
