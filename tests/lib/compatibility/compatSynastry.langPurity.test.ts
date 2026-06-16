/**
 * Language-purity guard: the EN compatibility-counselor synastry blocks must
 * not leak Korean (Hangul) into the data injected for English users. The prompt
 * tells the model to answer in English from this context, so Hangul here bleeds
 * into English replies. Hanja stems/branches (甲戌, 庚) are universal saju
 * notation and intentionally kept.
 */
import { describe, it, expect } from 'vitest'
import { formatSajuSynastry } from '@/lib/compatibility/sajuSynastryFormatter'
import { formatAstroSynastry } from '@/lib/compatibility/astroSynastryFormatter'
import { formatCompositeChart } from '@/lib/compatibility/compositeChartFormatter'
import { collectCompatAstroFacts } from '@/lib/compatibility/compatAstroFacts'

const HANGUL = /[가-힣]/
const P = (stem: string, branch: string) => ({ stem, branch })
const SAJU_IN = {
  pillarsA: [P('甲', '子'), P('乙', '丑'), P('甲', '寅'), P('乙', '卯')],
  pillarsB: [P('庚', '午'), P('辛', '未'), P('庚', '申'), P('辛', '酉')],
  currentDaeunA: { stem: '丙', branch: '辰', age: 35 },
  currentDaeunB: { stem: '壬', branch: '戌', age: 33 },
  nameA: 'A',
  nameB: 'B',
} as const
const offenders = (s: string) =>
  s
    .split('\n')
    .filter((l) => HANGUL.test(l))
    .map((l) => l.trim())

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
const sweepPillars = (seed: number) =>
  [0, 1, 2, 3].map((k) => ({
    stem: STEMS[(seed * 7 + k * 3) % 10],
    branch: BRANCHES[(seed * 5 + k * 4) % 12],
  }))

describe('compat synastry language purity', () => {
  it('saju synastry EN contains no Hangul; KO still Korean', () => {
    const enOut = formatSajuSynastry({ ...SAJU_IN, lang: 'en' })
    expect(offenders(enOut), `Hangul leaked:\n${offenders(enOut).join('\n')}`).toEqual([])
    const koOut = formatSajuSynastry({ ...SAJU_IN, lang: 'ko' })
    expect(HANGUL.test(koOut)).toBe(true)
  })

  // A single pillar set misses chart-specific labels (e.g. the 12-sinsal '년살'
  // that previously leaked). Sweep many A/B combos so every branch is rendered.
  it('saju synastry EN has no Hangul across a wide pillar sweep', () => {
    const leaks = new Set<string>()
    for (let a = 0; a < 30; a++) {
      for (let b = 0; b < 30; b++) {
        const out = formatSajuSynastry({
          pillarsA: sweepPillars(a),
          pillarsB: sweepPillars(b + 13),
          currentDaeunA: { stem: STEMS[a % 10], branch: BRANCHES[a % 12], age: 20 + (a % 40) },
          currentDaeunB: { stem: STEMS[b % 10], branch: BRANCHES[b % 12], age: 20 + (b % 40) },
          nameA: 'A',
          nameB: 'B',
          now: new Date('2026-06-16'),
          lang: 'en',
        })
        for (const l of offenders(out)) leaks.add(l)
      }
    }
    expect([...leaks], `Hangul leaked in sweep:\n${[...leaks].join('\n')}`).toEqual([])
  })

  // South Node is derived (True Node + 180°) and can aspect personal planets.
  // It previously leaked as '남교점' because the EN planet-label map omitted it.
  // Synthetic charts force a South Node aspect deterministically.
  it('astro synastry EN renders South Node in English (no 남교점 leak)', () => {
    const mk = (pl: { name: string; longitude: number }[]) =>
      ({
        planets: pl.map((p) => ({
          name: p.name,
          longitude: p.longitude,
          sign: 'Aries',
          degree: 0,
          minute: 0,
          formatted: '',
          house: 1,
          retrograde: false,
        })),
        ascendant: {
          name: 'Ascendant',
          longitude: 0,
          sign: 'Aries',
          degree: 0,
          minute: 0,
          formatted: '',
          house: 1,
        },
        mc: {
          name: 'MC',
          longitude: 270,
          sign: 'Aries',
          degree: 0,
          minute: 0,
          formatted: '',
          house: 10,
        },
        houses: Array.from({ length: 12 }, (_, i) => ({ cusp: (i * 30) % 360 })),
        meta: { jdUT: 2451545 },
      }) as unknown as Parameters<typeof formatAstroSynastry>[0]['chartA']
    const chartA = mk([
      { name: 'Sun', longitude: 10 },
      { name: 'Venus', longitude: 200 }, // conjuncts B's South Node (200)
      { name: 'True Node', longitude: 50 },
    ])
    const chartB = mk([
      { name: 'Sun', longitude: 12 },
      { name: 'Mars', longitude: 305 },
      { name: 'True Node', longitude: 20 }, // South Node = 200 → conjunct A Venus
    ])
    const out = formatAstroSynastry({
      chartA,
      chartB,
      latA: 37,
      lonA: 127,
      latB: 37,
      lonB: 127,
      nameA: 'A',
      nameB: 'B',
      lang: 'en',
    })
    expect(out).toContain('S.Node')
    expect(offenders(out), `astro Hangul:\n${offenders(out).join('\n')}`).toEqual([])
  })

  it('astro + composite synastry EN contain no Hangul', async () => {
    const facts = await collectCompatAstroFacts(
      {
        birthDate: '1990-05-15',
        birthTime: '08:30',
        latitude: 37.5665,
        longitude: 126.978,
        timezone: 'Asia/Seoul',
      },
      {
        birthDate: '1992-02-03',
        birthTime: '00:35',
        latitude: 37.5665,
        longitude: 126.978,
        timezone: 'Asia/Seoul',
      }
    )
    expect(facts).not.toBeNull()
    if (!facts) return
    const astro = formatAstroSynastry({
      chartA: facts.a.chart,
      chartB: facts.b.chart,
      latA: facts.a.latitude,
      lonA: facts.a.longitude,
      latB: facts.b.latitude,
      lonB: facts.b.longitude,
      nameA: 'A',
      nameB: 'B',
      lang: 'en',
    })
    expect(offenders(astro), `astro Hangul:\n${offenders(astro).join('\n')}`).toEqual([])
    const composite = formatCompositeChart({
      chartA: facts.a.chart,
      chartB: facts.b.chart,
      nameA: 'A',
      nameB: 'B',
      lang: 'en',
    })
    expect(offenders(composite), `composite Hangul:\n${offenders(composite).join('\n')}`).toEqual(
      []
    )
  }, 60000)
})
