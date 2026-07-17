import { describe, it, expect } from 'vitest'
import { buildPrompt, subjectFor } from '@/lib/social/generateDrafts'
import { SOCIAL_CATEGORIES } from '@/lib/social/types'

// 프롬트 조립 불변식 — 인스타 카피 품질 사고(광고 클리셰·지어낸 해시태그·
// 무관 태그·카드 "…" 잘림)의 재발을 잠근다. LLM 호출 없이 조립만 검증.
const DATE = '2026-07-20'
const CTA = 'https://destinypal.com/free'

describe('social draft prompt invariants (EN)', () => {
  for (const category of SOCIAL_CATEGORIES) {
    describe(category, () => {
      const subject = subjectFor(category, DATE)
      const { systemPrompt } = buildPrompt('en', category, subject, CTA)

      it('caps the hook length so the card never truncates', () => {
        expect(systemPrompt).toContain('60 characters')
      })

      it('has a real Instagram tone spec (no ad-copy default)', () => {
        expect(systemPrompt).toContain('NOT brand-ad copy')
        expect(systemPrompt).toContain('The first line is everything')
      })

      it('bans invented and off-topic hashtags, with per-category tag anchors', () => {
        expect(systemPrompt).toContain('NEVER invent compound tags')
        // 카테고리별 앵커 태그가 실제로 들어간다 (한 개만 대표 확인).
        const anchor = {
          tarot: '#dailytarot',
          saju: '#koreanastrology',
          astrology: '#dailyhoroscope',
          compatibility: '#zodiaccompatibility',
          calendar: '#dailyhoroscope',
          zodiac: '#chinesezodiac',
        }[category]
        expect(systemPrompt).toContain(anchor)
      })

      it('does not bias the JSON example with #tarot (root cause of off-topic tags)', () => {
        // JSON 예시 줄에는 중립 placeholder 만. (타로 카테고리는 태그 힌트에
        // #tarot 이 정당하게 있으므로, 예시 줄만 좁혀 검사.)
        const exampleLine = systemPrompt
          .split('\n')
          .find((l) => l.includes('"instagram"') && l.includes('hashtags'))
        expect(exampleLine).toBeDefined()
        expect(exampleLine!).not.toContain('#tarot')
        expect(exampleLine!).toContain('#tag')
      })

      it('keeps raw URLs out of Instagram/Threads bodies (link-in-bio only)', () => {
        expect(systemPrompt).toContain('NO URL in Instagram or Threads bodies')
        expect(systemPrompt).toContain('link in bio')
      })
    })
  }
})

describe('social draft prompt invariants (KO)', () => {
  it('caps the hook and specs the Instagram tone', () => {
    const subject = subjectFor('compatibility', DATE)
    const { systemPrompt } = buildPrompt('ko', 'compatibility', subject, CTA)
    expect(systemPrompt).toContain('50자 이내')
    expect(systemPrompt).toContain('인스타 톤(중요)')
    expect(systemPrompt).toContain('실제로 검색하는 기존 태그만')
    // 궁합 카테고리 태그 앵커.
    expect(systemPrompt).toContain('#사주궁합')
  })
})
