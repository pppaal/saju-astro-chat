/**
 * EN 누출 회귀 — 궁합 관계톤 블록 + 조후용신 캘린더 신호.
 *
 * 둘 다 langPurity sweep 밖 경로라 한국어/생 한자가 EN 출력에 새고 있었다.
 *  - relationConfig: EN 분기가 한국어 tone(toneEn 누락)을 system prompt 에 주입.
 *  - saju-johu-yongsin: english 필드가 생 한자 월지(午-month)를 노출.
 */
import { describe, it, expect } from 'vitest'
import { buildRelationToneBlock } from '@/lib/compatibility/counselor/relationConfig'
import johuExtractor from '@/lib/calendar-engine/extractors/saju/saju-johu-yongsin'
import type { ExtractorContext } from '@/lib/calendar-engine/types'

const HANGUL = /[가-힣]/
const CJK = /[一-鿿]/
const ALL_RELATIONS = [
  'lover',
  'crush',
  'spouse',
  'engaged',
  'ex',
  'friend',
  'family',
  'sibling',
  'colleague',
  'business',
  'other',
] as const

describe('buildRelationToneBlock — EN 분기 한국어 누출 없음', () => {
  for (const key of ALL_RELATIONS) {
    it(`${key}: EN tone 블록에 Hangul 0`, () => {
      const block = buildRelationToneBlock(key, 'en')
      expect(block.length).toBeGreaterThan(0)
      expect(HANGUL.test(block)).toBe(false)
    })
  }
  it('ko 분기는 기존대로 한국어 유지', () => {
    expect(buildRelationToneBlock('lover', 'ko')).toMatch(HANGUL)
  })
})

describe('saju-johu-yongsin — english 신호에 생 한자 월지 없음', () => {
  it('1년치 신호의 english 에 CJK(한자) 0 (월지 pinyin 화)', () => {
    const ctx = {
      natal: { saju: { pillars: { day: { heavenlyStem: { name: '甲' } } } } },
      range: { start: '2026-01-01T00:00:00.000Z', end: '2026-12-31T23:59:59.999Z' },
    } as unknown as ExtractorContext
    const signals = johuExtractor.extract(ctx)
    expect(signals.length).toBeGreaterThan(0)
    for (const s of signals) {
      expect(CJK.test(s.english ?? '')).toBe(false)
      // 월지가 병음으로 (예: Wu-month), korean 필드는 한자 유지.
      expect(s.english).toMatch(/-month climate balance/)
    }
  })
})
