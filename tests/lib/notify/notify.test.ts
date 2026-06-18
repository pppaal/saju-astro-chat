/**
 * 알림 레이어 테스트 — 미설정 시 안전 no-op, 수신자 파싱.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { resolveOpsRecipients, sendEmail } from '@/lib/notify/email'
import { notifyOps } from '@/lib/notify/ops'

const ENV_KEYS = [
  'OPS_REPORT_RECIPIENTS',
  'ADMIN_EMAILS',
  'OPS_WEBHOOK_URL',
  'EMAIL_PROVIDER',
  'RESEND_API_KEY',
  'EMAIL_FROM',
]

describe('resolveOpsRecipients', () => {
  const saved: Record<string, string | undefined> = {}
  beforeEach(() => {
    for (const k of ENV_KEYS) {
      saved[k] = process.env[k]
      delete process.env[k]
    }
  })
  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k]
      else process.env[k] = saved[k]
    }
  })

  it('returns [] when nothing configured', () => {
    expect(resolveOpsRecipients()).toEqual([])
  })

  it('parses comma/space separated ADMIN_EMAILS and dedupes/lowercases', () => {
    process.env.ADMIN_EMAILS = 'A@x.com, b@x.com  a@x.com'
    expect(resolveOpsRecipients()).toEqual(['a@x.com', 'b@x.com'])
  })

  it('prefers OPS_REPORT_RECIPIENTS over ADMIN_EMAILS', () => {
    process.env.ADMIN_EMAILS = 'admin@x.com'
    process.env.OPS_REPORT_RECIPIENTS = 'ops@x.com'
    expect(resolveOpsRecipients()).toEqual(['ops@x.com'])
  })

  it('drops entries without @', () => {
    process.env.ADMIN_EMAILS = 'notanemail, ok@x.com'
    expect(resolveOpsRecipients()).toEqual(['ok@x.com'])
  })
})

describe('sendEmail (unconfigured)', () => {
  const saved: Record<string, string | undefined> = {}
  beforeEach(() => {
    for (const k of ENV_KEYS) {
      saved[k] = process.env[k]
      delete process.env[k]
    }
  })
  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k]
      else process.env[k] = saved[k]
    }
  })

  it('no-ops without throwing when provider not configured', async () => {
    const r = await sendEmail({ to: 'x@y.com', subject: 'hi', text: 'hi' })
    expect(r).toEqual({ sent: false, reason: 'not_configured' })
  })

  it('returns no_recipients for empty recipient list', async () => {
    process.env.RESEND_API_KEY = 're_test'
    process.env.EMAIL_FROM = 'a@b.com'
    const r = await sendEmail({ to: [], subject: 'hi' })
    expect(r).toEqual({ sent: false, reason: 'no_recipients' })
  })
})

describe('notifyOps (no channel)', () => {
  const saved: Record<string, string | undefined> = {}
  beforeEach(() => {
    for (const k of ENV_KEYS) {
      saved[k] = process.env[k]
      delete process.env[k]
    }
  })
  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k]
      else process.env[k] = saved[k]
    }
  })

  it('reports nothing attempted and does not throw when no channel set', async () => {
    const r = await notifyOps({ subject: 's', text: 't' })
    expect(r.email.attempted).toBe(false)
    expect(r.webhook.attempted).toBe(false)
    expect(r.email.sent).toBe(false)
    expect(r.webhook.sent).toBe(false)
  })

  it('attempts webhook when OPS_WEBHOOK_URL set', async () => {
    process.env.OPS_WEBHOOK_URL = 'https://hooks.example.com/test'
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchMock)
    const r = await notifyOps({ subject: 's', text: 't' })
    expect(r.webhook.attempted).toBe(true)
    expect(r.webhook.sent).toBe(true)
    expect(fetchMock).toHaveBeenCalledOnce()
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.text).toBe('t')
    expect(body.content).toBe('t')
    vi.unstubAllGlobals()
  })
})
