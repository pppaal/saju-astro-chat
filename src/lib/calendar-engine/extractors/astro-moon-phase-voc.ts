import {
  checkVoidOfCourse,
  getMoonPhase,
  getMoonPhaseName,
} from '@/lib/astrology/foundation/electional'
import type { Chart } from '@/lib/astrology/foundation/types'
import type { ActiveSignal, ExtractorContext, SignalExtractor, Polarity } from '../types'
import { getCachedTransitChart } from '../ephe-cache'
import { getDateComponentsInTimezone } from '@/lib/datetime/timezone'
import { noonPlanetPosition, rangeDays, shiftDay } from './shared/noonRuns'

/**
 * 달 위상(Moon Phase) + 보이드 오브 코스(Void of Course) 추출기.
 *
 * (구 astro-planetary-hour — 실제 행성시를 계산하지 않아 이름을 바로잡음.
 *  진짜 행성시(Chaldean order)는 'planetary-hour' kind 로 추후 별도 구현.)
 *
 * 매일 정오(natal TZ) 트랜짓 차트 1개로:
 *  - 달 위상 분류 (삭/상현/보름/하현) — 위상 변경 시점에 monthly 신호 (kind: moon-phase)
 *  - 그날 VoC 여부 — daily 신호 (kind: void-of-course; timing-void-of-course-moon 룰이 사용)
 *
 * 주의(알려진 한계):
 *  - 위상/VoC 는 정오 1회 샘플 — 시간 단위 정밀도 아님. VoC 의
 *    hoursRemaining 도 정오 스냅샷 기준 근사치.
 *  - PHASE_POLARITY 키가 snake_case getMoonPhase 결과(new_moon 등)와
 *    불일치(camelCase)라 달 위상 polarity 는 현재 항상 0(사실상 비활성).
 *    의도적으로 점수에 반영하려면 키를 맞춰야 함 — 지금은 VoC 만 실효.
 *
 * 활성 윈도우:
 *  - Moon Phase: 그 단계 동안 (보통 3~4일) — 첫 정오가 그 위상인 날 00:00 ~ 마지막 날
 *    23:59:59.999. 범위 가장자리의 위상은 천체력으로 범위 밖까지 이어 진짜 시작·끝을
 *    찾는다(엔진 감사 X1). 예전엔 범위 안에서 위상이 *바뀔 때만* 신호를 내, 1일 빌드엔
 *    위상 신호가 없고 월 빌드도 마지막 위상을 빠뜨렸다.
 *  - VoC: 그 날 00:00(명목) ~ 달의 다음 sign 진입. 진입 = 정오 차트의 *실제 instant* +
 *    hoursRemaining 을 현지 벽시계로 옮긴 떠 있는 키(YYYY-MM-DDTHH:mm:ssZ = 현지 시각).
 *    예전엔 hoursRemaining 을 `${day}T00:00Z` 에 더해, 정오에서 잰 시간을 자정에 붙인 셈이라
 *    모든 타임존에서 12시간 일찍 끝났다(엔진 감사 ASTRO-11 — 다음 날 아침에 걸치는 VoC 를
 *    놓쳤다). 진입이 다음 날로 넘어가면 그 날 셀에도 걸린다 — 그래서 범위 앞 며칠의 VoC 도
 *    범위에 닿으면 낸다(범위 불변, 엔진 감사 X1).
 */

/** 위상 run 을 범위 밖으로 찾을 때의 상한(일) — 한 위상은 길어야 ~5일. */
const PHASE_SCAN_CAP_DAYS = 10

/**
 * 범위 앞 VoC 를 찾는 일수 — 달이 한 sign 을 지나는 데 최대 ~2.7일(최저 속도 11.8°/일)이라
 * 정오 + hoursRemaining 이 3일 뒤를 넘지 못한다.
 */
const VOC_LOOKBACK_DAYS = 3
/** 범위 앞 VoC 사전 거름의 여유(ms) — 떠 있는 키와 실제 instant 의 서머타임 차 1시간 + 여유. */
const VOC_LOOKBACK_MARGIN_MS = 2 * 3600_000

/** UT instant → 캘린더의 떠 있는 현지 키(현지 벽시계를 'Z' 로 적은 ISO). */
function floatingLocalIso(instantMs: number, timeZone: string): string {
  const c = getDateComponentsInTimezone(new Date(instantMs), timeZone)
  const p2 = (n: number) => String(n).padStart(2, '0')
  return `${String(c.year).padStart(4, '0')}-${p2(c.month)}-${p2(c.day)}T${p2(c.hour)}:${p2(c.minute)}:${p2(c.second)}.000Z`
}

