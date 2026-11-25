/**
 * 통합 리포트 — 출생시각/출생지 미상(placeUnreliable)이면 ASC·하우스에 기대는 Hellenistic
 * 항목을 내지 않는다 (엔진 감사 F1, CONVENTIONS §5).
 *
 * E7 은 하우스·ASC/MC 만 가렸고 lots(7 Arabic Parts)·Almuten·본명 aspects 의 하우스는
 * astroFacts.hellenistic 에서 그대로 리포트로 흘렀다 — 정오 앵커·기본 좌표 폴백 ASC 로 만든
 * "그럴듯하지만 틀린" 값이다. 이제 astroFacts 가 단일 출처에서 가린다
 * (maskPlaceDependentHellenistic): lots·ZR·Almuten 비움, aspects 는 행성-행성만 + 하우스 제거,
 * Chiron·Lilith 하우스 0. 리포트 어댑터는 받은 그대로 렌더한다.
 */
import { describe, it, expect } from 'vitest'
import { buildReportContext } from '@/lib/report/buildReportContext'
import { natalToReportData, buildCrossRows } from '@/lib/report/integratedAdapter'
import { maskPlaceDependentHellenistic, type AstroHellenisticFacts } from '@/lib/destiny/astroFacts'

const NOW = new Date('2026-11-25T00:00:00Z')
const BIRTH = {
  birthDate: '1997-03-21',
  birthTime: '14:30',
  gender: 'female' as const,
  latitude: 37.5665,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
}

type Ctx = {
  astro: {
    placeUnreliable?: boolean
    lots: unknown[]
    almutenFiguris: unknown
    zodiacalReleasing: { spirit: unknown; fortune: unknown }
    natalAspects: Array<{
      from: { name: string; house?: number }
      to: { name: string; house?: number }
    }>
    extraPoints?: Array<{ name: string; house: number }>
    sect: string
    dignities: unknown[]
  }
  input: Record<string, unknown>
}

describe('maskPlaceDependentHellenistic — 단일 출처 마스크', () => {
  const h: AstroHellenisticFacts = {
    sect: 'night',
    extraPoints: [
      {
        name: 'Chiron',
        longitude: 10,
        sign: 'Aries',
        degree: 10,
        minute: 0,
        formatted: 'Aries 10deg',
        house: 7,
      },
    ],
    natalAspects: [
      {
        from: { name: 'Sun', kind: 'natal', longitude: 0, house: 4 },
        to: { name: 'Moon', kind: 'natal', longitude: 120, house: 8 },
        type: 'trine',
        orb: 1,
      },
      {
        from: { name: 'Venus', kind: 'natal', longitude: 30, house: 5 },
        to: { name: 'Ascendant', kind: 'angle', longitude: 30, house: 1 },
        type: 'conjunction',
        orb: 0.5,
      },
    ],
    lots: [{ name: 'Fortune', sign: 'Leo', longitude: 130, degreeInSign: 10, house: 2 }] as never,
    zodiacalReleasing: { spirit: { startSign: 'Leo', periods: [] }, fortune: null } as never,
    dignities: [{ planet: 'Sun', sign: 'Aries', degree: 0, tiers: {}, score: 4 }] as never,
    almutenFiguris: { winner: 'Mars', winners: ['Mars'], scores: { Mars: 9 } } as never,
  }

  it('lots·ZR·Almuten 을 비우고, aspects 는 행성-행성만 하우스 없이, Chiron 하우스는 0', () => {
    const m = maskPlaceDependentHellenistic(h)
    expect(m.lots).toEqual([])
    expect(m.zodiacalReleasing).toEqual({ spirit: null, fortune: null })
    expect(m.almutenFiguris).toBeNull()
    expect(m.natalAspects).toHaveLength(1)
    expect(m.natalAspects[0].from).toEqual({ name: 'Sun', kind: 'natal', longitude: 0 })
    expect(m.natalAspects[0].to).toEqual({ name: 'Moon', kind: 'natal', longitude: 120 })
    expect(m.extraPoints?.[0].house).toBe(0)
    // 섹트·존엄은 ASC·하우스 항목이 아니라 그대로
    expect(m.sect).toBe('night')
    expect(m.dignities).toBe(h.dignities)
    // 입력은 건드리지 않는다(캐시 값 보호)
    expect(h.lots).toHaveLength(1)
    expect(h.natalAspects[0].from.house).toBe(4)
  })
})

describe('통합 리포트 — placeUnreliable 이면 lots·Almuten·aspect 하우스 없음', () => {
  it.each([
    ['출생지 미상', { birthCityUnknown: true }],
    ['출생시각 미상', { birthTimeUnknown: true, birthTime: '12:00' }],
  ])(
    '%s → ctx·리포트에 lots/almuten/ZR 없음, aspects 하우스 없음, Chiron·Lilith 하우스 0',
    async (_l, over) => {
      const ctx = (await buildReportContext({ ...BIRTH, ...over })) as unknown as Ctx
      expect(ctx.astro.placeUnreliable).toBe(true)
      expect(ctx.astro.lots).toEqual([])
      expect(ctx.astro.almutenFiguris).toBeNull()
      expect(ctx.astro.zodiacalReleasing).toEqual({ spirit: null, fortune: null })
      for (const a of ctx.astro.natalAspects) {
        expect(a.from.house).toBeUndefined()
        expect(a.to.house).toBeUndefined()
        expect(['Ascendant', 'MC']).not.toContain(a.from.name)
        expect(['Ascendant', 'MC']).not.toContain(a.to.name)
      }
      for (const p of ctx.astro.extraPoints ?? []) expect(p.house).toBe(0)

      const rd = natalToReportData(ctx as never, 'ko', NOW)
      expect(rd.astro.lots).toEqual([])
      expect(rd.astro.almuten).toBeNull()
      expect(rd.astro.houses).toEqual([])
      expect(rd.astro.ascendant.sign).toBeNull()
      expect(rd.astro.mc.sign).toBeNull()
      for (const p of rd.astro.planets) expect(p.house).toBe(0)
      for (const p of rd.astro.extraPoints ?? []) expect(p.house).toBe(0)
      // 교차표는 그대로 만들어진다(Almuten 없이 정체성 축 판정)
      expect(buildCrossRows(ctx as never, 'ko', NOW).rows.length).toBeGreaterThan(0)
    },
    60_000
  )

  it('신뢰 가능한 본명은 lots 7개·Almuten 이 그대로(대조군)', async () => {
    const ctx = (await buildReportContext(BIRTH)) as unknown as Ctx
    expect(ctx.astro.placeUnreliable).toBe(false)
    expect(ctx.astro.lots).toHaveLength(7)
    expect(ctx.astro.almutenFiguris).not.toBeNull()
    const rd = natalToReportData(ctx as never, 'ko', NOW)
    expect(rd.astro.lots).toHaveLength(7)
    expect(rd.astro.almuten).not.toBeNull()
  }, 60_000)
})
