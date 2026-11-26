/**
 * 초대 링크 궁합 — 좌표 없는 사람은 도시 미상으로 리포트 빌더에 넘긴다 (재감사 CS-2, G8).
 *
 * 공유 레코드의 초대자나 받은 사람에게 lat/lon 이 없으면 차트는 타임존 기준점으로 계산된다.
 * 그 사람의 ASC·MC·하우스 오버레이는 날조라 buildCompatReport 가 시너스트리 뷰에서 가리도록
 * cityUnknown 을 함께 넘긴다(시간 미상 플래그와 독립).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/compatibility/compatReport', () => ({
  buildCompatReport: vi.fn(() => ({ synView: null })),
}))
vi.mock('@/lib/astrology/cached', () => ({
  cachedCalculateNatalChart: vi.fn(async () => ({ planets: [], houses: [] })),
}))

import { computeInvitePairReport } from '@/lib/compatibility/invitePairing'
import { buildCompatReport } from '@/lib/compatibility/compatReport'
import { cachedCalculateNatalChart } from '@/lib/astrology/cached'

const NOW = new Date('2026-11-26T00:00:00Z')

beforeEach(() => vi.clearAllMocks())

describe('computeInvitePairReport — city-unknown flags', () => {
  it('a person without coordinates is cityUnknown; one with coordinates is not', async () => {
    await computeInvitePairReport({
      inviter: { birthDate: '1992-03-14', birthTime: '06:40', tz: 'America/Los_Angeles' },
      invitee: {
        birthDate: '1990-09-02',
        birthTime: '21:15',
        tz: 'America/New_York',
        lat: 40.71,
        lon: -74.01,
      },
      lang: 'en',
      now: NOW,
    })
    const arg = vi.mocked(buildCompatReport).mock.calls[0][0]
    expect(arg.cityUnknownA).toBe(true)
    expect(arg.cityUnknownB).toBe(false)
    expect(arg.timeUnknownA).toBe(false)
    // 차트는 여전히 타임존 기준점 좌표로 계산된다(마스크는 리포트 빌더 몫)
    const firstCall = vi.mocked(cachedCalculateNatalChart).mock.calls[0][0]
    expect(Number.isFinite(firstCall.latitude)).toBe(true)
  })
})