/** checkVoidOfCourse 와 같은 hoursRemaining — 정오 달 위치·속도만으로(차트 없이). */
function noonHoursToSignChange(dayIso: string, timeZone: string): number | null {
  const moon = noonPlanetPosition('Moon', dayIso, timeZone)
  if (!moon) return null
  const speed = moon.speed || 13
  const degreesToSignEnd = Math.floor(moon.longitude / 30) * 30 + 30 - moon.longitude
  return (degreesToSignEnd / speed) * 24
}

// 달 위상별 흐름 한 줄 (getMoonPhase snake_case 키와 일치).
const PHASE_MEANING: Record<string, string> = {
  new_moon: '새 주기의 씨앗을 심는 때 — 의도를 세우고 시작하기 좋아요',
  waxing_crescent: '싹이 돋아 쌓이기 시작하는 흐름 — 작게 추진해 보기 좋아요',
  first_quarter: '결정과 행동의 분기점 — 부딪쳐도 밀어붙일 때예요',
  waxing_gibbous: '무르익으며 차오르는 흐름 — 다듬고 키우기 좋아요',
  full_moon: '정점에서 또렷이 드러나는 때 — 결실·감정이 절정에 올라요',
  waning_gibbous: '거두고 나누는 흐름 — 정리·공유에 좋아요',
  last_quarter: '내려놓고 돌아보는 분기점 — 비우고 마무리할 때예요',
  waning_crescent: '쉬며 다음을 준비하는 때 — 휴식·성찰에 좋아요',
}
const PHASE_MEANING_EN: Record<string, string> = {
  new_moon: 'planting the seed of a new cycle — good for setting intentions and starting',
  waxing_crescent: 'sprouts begin to build — good for small pushes',
  first_quarter: 'a decision-and-action turning point — push through even against friction',
  waxing_gibbous: 'ripening and swelling — good for refining and growing',
  full_moon: 'clearly revealed at the peak — results and emotions crest',
  waning_gibbous: 'harvesting and sharing — good for tidying and giving back',
  last_quarter: 'a let-go-and-reflect turning point — empty out and wrap up',
  waning_crescent: 'resting and preparing what comes next — good for rest and reflection',
}

const PHASE_POLARITY: Record<string, -1 | 0 | 1> = {
  newMoon: 1, // 시작에 좋음
  waxingCrescent: 1,
  firstQuarter: 0,
  waxingGibbous: 1,
  fullMoon: -1, // 절정·과부하·관계 폭발
  waningGibbous: 0,
  lastQuarter: 0,
  waningCrescent: 0,
}

