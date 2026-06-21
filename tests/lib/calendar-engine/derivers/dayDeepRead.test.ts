import { describe, it, expect } from 'vitest'
import { deriveDayDeepRead } from '@/lib/calendar-engine/derivers/dayDeepRead'

describe('deriveDayDeepRead', () => {
  const base = {
    iljinKr: '갑자',
    iljinSibsin: '편재',
    tone: 'positive' as const,
    crosses: [],
  }

  it('always opens with the iljin energy and closes with a tone line (no crosses)', () => {
    const r = deriveDayDeepRead(base)
    expect(r.ko).toContain('갑자')
    expect(r.ko.startsWith('오늘은 갑자')).toBe(true)
    // positive tone close
    expect(r.ko).toContain('한 발 더 나아가도 좋아요')
    // only two sentences when there are no crosses
    expect(r.ko.split('. ').filter(Boolean).length).toBe(2)
    expect(r.en).toContain('갑자')
    expect(r.en).toContain('step a little further')
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
    expect(r.ko).toContain('힘을 보탭니다')
    expect(r.en).toContain('Direct Wealth × Venus')
  })

  it('marks a clashing cross with 다만 / That said and a caution verb', () => {
    const r = deriveDayDeepRead({
      ...base,
      tone: 'mixed',
      crosses: [
        { sajuKo: '정재', astroKo: '금성', polarity: 2 },
        { sajuKo: '편관', astroKo: '화성', polarity: -2 },
      ],
    })
    expect(r.ko).toContain('정재 × 금성') // favorable
    expect(r.ko).toContain('다만 편관 × 화성') // clash, prefixed with 다만
    expect(r.ko).toContain('조심하세요')
    // mixed-tone close
    expect(r.ko).toContain('한 박자 늦추세요')
    expect(r.en).toContain('That said, Seven Killings × Mars')
  })

  it('does not prefix 다만 when there is only a clash (no favorable cross)', () => {
    const r = deriveDayDeepRead({
      ...base,
      tone: 'caution',
      crosses: [{ sajuKo: '편관', astroKo: '화성', polarity: -3 }],
    })
    expect(r.ko).toContain('편관 × 화성')
    expect(r.ko).not.toContain('다만 편관')
    expect(r.ko).toContain('큰 결정은 미루고')
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
    expect(r.ko).toContain('오늘 함께하는 기운: 천을귀인 · 문창.')
    expect(r.ko).not.toContain('도화') // capped at 2
    expect(r.en).toContain('Stars in play: Heavenly Benefactor · Literary Star.')
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
    const iOpener = r.ko.indexOf('오늘은 갑자')
    const iCross = r.ko.indexOf('편관 × 화성')
    const iShinsal = r.ko.indexOf('함께하는 기운')
    const iHour = r.ko.indexOf('특히 09–11시')
    const iClose = r.ko.indexOf('한 박자 늦추세요')
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
})
