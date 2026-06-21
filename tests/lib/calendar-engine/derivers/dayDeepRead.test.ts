import { describe, it, expect } from 'vitest'
import { deriveDayDeepRead } from '@/lib/calendar-engine/derivers/dayDeepRead'

describe('deriveDayDeepRead', () => {
  // seed omitted (=> 0). Each role pool is picked with a distinct ROLE offset
  // (opener=0, lift=1, drag=2, shinsal=3, hour=4, close=5), so at seed=0 the
  // chosen variant index = (0 + roleKey) % poolLen — NOT uniformly index 0.
  // Default wording below reflects those concrete picks.
  const base = {
    iljinKr: '갑자',
    iljinSibsin: '편재',
    tone: 'positive' as const,
    crosses: [],
  }

  it('always opens with the iljin energy and closes with a tone line (no crosses)', () => {
    const r = deriveDayDeepRead(base)
    expect(r.ko).toContain('갑자')
    expect(r.ko.startsWith('오늘은 갑자')).toBe(true) // opener idx0
    // positive tone close (seed=0 → close key5 → idx1)
    expect(r.ko).toContain('마음 가는 대로 밀고 가세요')
    // only two sentences when there are no crosses
    expect(r.ko.split('. ').filter(Boolean).length).toBe(2)
    expect(r.en).toContain('갑자')
    expect(r.en).toContain('push on where your heart leads')
  })

  it('weaves the strongest favorable cross pair (ko + en)', () => {
    const r = deriveDayDeepRead({
      ...base,
      crosses: [
        { sajuKo: '정재', astroKo: '금성', polarity: 2 },
        { sajuKo: '식신', astroKo: '수성', polarity: 1 },
      ],
    })
    // strongest positive (정재 × 금성, polarity 2) wins
    expect(r.ko).toContain('정재 × 금성')
    expect(r.ko).toContain('서로를 밀어줍니다') // seed=0 → lift key1 → idx1
    expect(r.en).toContain('Direct Wealth × Venus')
  })

  it('marks a clashing cross with a lead word / That said-style prefix and a caution clause', () => {
    const r = deriveDayDeepRead({
      ...base,
      tone: 'mixed',
      crosses: [
        { sajuKo: '정재', astroKo: '금성', polarity: 2 },
        { sajuKo: '편관', astroKo: '화성', polarity: -2 },
      ],
    })
    expect(r.ko).toContain('정재 × 금성') // favorable
    // seed=0 → drag key2 → idx2: lead '한편 ', en 'That said, '
    expect(r.ko).toContain('한편 편관 × 화성')
    expect(r.ko).toMatch(/(다만|한편) 편관 × 화성/) // a KO lead precedes the clash
    expect(r.ko).toContain('무리는 금물입니다')
    // mixed-tone close (seed=0 → close key5 → idx1)
    expect(r.ko).toContain('나아갈 곳엔')
    expect(r.en).toContain('That said, Seven Killings × Mars')
  })

  it('does not prefix any lead word when there is only a clash (no favorable cross)', () => {
    const r = deriveDayDeepRead({
      ...base,
      tone: 'caution',
      crosses: [{ sajuKo: '편관', astroKo: '화성', polarity: -3 }],
    })
    expect(r.ko).toContain('편관 × 화성')
    expect(r.ko).not.toMatch(/(다만|한편) 편관/)
    // caution close (seed=0 → close key5 → idx1)
    expect(r.ko).toContain('서두르지 말고')
  })

  it('is deterministic — same input yields identical output', () => {
    const args = {
      ...base,
      crosses: [{ sajuKo: '정재', astroKo: '금성', polarity: 2 }],
    }
    expect(deriveDayDeepRead(args)).toEqual(deriveDayDeepRead(args))
  })

  it('weaves active shinsal (max 2) as a colon clause, ko + en', () => {
    const r = deriveDayDeepRead({
      ...base,
      shinsal: [
        { ko: '천을귀인', en: 'Heavenly Benefactor' },
        { ko: '문창', en: 'Literary Star' },
        { ko: '도화', en: 'Peach Blossom' },
      ],
    })
    // seed=0 → shinsal key3 → idx3 variant
    expect(r.ko).toContain('함께 도는 신살: 천을귀인 · 문창.')
    expect(r.ko).not.toContain('도화') // capped at 2
    expect(r.en).toContain('In company today: Heavenly Benefactor · Literary Star.')
  })

  it('weaves the peak hour with a tone-appropriate clause', () => {
    const good = deriveDayDeepRead({
      ...base,
      peakHour: { whenKo: '09–11시', whenEn: '9–11am', tone: 'good' },
    })
    expect(good.ko).toContain('특히 09–11시, 결이 또렷해집니다.')
    expect(good.en).toContain('Especially around 9–11am, the day reads clearest.')

    const care = deriveDayDeepRead({
      ...base,
      peakHour: { whenKo: '17–19시', whenEn: '5–7pm', tone: 'caution' },
    })
    expect(care.ko).toContain('특히 17–19시, 한 박자 조심하세요.')
    expect(care.en).toContain('ease off a beat')
  })

  it('orders sentences opener → crosses → shinsal → hour → tone close', () => {
    const r = deriveDayDeepRead({
      ...base,
      tone: 'mixed',
      crosses: [{ sajuKo: '편관', astroKo: '화성', polarity: -2 }],
      shinsal: [{ ko: '천을귀인', en: 'Heavenly Benefactor' }],
      peakHour: { whenKo: '09–11시', whenEn: '9–11am', tone: 'good' },
    })
    const iOpener = r.ko.indexOf('갑자')
    const iCross = r.ko.indexOf('편관 × 화성')
    const iShinsal = r.ko.indexOf('천을귀인')
    const iHour = r.ko.indexOf('09–11시')
    const iClose = r.ko.length - 1
    expect(iOpener).toBeLessThan(iCross)
    expect(iCross).toBeLessThan(iShinsal)
    expect(iShinsal).toBeLessThan(iHour)
    expect(iHour).toBeLessThan(iClose)
  })

  it('does not glue Korean particles directly onto dynamic pair text', () => {
    const r = deriveDayDeepRead({
      ...base,
      crosses: [{ sajuKo: '정재', astroKo: '금성', polarity: 2 }],
    })
    // pair is followed by an em-dash clause, never 이/가/을/를/은/는
    expect(r.ko).toMatch(/정재 × 금성 —/)
    expect(r.ko).not.toMatch(/정재 × 금성[이가을를은는]/)
  })

  // ── personalization via seed ───────────────────────────────────────────

  const rich = {
    iljinKr: '갑자',
    iljinSibsin: '편재',
    tone: 'mixed' as const,
    crosses: [
      { sajuKo: '정재', astroKo: '금성', polarity: 2 },
      { sajuKo: '편관', astroKo: '화성', polarity: -2 },
    ],
    shinsal: [{ ko: '천을귀인', en: 'Heavenly Benefactor' }],
    peakHour: { whenKo: '09–11시', whenEn: '9–11am', tone: 'good' as const },
  }

  it('two different seeds produce different wording for identical inputs', () => {
    const a = deriveDayDeepRead({ ...rich, seed: 1 })
    const b = deriveDayDeepRead({ ...rich, seed: 2 })
    expect(a.ko).not.toBe(b.ko)
    expect(a.en).not.toBe(b.en)
  })

  it('same seed + inputs is reproducible', () => {
    const a = deriveDayDeepRead({ ...rich, seed: 7 })
    const b = deriveDayDeepRead({ ...rich, seed: 7 })
    expect(a).toEqual(b)
  })

  it('a single person’s sentences do not all collapse to variant index 0', () => {
    // With pools of length 4 and distinct role offsets, a non-multiple-of-4
    // seed must select a non-index-0 variant for at least one role.
    const r = deriveDayDeepRead({ ...rich, seed: 1 })
    // seed=0 (default) opener variant text; seed=1 should differ from it.
    const def = deriveDayDeepRead({ ...rich, seed: 0 })
    expect(r.ko).not.toBe(def.ko)
  })

  it('preserves order and particle-safety across seeds', () => {
    for (const seed of [0, 1, 2, 3, 5, 11, 99, 123456]) {
      const r = deriveDayDeepRead({ ...rich, seed })
      // order: opener(갑자) → favorable(정재 × 금성) → clash(편관 × 화성) → shinsal → hour
      const iOpener = r.ko.indexOf('갑자')
      const iLift = r.ko.indexOf('정재 × 금성')
      const iDrag = r.ko.indexOf('편관 × 화성')
      const iShinsal = r.ko.indexOf('천을귀인')
      const iHour = r.ko.indexOf('09–11시')
      expect(iOpener).toBeGreaterThanOrEqual(0)
      expect(iOpener).toBeLessThan(iLift)
      expect(iLift).toBeLessThan(iDrag)
      expect(iDrag).toBeLessThan(iShinsal)
      expect(iShinsal).toBeLessThan(iHour)
      // particle safety: dynamic slots never glued to KO particles
      expect(r.ko).toMatch(/정재 × 금성 —/)
      expect(r.ko).not.toMatch(/정재 × 금성[이가을를은는]/)
      expect(r.ko).not.toMatch(/편관 × 화성[이가을를은는]/)
      // when-slot followed by a comma, never a particle
      expect(r.ko).toMatch(/09–11시,/)
      expect(r.ko).not.toMatch(/09–11시[이가을를은는]/)
      // shinsal list preceded by a colon, never a particle
      expect(r.ko).toMatch(/: 천을귀인/)
    }
  })

  it('keeps the 다만-style lead only when a favorable cross precedes the clash, across seeds', () => {
    for (const seed of [1, 2, 3, 5, 11]) {
      // clash only — no lead word may appear before the pair
      const only = deriveDayDeepRead({
        ...base,
        tone: 'caution',
        crosses: [{ sajuKo: '편관', astroKo: '화성', polarity: -3 }],
        seed,
      })
      expect(only.ko).toMatch(/(^|\. )편관 × 화성/)
      // favorable + clash — some lead word precedes the clash pair
      const both = deriveDayDeepRead({ ...rich, seed })
      expect(both.ko).toMatch(/(다만|한편) 편관 × 화성/)
      expect(both.en).toMatch(/(That said,|Even so,|Still,) Seven Killings × Mars/)
    }
  })
})
