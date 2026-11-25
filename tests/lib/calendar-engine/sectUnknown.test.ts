// @vitest-environment node
/**
 * 캘린더 본명 — 정오 앵커로 섹트를 지어내지 않는다(F5, OD-5).
 *
 * 출생시각 미상이면 NatalContext.astro.sect = null. 섹트에 기대는 추출기는
 *  - lot(astro-arabic-part)·ZR(astro-zr): 낮/밤 공식이라 신호를 내지 않는다,
 *  - 품위(astro-dignity): 삼분성은 섹트와 무관한 참여 지배성만 센다.
 */
import { describe, it, expect } from 'vitest'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import astroZRExtractor from '@/lib/calendar-engine/extractors/astro-zr'
import astroArabicPartExtractor from '@/lib/calendar-engine/extractors/astro-arabic-part'
import astroDignityExtractor from '@/lib/calendar-engine/extractors/astro-dignity'
import { createCache } from '@/lib/calendar-engine/cache'
import { TRIPLICITY, triplicityOf } from '@/lib/astrology/foundation/dignities'
import type { NatalContext } from '@/lib/calendar-engine/context/types'

const BIRTH = {
  birthDate: '1995-02-09',
  birthTime: '06:40',
  gender: 'male' as const,
  latitude: 37.5665,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
}
const RANGE = {
  start: '2026-11-01T00:00:00.000Z',
  end: '2026-11-03T00:00:00.000Z',
  granularity: 'day' as const,
}
const withSect = (natal: NatalContext, sect: NatalContext['astro']['sect']): NatalContext => ({
  ...natal,
  astro: { ...natal.astro, sect },
})

describe('buildNatalContext — 섹트', () => {
  it('출생시각 미상이면 sect null', async () => {
    const natal = await buildNatalContext({ ...BIRTH, birthTime: '12:00', birthTimeUnknown: true })
    expect(natal.astro.sect).toBeNull()
  })

  it('시각을 알면 day/night(대조군)', async () => {
    const natal = await buildNatalContext(BIRTH)
    expect(['day', 'night']).toContain(natal.astro.sect)
  })
})

describe('섹트 미상이면 lot·ZR 추출기는 신호 없음', () => {
  it('astro-zr / astro-arabic-part → []', async () => {
    const known = await buildNatalContext(BIRTH)
    const natal = withSect(known, null)
    const ctx = { natal, range: RANGE, cache: createCache() }
    expect(await astroZRExtractor.extract(ctx)).toEqual([])
    expect(await astroArabicPartExtractor.extract(ctx)).toEqual([])
    // 대조군 — 같은 본명에 섹트가 있으면 ZR 은 신호를 낸다.
    const control = await astroZRExtractor.extract({ ...ctx, natal: known })
    expect(control.length).toBeGreaterThan(0)
  })
})

describe('섹트 미상이면 품위 추출기의 삼분성은 참여 지배성만', () => {
  it('triplicity 로 잡힌 신호의 행성은 그 사인의 참여 지배성', async () => {
    const natal = withSect(await buildNatalContext(BIRTH), null)
    const signals = await astroDignityExtractor.extract({
      natal,
      range: RANGE,
      cache: createCache(),
    })
    const tripSignals = signals.filter((s) => {
      const d = s.evidence?.detail as
        | { dignity?: string; tiers?: { triplicity?: boolean } }
        | undefined
      return d?.dignity === 'triplicity' || (d?.dignity === 'natal-almuten' && d.tiers?.triplicity)
    })
    for (const s of tripSignals) {
      const planet = s.evidence?.planets?.[0] ?? ''
      const sign = String(s.evidence?.detail?.sign ?? '')
      expect(triplicityOf(planet, sign, null)).toBe('participating')
    }
    // 본명 스냅샷의 tiers 도 같은 규칙 — 낮·밤 지배성 행성은 triplicity=false.
    for (const s of signals.filter((x) => x.evidence?.detail?.dignity === 'natal-almuten')) {
      const d = s.evidence!.detail as { sign: string; tiers: { triplicity: boolean } }
      const planet = s.evidence!.planets![0]
      expect(d.tiers.triplicity).toBe(triplicityOf(planet, d.sign, null) !== null)
    }
  })

  it('triplicityOf(…, null) 은 낮·밤 지배성을 고르지 않는다', () => {
    expect(triplicityOf('Sun', 'Aries', true)).toBe('day')
    expect(triplicityOf('Jupiter', 'Aries', false)).toBe('night')
    expect(triplicityOf('Sun', 'Aries', null)).toBeNull()
    expect(triplicityOf('Jupiter', 'Aries', null)).toBeNull()
    expect(triplicityOf(TRIPLICITY.fire.participating, 'Aries', null)).toBe('participating')
  })
})
