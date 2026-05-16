import { checkVoidOfCourse, getMoonPhase, getMoonPhaseName } from '@/lib/astrology/foundation/electional'
import type { Chart } from '@/lib/astrology/foundation/types'
import type { ActiveSignal, ExtractorContext, SignalExtractor, Polarity } from '../types'
import { getCachedTransitChart } from '../ephe-cache'

/**
 * 행성시 + 달 위상 (Moon Phase) + Void of Course 추출기.
 *
 * 단순화 접근:
 *  - 매일 정오 트랜짓 차트로 달 위상 분류 (new/waxing/full/waning)
 *  - 매일 VoC 여부
 *  - hourly granularity면 추가로 24시간 행성시 신호도 생성 (선택)
 *
 * 활성 윈도우:
 *  - Moon Phase: 그 단계 동안 (보통 3~4일)
 *  - VoC: 다음 sign 진입까지 (수시간)
 */

const PHASE_POLARITY: Record<string, -1 | 0 | 1> = {
  newMoon:        1,    // 시작에 좋음
  waxingCrescent: 1,
  firstQuarter:   0,
  waxingGibbous:  1,
  fullMoon:      -1,    // 절정·과부하·관계 폭발
  waningGibbous:  0,
  lastQuarter:    0,
  waningCrescent: 0,
}

const astroPlanetaryHourExtractor: SignalExtractor = {
  source: 'astro',
  kind: ['planetary-hour', 'void-of-course'],
  async extract(ctx: ExtractorContext): Promise<ActiveSignal[]> {
    const { natal, range, cache } = ctx
    const signals: ActiveSignal[] = []
    const start = new Date(range.start)
    const end = new Date(range.end)

    let lastPhase: string | null = null
    let phaseStartIso: string | null = null

    for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
      const noonIso = new Date(t).toISOString().slice(0, 10) + 'T12:00:00'
      let chart: Chart
      try {
        chart = await getCachedTransitChart({
          iso: noonIso,
          latitude: natal.astro.location.latitude,
          longitude: natal.astro.location.longitude,
          timeZone: natal.astro.location.timeZone,
          inMemoryCache: cache,
        })
      } catch {
        continue
      }

      const sun = chart.planets.find((p) => p.name === 'Sun')
      const moon = chart.planets.find((p) => p.name === 'Moon')
      if (!sun || !moon) continue

      const phase = getMoonPhase(sun.longitude, moon.longitude)
      const dayIso = new Date(t).toISOString().slice(0, 10)

      // Moon Phase 변경 감지
      if (lastPhase !== phase) {
        if (lastPhase && phaseStartIso) {
          // 이전 phase 마감 → signal 생성
          signals.push({
            id: `astro.moon-phase.${phaseStartIso.slice(0, 10)}.${lastPhase}`,
            source: 'astro',
            kind: 'planetary-hour',
            name: `달 위상: ${getMoonPhaseName(lastPhase as never)}`,
            korean: `달 위상 ${getMoonPhaseName(lastPhase as never)}`,
            themes: [],
            polarity: PHASE_POLARITY[lastPhase] ?? 0,
            layer: 'monthly',   // 한 위상이 약 3~4일이지만 "월" 사이클의 일부
            active: {
              start: phaseStartIso,
              peak: new Date((new Date(phaseStartIso).getTime() + t) / 2).toISOString(),
              end: new Date(t).toISOString(),
            },
            weight: 0.4,
            evidence: {
              module: 'astro-planetary-hour',
              planets: ['Moon', 'Sun'],
              detail: { phase: lastPhase },
            },
          })
        }
        lastPhase = phase
        phaseStartIso = new Date(t).toISOString()
      }

      // Void of Course
      const voc = checkVoidOfCourse(chart)
      if (voc.isVoid) {
        const hoursRemaining = voc.hoursRemaining ?? 12
        signals.push({
          id: `astro.voc.${dayIso}`,
          source: 'astro',
          kind: 'void-of-course',
          name: `Moon VoC (${voc.moonSign})`,
          korean: `달 공전 — ${voc.moonSign}에서 ${hoursRemaining}시간 남음`,
          themes: [],
          polarity: -1 as Polarity,
          layer: 'daily',
          active: {
            start: `${dayIso}T00:00:00.000Z`,
            peak: `${dayIso}T12:00:00.000Z`,
            end: new Date(new Date(`${dayIso}T00:00:00.000Z`).getTime() + hoursRemaining * 3600_000).toISOString(),
          },
          weight: 0.45,
          evidence: {
            module: 'astro-planetary-hour',
            planets: ['Moon'],
            detail: {
              moonSign: voc.moonSign,
              hoursRemaining: voc.hoursRemaining,
              description: voc.description,
            },
          },
        })
      }
    }

    return signals
  },
}

export default astroPlanetaryHourExtractor
