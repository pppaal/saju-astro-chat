/**
 * tarotThread — 슬롯별 타로 공유 결과 + Threads 캡션 조립 단위 테스트.
 *
 * createShareLink/siteBaseUrl 만 모킹하고 실제 덱으로 카드 추첨 결정론과
 * 캡션(공유 링크 + /free CTA + 해시태그)을 검증한다.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/tarot/shareLink', () => ({
  createShareLink: vi.fn().mockResolvedValue('tok123'),
  siteBaseUrl: () => 'https://destinypal.com',
}))

import { buildTarotThreadPost, slotFromKst, isThreadSlot } from '@/lib/social/tarotThread'
import { createShareLink } from '@/lib/tarot/shareLink'

// 고정 시각 — KST 09:30(=00:30 UTC), 아침 슬롯.
const FIXED = new Date('2026-06-25T00:30:00.000Z')

describe('tarotThread', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createShareLink).mockResolvedValue('tok123')
  })

  it('slotFromKst — KST 시각대로 버킷 판정', () => {
    expect(slotFromKst(new Date('2026-06-25T00:30:00Z'))).toBe('morning') // KST 09:30
    expect(slotFromKst(new Date('2026-06-25T05:00:00Z'))).toBe('afternoon') // KST 14:00
    expect(slotFromKst(new Date('2026-06-25T10:00:00Z'))).toBe('evening') // KST 19:00
    expect(slotFromKst(new Date('2026-06-25T13:00:00Z'))).toBe('evening') // KST 22:00
    expect(slotFromKst(new Date('2026-06-25T19:00:00Z'))).toBe('evening') // KST 04:00 (새벽도 evening 버킷)
  })

  it('isThreadSlot — 유효 슬롯만 통과', () => {
    expect(isThreadSlot('morning')).toBe(true)
    expect(isThreadSlot('noon')).toBe(false)
    expect(isThreadSlot(null)).toBe(false)
  })

  it('공유 결과를 만들고 캡션에 공유 링크 + 무료 CTA + 해시태그를 담는다 (ko)', async () => {
    const post = await buildTarotThreadPost('morning', 'ko', FIXED)
    expect(post).not.toBeNull()
    expect(post!.slot).toBe('morning')
    expect(post!.locale).toBe('ko')
    expect(post!.shareUrl).toBe('https://destinypal.com/r/tok123')
    // 캡션: 공유 링크 + /free + 카드명
    expect(post!.caption).toContain('https://destinypal.com/r/tok123')
    expect(post!.caption).toContain('https://destinypal.com/free')
    expect(post!.caption).toContain(post!.cardName)
    expect(post!.hashtags.length).toBeGreaterThan(0)
    expect(post!.hashtags[0]).toMatch(/^#/)
    // 이미지 URL 은 절대 경로로 승격
    expect(post!.imageUrl).toMatch(/^https?:\/\//)

    // createShareLink 에 넘긴 페이로드 형태 확인
    const payload = vi.mocked(createShareLink).mock.calls[0][0] as Record<string, unknown>
    expect(payload).toMatchObject({ v: 1, kind: 'tarot', isKo: true })
    expect(Array.isArray((payload as { cards: unknown[] }).cards)).toBe(true)
  })

  it('영어 로케일이면 영어 CTA/해시태그', async () => {
    const post = await buildTarotThreadPost('evening', 'en', FIXED)
    expect(post!.caption).toContain('Read the full card')
    expect(post!.caption).toContain('Pull your own, free')
    expect(post!.hashtags).toContain('#tarot')
  })

  it('같은 날·같은 슬롯이면 같은 카드(결정론)', async () => {
    const a = await buildTarotThreadPost('afternoon', 'ko', FIXED)
    const b = await buildTarotThreadPost('afternoon', 'ko', FIXED)
    expect(a!.cardName).toBe(b!.cardName)
    expect(a!.isReversed).toBe(b!.isReversed)
  })

  it('공유 링크 저장 실패면 null', async () => {
    vi.mocked(createShareLink).mockResolvedValueOnce(null)
    const post = await buildTarotThreadPost('morning', 'ko', FIXED)
    expect(post).toBeNull()
  })
})
