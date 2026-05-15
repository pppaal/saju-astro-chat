import { dignityOf } from '@/lib/astrology/foundation/dignities'
import { calculateTransitChart } from '@/lib/astrology/foundation/transit'
import type { Chart } from '@/lib/astrology/foundation/types'
import type { ActiveSignal, ExtractorContext, SignalExtractor, Polarity, SignalLayer } from '../types'

/**
 * 행성 품위 (Essential Dignity) 추출기.
 *
 * 트랜짓 행성이 자기 도미사일/엑잘트/디트리먼트/폴 사인에 진입할 때 신호 생성.
 * 같은 행성이 같은 dignity 상태를 유지하는 동안 1개 신호로 묶음.
 *
 * 활성 윈도우: dignity 상태가 유지되는 기간 (사인 통과 = 행성 속도에 따라 며칠~몇 년).
 */

const DIGNITY_POLARITY: Record<string, Polarity> = {
  domicile:   2,
  exaltation: 3,
  detriment: -2,
  fall:      -3,
  peregrine:  0,   // 무권 — skip
}

const DIGNITY_LABEL: Record<string, string> = {
  domicile:   '도미사일 (자기 자리)',
  exaltation: '엑잘테이션 (고양)',
  detriment:  '디트리먼트 (반대 자리)',
  fall:       '폴 (추락)',
}

const SLOW = new Set(['Saturn', 'Uranus', 'Neptune', 'Pluto'])
const MEDIUM = new Set(['Jupiter', 'Mars'])

const astroDignityExtractor: SignalExtractor = {
  source: 'astro',
  kind: 'transit',   // 별도 SignalKind 없이 transit 카테고리에 묶음
  async extract(ctx: ExtractorContext): Promise<ActiveSignal[]> {
    const { natal, range, cache } = ctx
    const start = new Date(range.start)
    const end = new Date(range.end)

    // 매일 정오의 차트에서 각 행성의 dignity 추출 → 연속 구간 묶기
    type Hit = { iso: string; planet: string; sign: string; dignity: string }
    const hits: Hit[] = []
    for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
      const noonIso = new Date(t).toISOString().slice(0, 10) + 'T12:00:00'
      const cacheKey = `transit-chart:${noonIso}:${natal.astro.location.latitude}:${natal.astro.location.longitude}`
      let chart = cache.get<Chart>(cacheKey)
      if (!chart) {
        try {
          chart = await calculateTransitChart({
            iso: noonIso,
            latitude: natal.astro.location.latitude,
            longitude: natal.astro.location.longitude,
            timeZone: natal.astro.location.timeZone,
          })
          cache.set(cacheKey, chart)
        } catch {
          continue
        }
      }

      for (const p of chart.planets) {
        const sign = p.sign
        if (!sign) continue
        const d = dignityOf(p.name, sign)
        if (d === 'peregrine') continue
        hits.push({ iso: noonIso, planet: p.name, sign, dignity: d })
      }
    }

    // (planet, dignity, sign) 키로 연속 구간 묶기
    const byKey = new Map<string, Hit[]>()
    for (const h of hits) {
      const key = `${h.planet}|${h.dignity}|${h.sign}`
      const arr = byKey.get(key) ?? []
      arr.push(h)
      byKey.set(key, arr)
    }

    const signals: ActiveSignal[] = []
    for (const [key, group] of byKey) {
      group.sort((a, b) => a.iso.localeCompare(b.iso))
      const segments: Hit[][] = []
      let current: Hit[] = []
      for (const h of group) {
        if (current.length === 0) { current.push(h); continue }
        const gap = (new Date(h.iso).getTime() - new Date(current[current.length - 1].iso).getTime()) / 86_400_000
        if (gap <= 1.5) current.push(h)
        else { segments.push(current); current = [h] }
      }
      if (current.length) segments.push(current)

      for (const seg of segments) {
        const sample = seg[0]
        const startIso = seg[0].iso
        const endIso = seg[seg.length - 1].iso
        const peakIso = seg[Math.floor(seg.length / 2)].iso
        const polarity = DIGNITY_POLARITY[sample.dignity] ?? 0
        if (polarity === 0) continue

        signals.push({
          id: `astro.dignity.${key}.${startIso.slice(0, 10)}`,
          source: 'astro',
          kind: 'transit',
          name: `${sample.planet} ${DIGNITY_LABEL[sample.dignity]} in ${sample.sign}`,
          korean: `${sample.planet} ${DIGNITY_LABEL[sample.dignity]} (${sample.sign})`,
          themes: [],
          polarity,
          layer: planetLayer(sample.planet),
          active: { start: startIso, peak: peakIso, end: endIso },
          weight: 0.7,
          evidence: {
            module: 'astro-dignity',
            planets: [sample.planet],
            detail: {
              dignity: sample.dignity,
              sign: sample.sign,
              durationDays: seg.length,
            },
          },
        })
      }
    }

    return signals
  },
}

function planetLayer(planet: string): SignalLayer {
  if (SLOW.has(planet)) return 'yearly'
  if (MEDIUM.has(planet)) return 'monthly'
  return 'monthly'
}

export default astroDignityExtractor
