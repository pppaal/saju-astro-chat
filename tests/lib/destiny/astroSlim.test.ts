/**
 * slimAstroSelf — 일·월식 줄의 식점 하우스는 선택이다 (재감사 AC-2·CNS-2, G8).
 *
 * placeUnreliable(출생시각·출생지 미상)이면 formatAstroSelf 가 '(House N, …' 을 적지 않는다.
 * 예전 ECL 정규식은 하우스를 필수로 요구해, 하우스 없는 줄은 통째로 버려졌을 것이다 — 이제
 * 하우스 없는 줄도 싣되 'eclipse@H' / '식점 H' 태그만 뺀다. 하우스가 있으면 예전과 같다.
 */
import { describe, it, expect } from 'vitest'
import { slimAstroSelf } from '@/lib/destiny/astroSlim'

const withHouse = [
  '[Upcoming Eclipses — 본명 차트에 임팩트 (orb 3°)]',
  '월식 2026-03-03 Virgo 12° square Saturn (House 11, orb 0.07°)',
  '월식 2026-03-03 Virgo 12° square Pluto (House 11, orb 0.27°)',
  '일식 2026-08-12 Leo 20° conjunction Mercury (House 10, orb 0.70°)',
  '',
].join('\n')
const noHouse = withHouse.replace(/House \d+, /g, '')

describe('slimAstroSelf — eclipse house tag is optional', () => {
  it('house present → tag on the first line of each event (EN/KO)', () => {
    const en = slimAstroSelf(withHouse, { locale: 'en', year: 2026 })
    expect(en).toContain('03-03 lunar Virgo → natal Saturn [square] 0.07° (eclipse@H11)')
    expect(en).toContain('03-03 lunar → natal Pluto [square] 0.27°')
    expect(en).toContain('08-12 solar Leo → natal Mercury [conjunction] 0.70° (eclipse@H10)')
    const ko = slimAstroSelf(withHouse, { locale: 'ko', year: 2026 })
    expect(ko).toContain('03-03 월식 처녀 → 본명 토성 [긴장] 0.07° (식점 H11)')
  })

  it('house absent → same lines, no tag (EN/KO)', () => {
    const en = slimAstroSelf(noHouse, { locale: 'en', year: 2026 })
    expect(en).toContain('2026 eclipses:')
    expect(en).toContain('03-03 lunar Virgo → natal Saturn [square] 0.07°\n')
    expect(en).toContain('08-12 solar Leo → natal Mercury [conjunction] 0.70°')
    expect(en).not.toMatch(/eclipse@H/)
    const ko = slimAstroSelf(noHouse, { locale: 'ko', year: 2026 })
    expect(ko).toContain('03-03 월식 처녀 → 본명 토성 [긴장] 0.07°')
    expect(ko).not.toMatch(/식점 H/)
  })
})
