import { calculateSolarReturn, calculateLunarReturn } from '@/lib/astrology/foundation/returns'
import type { ActiveSignal, ExtractorContext, SignalExtractor } from '../types'

/**
 * Solar Return (세성 회귀) + Lunar Return (월성 회귀) 추출기.
 *
 * Solar Return: 매년 태양이 출생 시 위치로 돌아오는 정확한 순간. 차트는 1년 유효.
 * Lunar Return: 매월 달이 출생 시 위치로 돌아오는 순간. 차트는 1달 유효.
 *
 * 활성 윈도우는 다음 회귀 직전까지. peak는 회귀 정점.
 * polarity는 0 (중립) — 회귀 차트의 ASC/MC sign이 톤을 결정하지만 별도 신호로 분리하지 않음.
 * "이 시기는 새 사이클 진입" 자체가 의미.
 */

const astroReturnExtractor: SignalExtractor = {
  source: 'astro',
  kind: ['solar-return', 'lunar-return'],
  async extract(ctx: ExtractorContext): Promise<ActiveSignal[]> {
    const { natal, range } = ctx
    const signals: ActiveSignal[] = []
    const start = new Date(range.start)
    const end = new Date(range.end)

    // ─── Solar Return — 매년 ───
    const startYear = start.getUTCFullYear()
    const endYear = end.getUTCFullYear()
    for (let year = startYear; year <= endYear; year++) {
      try {
        const sr = await calculateSolarReturn({ natal: natal.input, year })
        const exactDate = new Date(sr.exactReturnTime)
        const nextYearExact =
          year + 1 <= endYear + 1
            ? new Date(Date.UTC(year + 1, exactDate.getUTCMonth(), exactDate.getUTCDate()))
            : new Date(exactDate.getTime() + 365 * 86_400_000)

        signals.push({
          id: `astro.solar-return.${year}`,
          source: 'astro',
          kind: 'solar-return',
          name: `Solar Return ${year}`,
          korean: `${year}년 솔라리턴 — 올해 전체의 기본 톤을 여는 생일 차트예요 (ASC ${sr.ascendant.sign})`,
          english: `${year} Solar Return — the birthday chart that sets the whole year's baseline tone (ASC ${sr.ascendant.sign})`,
          themes: [],
          polarity: 0,
          layer: 'yearly',
          active: {
            start: exactDate.toISOString(),
            peak: exactDate.toISOString(),
            end: nextYearExact.toISOString(),
          },
          weight: 0.85,
          evidence: {
            module: 'astro-return',
            planets: ['Sun', sr.ascendant.name],
            detail: {
              returnType: 'solar',
              exactReturnTime: sr.exactReturnTime,
              ascSign: sr.ascendant.sign,
              mcSign: sr.mc.sign,
            },
          },
        })
      } catch {
        // ephe 미설치 등 — silent
      }
    }

    // ─── Lunar Return — 매월 ───
    let cursor = new Date(start)
    while (cursor <= end) {
      const year = cursor.getUTCFullYear()
      const month = cursor.getUTCMonth() + 1
      try {
        const lr = await calculateLunarReturn({ natal: natal.input, month, year })
        const exactDate = new Date(lr.exactReturnTime)
        const monthEnd = new Date(exactDate.getTime() + 28 * 86_400_000)
        signals.push({
          id: `astro.lunar-return.${year}-${month}`,
          source: 'astro',
          kind: 'lunar-return',
          name: `Lunar Return ${year}-${month}`,
          korean: `${year}년 ${month}월 루나리턴 — 이달의 감정·리듬이 새로 시작되는 28일 주기점이에요`,
          english: `${year}-${month} Lunar Return — the 28-day reset point where this month's emotional rhythm begins anew`,
          themes: [],
          polarity: 0,
          layer: 'monthly',
          active: {
            start: exactDate.toISOString(),
            peak: exactDate.toISOString(),
            end: monthEnd.toISOString(),
          },
          weight: 0.6,
          evidence: {
            module: 'astro-return',
            planets: ['Moon'],
            detail: {
              returnType: 'lunar',
              exactReturnTime: lr.exactReturnTime,
              ascSign: lr.ascendant.sign,
            },
          },
        })
      } catch {
        // silent
      }
      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))
    }

    return signals
  },
}

export default astroReturnExtractor
