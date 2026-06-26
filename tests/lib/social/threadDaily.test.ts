/**
 * threadDaily / sajuThread / astroThread — 주제 로테이션 + 사주·점성 빌더.
 *
 * 타로는 createShareLink 만 mock(실제 덱). 사주·점성은 결정론이라 그대로 검증.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/tarot/shareLink', async (orig) => {
  const actual = (await orig()) as Record<string, unknown>
  return {
    ...actual,
    createShareLink: vi.fn().mockResolvedValue('tok123'),
    siteBaseUrl: () => 'https://destinypal.com',
  }
})

import { buildDailyThreadPost, topicForSlot } from '@/lib/social/threadDaily'
import { buildSajuThreadPost } from '@/lib/social/sajuThread'
import { buildAstroThreadPost } from '@/lib/social/astroThread'

// 2026-06-26 KST (00:00Z → KST 09:00). 일진은 KST 날짜로 결정.
const NOW = new Date('2026-06-26T00:00:00Z')

describe('threadDaily — slot→topic', () => {
  beforeEach(() => vi.clearAllMocks())

  it('아침=타로 / 오후=사주 / 저녁=점성', () => {
    expect(topicForSlot('morning')).toBe('tarot')
    expect(topicForSlot('afternoon')).toBe('saju')
    expect(topicForSlot('evening')).toBe('astro')
  })

  it('morning → 타로 ThreadPost (공유 링크 + 이미지)', async () => {
    const p = await buildDailyThreadPost('morning', 'ko', NOW)
    expect(p?.topic).toBe('tarot')
    expect(p?.shareUrl).toBe('https://destinypal.com/r/tok123')
    expect(p?.caption).toContain('/free')
  })

  it('afternoon → 사주, evening → 점성', async () => {
    const saju = await buildDailyThreadPost('afternoon', 'ko', NOW)
    expect(saju?.topic).toBe('saju')
    const astro = await buildDailyThreadPost('evening', 'ko', NOW)
    expect(astro?.topic).toBe('astro')
  })
})

describe('sajuThread — 오늘의 일진', () => {
  it('일진 간지(한글+한자) + 오행 기운 + /free CTA', () => {
    const p = buildSajuThreadPost('afternoon', 'ko', NOW)
    expect(p.topic).toBe('saju')
    // 갑자~계해 중 하나 + 日 한자 표기
    expect(p.caption).toMatch(/[갑을병정무기경신임계][자축인묘진사오미신유술해]일/)
    expect(p.caption).toMatch(/[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]日/)
    expect(p.caption).toContain('의 기운')
    expect(p.caption).toContain('https://destinypal.com/free')
    expect(p.hashtags).toContain('#사주')
  })

  it('같은 날이면 같은 일진(결정론)', () => {
    const a = buildSajuThreadPost('afternoon', 'ko', NOW)
    const b = buildSajuThreadPost('afternoon', 'ko', NOW)
    expect(a.summary).toBe(b.summary)
  })

  it('영어 로케일 — 한자 간지 + Wood/Fire 등 + 영어 CTA', () => {
    const p = buildSajuThreadPost('afternoon', 'en', NOW)
    expect(p.caption).toMatch(/Wood|Fire|Earth|Metal|Water/)
    expect(p.caption).toContain('Read your own Saju')
  })
})

describe('astroThread — 오늘의 하늘', () => {
  it('별자리 시즌 + 달 위상 이모지 + /free CTA', () => {
    const p = buildAstroThreadPost('evening', 'ko', NOW)
    expect(p.topic).toBe('astro')
    expect(p.caption).toContain('시즌')
    expect(p.caption).toMatch(/🌑|🌒|🌓|🌔|🌕|🌖|🌗|🌘/)
    expect(p.caption).toContain('https://destinypal.com/free')
    expect(p.hashtags).toContain('#점성술')
  })

  it('6/26 은 게자리 시즌', () => {
    const p = buildAstroThreadPost('evening', 'ko', NOW)
    expect(p.caption).toContain('게자리 시즌')
  })

  it('연 경계(1/1)는 염소자리 시즌', () => {
    const p = buildAstroThreadPost('evening', 'ko', new Date('2026-01-01T03:00:00Z'))
    expect(p.caption).toContain('염소자리 시즌')
  })

  it('영어 로케일 — Cancer season + 영어 CTA', () => {
    const p = buildAstroThreadPost('evening', 'en', NOW)
    expect(p.caption).toContain('Cancer season')
    expect(p.caption).toContain('Read your own horoscope')
  })
})
