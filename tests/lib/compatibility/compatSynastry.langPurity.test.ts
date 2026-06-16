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

describe('compat synastry language purity', () => {
  it('saju synastry EN contains no Hangul; KO still Korean', () => {
    const enOut = formatSajuSynastry({ ...SAJU_IN, lang: 'en' })
    expect(offenders(enOut), `Hangul leaked:\n${offenders(enOut).join('\n')}`).toEqual([])
    const koOut = formatSajuSynastry({ ...SAJU_IN, lang: 'ko' })
    expect(HANGUL.test(koOut)).toBe(true)
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