const astroMoonPhaseVocExtractor: SignalExtractor = {
  source: 'astro',
  kind: ['moon-phase', 'void-of-course'],
  async extract(ctx: ExtractorContext): Promise<ActiveSignal[]> {
    const { natal, range, cache } = ctx
    const signals: ActiveSignal[] = []
    const start = new Date(range.start)
    const end = new Date(range.end)
    const timeZone = natal.astro.location.timeZone

    // 날짜별 정오 위상 — 범위 안은 차트, 범위 밖은 같은 계산의 단일 행성 위치.
    const phaseByDay = new Map<string, string>()
    const phaseOn = (dayIso: string): string | null => {
      const known = phaseByDay.get(dayIso)
      if (known) return known
      const sun = noonPlanetPosition('Sun', dayIso, timeZone)
      const moon = noonPlanetPosition('Moon', dayIso, timeZone)
      if (!sun || !moon) return null
      const phase = getMoonPhase(sun.longitude, moon.longitude)
      phaseByDay.set(dayIso, phase)
      return phase
    }

    const chartFor = async (dayIso: string): Promise<Chart | null> => {
      try {
        return await getCachedTransitChart({
          iso: `${dayIso}T12:00:00`,
          latitude: natal.astro.location.latitude,
          longitude: natal.astro.location.longitude,
          timeZone,
          inMemoryCache: cache,
        })
      } catch {
        return null
      }
    }

    /** 그 날 정오 차트가 VoC 면 신호 — 끝 = 달의 다음 sign 진입(떠 있는 현지 키). */
    const vocSignal = (dayIso: string, chart: Chart): ActiveSignal | null => {
      const voc = checkVoidOfCourse(chart)
      if (!voc.isVoid) return null
      const hoursRemaining = voc.hoursRemaining ?? 12
      const ingressIso = chart.meta
        ? floatingLocalIso(
            (chart.meta.jdUT - 2440587.5) * 86_400_000 + hoursRemaining * 3600_000,
            timeZone
          )
        : new Date(Date.parse(`${dayIso}T12:00:00.000Z`) + hoursRemaining * 3600_000).toISOString()
      return {
        id: `astro.voc.${dayIso}`,
        source: 'astro',
        kind: 'void-of-course',
        name: `Moon VoC (${voc.moonSign})`,
        korean: `달이 다음 자리로 넘어가기 전 빈 구간(보이드) — 새 일을 벌이기보다 마무리·휴식에 좋아요 (${voc.moonSign}, ${hoursRemaining}시간)`,
        english: `Moon void-of-course before changing sign — better for wrapping up and resting than starting new ventures (${voc.moonSign}, ${hoursRemaining}h)`,
        polarity: -1 as Polarity,
        layer: 'daily',
        active: {
          start: `${dayIso}T00:00:00.000Z`,
          peak: `${dayIso}T12:00:00.000Z`,
          end: ingressIso,
        },
        weight: 0.45,
        evidence: {
          module: 'astro-moon-phase-voc',
          planets: ['Moon'],
          detail: {
            moonSign: voc.moonSign,
            hoursRemaining: voc.hoursRemaining,
            description: voc.description,
          },
        },
      }
    }

    for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
      const dayIso = new Date(t).toISOString().slice(0, 10)
      const chart = await chartFor(dayIso)
      if (!chart) continue

      const sun = chart.planets.find((p) => p.name === 'Sun')
      const moon = chart.planets.find((p) => p.name === 'Moon')
      if (!sun || !moon) continue

      phaseByDay.set(dayIso, getMoonPhase(sun.longitude, moon.longitude))

      // Void of Course
      const voc = vocSignal(dayIso, chart)
      if (voc) signals.push(voc)
    }

    // 범위 앞 며칠의 VoC 가 다음 sign 진입까지 범위 첫날에 걸치면 그것도 낸다 — 1일 빌드와
    // 월 빌드가 같은 날에 같은 VoC 를 갖도록(범위 불변). 정오 달 위치로 닿을 수 없는 날은
    // 차트를 만들지 않는다.
    const firstDay = new Date(start.getTime()).toISOString().slice(0, 10)
    for (let k = 1; k <= VOC_LOOKBACK_DAYS; k++) {
      const prev = shiftDay(firstDay, -k)
      const hours = noonHoursToSignChange(prev, timeZone)
      if (
        hours === null ||
        Date.parse(`${prev}T12:00:00.000Z`) + hours * 3600_000 + VOC_LOOKBACK_MARGIN_MS <
          start.getTime()
      )
        continue
      const chart = await chartFor(prev)
      const voc = chart ? vocSignal(prev, chart) : null
      if (voc && Date.parse(voc.active.end) >= start.getTime()) signals.push(voc)
    }

    // Moon Phase — 범위 안 날들의 위상 run 을 모아, 가장자리 run 은 범위 밖으로 잇는다.
    const days = rangeDays(range)
    let i = 0
    while (i < days.length) {
      const phase = phaseByDay.get(days[i])
      if (!phase) {
        i++
        continue
      }
      let j = i
      while (j + 1 < days.length && phaseByDay.get(days[j + 1]) === phase) j++
      // 진짜 첫날 — 범위 첫날이면 뒤로 같은 위상이 끝날 때까지.
      let firstDay = days[i]
      if (i === 0) {
        for (let k = 1; k <= PHASE_SCAN_CAP_DAYS; k++) {
          const prev = shiftDay(days[0], -k)
          if (phaseOn(prev) !== phase) break
          firstDay = prev
        }
      }
      // 다음 위상 첫날 — 범위 끝이면 앞으로 위상이 바뀌는 날까지.
      let nextDay = shiftDay(days[j], 1)
      if (j === days.length - 1) {
        for (let k = 1; k <= PHASE_SCAN_CAP_DAYS; k++) {
          nextDay = shiftDay(days[j], k)
          if (phaseOn(nextDay) !== phase) break
        }
      }
      // 끝은 다음 위상 첫날 직전(…T23:59:59.999Z) — 다음 날 셀에 걸리지 않게(하루 끝 관례).
      const startMs = Date.parse(`${firstDay}T00:00:00.000Z`)
      const endMs = Date.parse(`${nextDay}T00:00:00.000Z`) - 1
      signals.push({
        id: `astro.moon-phase.${firstDay}.${phase}`,
        source: 'astro',
        kind: 'moon-phase',
        name: `달 위상: ${getMoonPhaseName(phase as never)}`,
        korean: `${getMoonPhaseName(phase as never)} — ${PHASE_MEANING[phase] ?? '달 주기의 한 국면이에요'}`,
        english: `Moon phase — ${PHASE_MEANING_EN[phase] ?? 'a stage of the lunar cycle'}`,
        polarity: PHASE_POLARITY[phase] ?? 0,
        layer: 'monthly', // 한 위상이 약 3~4일이지만 "월" 사이클의 일부
        active: {
          start: new Date(startMs).toISOString(),
          peak: new Date((startMs + endMs) / 2).toISOString(),
          end: new Date(endMs).toISOString(),
        },
        weight: 0.4,
        evidence: {
          module: 'astro-moon-phase-voc',
          planets: ['Moon', 'Sun'],
          detail: { phase },
        },
      })
      i = j + 1
    }

    return signals
  },
}

export default astroMoonPhaseVocExtractor
