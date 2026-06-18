/**
 * formatOpsDigest 순수 포맷터 테스트 — DB 없이 스냅샷→다이제스트 변환만 검증.
 */
import { describe, it, expect } from 'vitest'
import { formatOpsDigest, type OpsSnapshot } from '@/lib/admin/opsSnapshot'

function makeSnapshot(overrides: Partial<OpsSnapshot> = {}): OpsSnapshot {
  return {
    generatedAt: '2026-06-18T23:00:00.000Z',
    period: 'daily',
    windowDays: 1,
    users: { total: 1200, today: 12, last7d: 80, last30d: 300, activeToday: 45, paying: 90 },
    readings: { total: 5000, today: 60 },
    purchases: { total: 400, today: 3, last7d: 20, last30d: 70 },
    credits: { outstanding: 1500 },
    anomalies: {
      windowDays: 1,
      consumeThreshold: 100,
      grantThreshold: 100,
      topConsumers: [],
      topGranted: [],
      flaggedCount: 0,
    },
    ...overrides,
  }
}

describe('formatOpsDigest', () => {
  it('builds a subject with date and period, no flag when clean', () => {
    const d = formatOpsDigest(makeSnapshot())
    expect(d.subject).toContain('2026-06-18')
    expect(d.subject).toContain('일간')
    expect(d.subject).not.toContain('🚨')
  })

  it('weekly period reflects in subject', () => {
    const d = formatOpsDigest(makeSnapshot({ period: 'weekly', windowDays: 7 }))
    expect(d.subject).toContain('주간')
  })

  it('prefixes alarm emoji when anomalies are flagged', () => {
    const d = formatOpsDigest(
      makeSnapshot({
        anomalies: {
          windowDays: 1,
          consumeThreshold: 100,
          grantThreshold: 100,
          topConsumers: [
            { userId: 'u1', email: 'heavy@example.com', name: null, amount: 250, flagged: true },
          ],
          topGranted: [],
          flaggedCount: 1,
        },
      })
    )
    expect(d.subject).toContain('🚨')
    expect(d.text).toContain('⚠️')
    // 이메일은 마스킹돼야 한다 (원문 노출 금지).
    expect(d.text).not.toContain('heavy@example.com')
    expect(d.text).toContain('@example.com')
  })

  it('includes core metrics in the text body', () => {
    const d = formatOpsDigest(makeSnapshot())
    expect(d.text).toContain('1200') // users total
    expect(d.text).toContain('+12') // users today
    expect(d.text).toContain('1500') // outstanding credits
  })

  it('renders a dashboard deep link when baseUrl is given', () => {
    const d = formatOpsDigest(makeSnapshot(), { baseUrl: 'https://destinypal.com/' })
    expect(d.text).toContain('https://destinypal.com/admin/dashboard')
  })

  it('escapes html and wraps in pre', () => {
    const d = formatOpsDigest(makeSnapshot())
    expect(d.html).toContain('<pre')
    expect(d.html).not.toContain('<script')
  })

  it('supports english locale labels', () => {
    const d = formatOpsDigest(makeSnapshot(), { locale: 'en' })
    expect(d.subject).toContain('Daily')
    expect(d.text).toContain('Users')
  })
})
