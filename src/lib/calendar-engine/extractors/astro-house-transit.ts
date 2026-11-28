import { getCachedTransitChart } from '../ephe-cache'
import type { Chart, House } from '@/lib/astrology/foundation/types'
import type { ActiveSignal, ExtractorContext, SignalExtractor, SignalLayer } from '../types'
import { PLANET_KO } from '../data/planetNames'
import { ordinalEn } from '../ordinal'
import { extendRun, maxDailyMotion, noonPlanetPosition, rangeDays } from './shared/noonRuns'

/**
 * 하우스 오버레이 + ASC/MC 컨택 추출기.
 *
 * 트랜짓 행성이 *본명 하우스* 어디를 지나는지 ("화성이 7번째 집 통과")와,
 * 느린 행성이 ASC/MC 에 컨정션하는 시점을 잡는다. 기존 astro-transit 은
 * 행성↔행성 각만 보고 하우스 overlay 가 없어 점성 깊이가 얕았음.
 *
 * polarity 0 (어느 영역이 활성화되는지 = 컨텍스트, 길흉 아님). 점수엔
 * 영향 안 주고 narrative 로만 노출 (signalKinds 'house-transit'/'angle-contact'
 * 룰이 evidence.detail.line 을 그대로 출력).
 *
 * 추적 대상: Mars(월간) + Jupiter/Saturn/Uranus/Neptune/Pluto(연간) — 빠른
 * 행성은 하우스를 며칠 만에 지나 노이즈라 제외.
 *
 * 창(엔진 감사 X1 · 재감사 CC-7): 그 하우스(또는 ASC/MC 3° 안)에 든 *연속 정오 전체*.
 * 범위 가장자리에 닿은 구간은 천체력으로 범위 밖까지 이어 진짜 진입·이탈 정오를 찾는다
 * (shared/noonRuns — 트랜짓·품위 추출기와 같은 규칙). 예전엔 범위에서 잘려, 같은 날의
 * 신호·교차 id 와 창이 1일 빌드와 월 빌드에서 달랐다(월 빌드도 매달 1일로 잘렸다).
 */

/**
 * 하우스·앵글 run 을 범위 밖으로 잇는 상한(일, 한쪽) — 느린 행성은 넓은 하우스에 수십 년
 * 머문다(명왕성 ~30년). 건너뛰기(남은 각도 / 최대 이동) 덕에 평가는 수십 번이면 끝난다.
 */
const HOUSE_RUN_CAP_DAYS = 60 * 366

const TRACK_LAYER: Record<string, SignalLayer> = {
  Mars: 'monthly',
  Jupiter: 'monthly',
  Saturn: 'yearly',
  Uranus: 'yearly',
  Neptune: 'yearly',
  Pluto: 'yearly',
}
const SLOW = new Set(['Saturn', 'Uranus', 'Neptune', 'Pluto'])
/** ASC/MC 컨택 오브(°). */
const ANGLE_ORB_DEG = 3

// PLANET_KO 는 정본(data/planetNames) 재사용 — 위 import. 로컬 복사본 제거.
const PLANET_EN: Record<string, string> = {
  Mars: 'Mars',
  Jupiter: 'Jupiter',
  Saturn: 'Saturn',
  Uranus: 'Uranus',
  Neptune: 'Neptune',
  Pluto: 'Pluto',
}

const HOUSE_AREA_KO: Record<number, string> = {
  1: '자기·정체성·몸',
  2: '재물·소유·가치관',
  3: '소통·학습·가까운 이동',
  4: '가정·뿌리·내면 기반',
  5: '연애·창작·즐거움',
  6: '일·건강·일상 루틴',
  7: '관계·파트너·계약',
  8: '깊은 변화·공동 재물',
  9: '배움·여행·신념',
  10: '직업·사회적 위치·평판',
  11: '동료·네트워크·목표',
  12: '내면 정리·휴식·마무리',
}
const HOUSE_AREA_EN: Record<number, string> = {
  1: 'self, identity, body',
  2: 'money, possessions, values',
  3: 'communication, learning, local travel',
  4: 'home, roots, inner base',
  5: 'romance, creativity, play',
  6: 'work, health, daily routine',
  7: 'relationships, partners, contracts',
  8: 'deep change, shared resources',
  9: 'study, travel, beliefs',
  10: 'career, public standing, reputation',
  11: 'friends, networks, goals',
  12: 'inner work, rest, closure',
}

function inArc(x: number, start: number, end: number): boolean {
  // start..end (전진, mod 360) 구간에 x 가 들어가나
  if (start <= end) return x >= start && x < end
  return x >= start || x < end
}

function houseOf(longitude: number, houses: House[]): number {
  const sorted = [...houses].sort((a, b) => a.index - b.index)
  if (sorted.length < 12) return 0
  for (let i = 0; i < 12; i++) {
    const cusp = sorted[i].cusp
    const next = sorted[(i + 1) % 12].cusp
    if (inArc(((longitude % 360) + 360) % 360, cusp, next)) return sorted[i].index
  }
  return 0
}

/** longitude 에서 그 하우스의 두 커스프까지 남은 각도(°) 중 작은 쪽 — 그 안에선 하우스가 못 바뀐다. */
function houseMargin(longitude: number, house: number, houses: House[]): number {
  const sorted = [...houses].sort((a, b) => a.index - b.index)
  const i = sorted.findIndex((h) => h.index === house)
  if (i < 0 || sorted.length < 12) return 0
  const lon = ((longitude % 360) + 360) % 360
  const toStart = (((lon - sorted[i].cusp) % 360) + 360) % 360
  const toEnd = (((sorted[(i + 1) % 12].cusp - lon) % 360) + 360) % 360
  return Math.min(toStart, toEnd)
}

function angleDist(a: number, b: number): number {
  let d = Math.abs(((a - b) % 360) + 360) % 360
  if (d > 180) d = 360 - d
  return d
}

const astroHouseTransitExtractor: SignalExtractor = {
  source: 'astro',
  kind: ['house-transit', 'angle-contact'],
  async extract(ctx: ExtractorContext): Promise<ActiveSignal[]> {
    const { natal, range, cache } = ctx
    const natalChart = natal.astro.chart
    const houses = natalChart.houses
    if (!houses || houses.length < 12) return []
    const ascLon = natalChart.ascendant?.longitude
    const mcLon = natalChart.mc?.longitude

    const start = new Date(range.start)
    const end = new Date(range.end)

    // planet → 연속 구간 추적 (house overlay)
    type Seg = { planet: string; house: number; startIso: string; endIso: string }
    const open = new Map<string, Seg>()
    const houseSegs: Seg[] = []
    // planet → ASC/MC 컨택 구간 (angle-contact)
    type AngleSeg = { planet: string; angle: 'ASC' | 'MC'; startIso: string; endIso: string }
    const openAngle = new Map<string, AngleSeg>()
    const angleSegs: AngleSeg[] = []

    for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
      // chartIso: 차트 계산용(location timeZone wall-clock). tz suffix 금지.
      const chartIso = new Date(t).toISOString().slice(0, 10) + 'T12:00:00'
      // iso: seg startIso/endIso 저장용 — 동일 wall-clock + 명시적 `Z` 로 downstream
      // new Date() 파싱을 서버 TZ 무관 UTC 정오로 고정 (현지 날짜 버킷은 slice 로 유지).
      const iso = chartIso + '.000Z'
      let chart: Chart
      try {
        chart = await getCachedTransitChart({
          iso: chartIso,
          latitude: natal.astro.location.latitude,
          longitude: natal.astro.location.longitude,
          timeZone: natal.astro.location.timeZone,
          inMemoryCache: cache,
        })
      } catch {
        continue
      }
      for (const planet of Object.keys(TRACK_LAYER)) {
        const p = chart.planets.find((x) => x.name === planet)
        if (!p) continue
        // house overlay
        const h = houseOf(p.longitude, houses)
        if (h >= 1) {
          const cur = open.get(planet)
          if (cur && cur.house === h) cur.endIso = iso
          else {
            if (cur) houseSegs.push(cur)
            open.set(planet, { planet, house: h, startIso: iso, endIso: iso })
          }
        }
        // ASC/MC 컨택 (느린 행성만, orb ≤ 3°)
        if (SLOW.has(planet)) {
          let angle: 'ASC' | 'MC' | null = null
          if (typeof ascLon === 'number' && angleDist(p.longitude, ascLon) <= ANGLE_ORB_DEG)
            angle = 'ASC'
          else if (typeof mcLon === 'number' && angleDist(p.longitude, mcLon) <= ANGLE_ORB_DEG)
            angle = 'MC'
          const curA = openAngle.get(planet)
          if (angle) {
            if (curA && curA.angle === angle) curA.endIso = iso
            else {
              if (curA) angleSegs.push(curA)
              openAngle.set(planet, { planet, angle, startIso: iso, endIso: iso })
            }
          } else if (curA) {
            angleSegs.push(curA)
            openAngle.delete(planet)
          }
        }
      }
    }
    for (const s of open.values()) houseSegs.push(s)
    for (const s of openAngle.values()) angleSegs.push(s)

    // 범위 가장자리에 닿은 run 을 범위 밖까지 잇는다 — 같은 계산(noonPlanetPosition 은
    // calculateTransitChart 와 같은 JD·플래그)이라 범위 안 판정과 값이 같다.
    const days = rangeDays(range)
    const firstDay = days[0]
    const lastDay = days[days.length - 1]
    const timeZone = natal.astro.location.timeZone
    const angleOf = (lon: number): 'ASC' | 'MC' | null =>
      typeof ascLon === 'number' && angleDist(lon, ascLon) <= ANGLE_ORB_DEG
        ? 'ASC'
        : typeof mcLon === 'number' && angleDist(lon, mcLon) <= ANGLE_ORB_DEG
          ? 'MC'
          : null
    const extend = (
      planet: string,
      seg: { startIso: string; endIso: string },
      marginAt: (lon: number) => number | null
    ) => {
      const sampleOn = (day: string) => {
        const pos = noonPlanetPosition(planet, day, timeZone)
        if (!pos) return null
        const margin = marginAt(pos.longitude)
        return margin === null ? null : { day, value: margin }
      }
      const run = {
        vmax: maxDailyMotion(planet),
        sampleOn,
        marginOf: (x: { value: number }) => x.value,
      }
      const startDay = seg.startIso.slice(0, 10)
      const endDay = seg.endIso.slice(0, 10)
      if (startDay === firstDay) {
        const anchor = sampleOn(startDay)
        if (anchor) {
          const edge = extendRun({ ...run, anchor, direction: -1, capDays: HOUSE_RUN_CAP_DAYS })
          seg.startIso = `${edge.edgeDay}T12:00:00.000Z`
        }
      }
      if (endDay === lastDay) {
        const anchor = sampleOn(endDay)
        if (anchor) {
          const edge = extendRun({ ...run, anchor, direction: 1, capDays: HOUSE_RUN_CAP_DAYS })
          seg.endIso = `${edge.edgeDay}T12:00:00.000Z`
        }
      }
    }
    for (const seg of houseSegs) {
      extend(seg.planet, seg, (lon) =>
        houseOf(lon, houses) === seg.house ? houseMargin(lon, seg.house, houses) : null
      )
    }
    for (const seg of angleSegs) {
      const angleLon = seg.angle === 'ASC' ? ascLon : mcLon
      if (typeof angleLon !== 'number') continue
      extend(seg.planet, seg, (lon) =>
        angleOf(lon) === seg.angle ? ANGLE_ORB_DEG - angleDist(lon, angleLon) : null
      )
    }

    const signals: ActiveSignal[] = []

    for (const seg of houseSegs) {
      const layer = TRACK_LAYER[seg.planet]
      const areaKo = HOUSE_AREA_KO[seg.house] ?? ''
      const areaEn = HOUSE_AREA_EN[seg.house] ?? ''
      const lineKo = `${PLANET_KO[seg.planet]}이 본명 ${seg.house}번째 집(${areaKo})을 지나는 시기 — 이 영역에 자연스레 관심·일이 몰려요.`
      const lineEn = `${PLANET_EN[seg.planet]} is transiting your natal ${ordinalEn(seg.house)} house (${areaEn}) — attention and events naturally cluster here.`
      signals.push({
        id: `astro.house-transit.${seg.planet}.${seg.house}.${seg.startIso.slice(0, 10)}`,
        source: 'astro',
        kind: 'house-transit',
        name: `${seg.planet} in ${seg.house}H`,
        korean: lineKo,
        english: lineEn,
        polarity: 0, // 컨텍스트 (영역 활성) — 길흉 아님, 점수 미반영
        layer,
        active: {
          start: `${seg.startIso.slice(0, 10)}T00:00:00.000Z`,
          peak: seg.startIso,
          end: `${seg.endIso.slice(0, 10)}T23:59:59.000Z`,
        },
        weight: SLOW.has(seg.planet) ? 0.7 : 0.5,
        evidence: {
          module: 'astro-house-transit',
          planets: [seg.planet],
          houses: [seg.house],
          detail: { house: seg.house, areaKo, areaEn, lineKo, lineEn },
        },
      })
    }

    for (const seg of angleSegs) {
      const angleKo = seg.angle === 'ASC' ? '상승점(ASC·정체성·인상)' : '천정(MC·직업·평판)'
      const angleEn =
        seg.angle === 'ASC' ? 'Ascendant (identity, image)' : 'Midheaven (career, reputation)'
      const lineKo = `${PLANET_KO[seg.planet]}이 ${angleKo}에 닿는 드문 시기 — 인생의 ${seg.angle === 'ASC' ? '자기상·시작점' : '사회적 방향·위치'}이 새로 세워지는 전환.`
      const lineEn = `${PLANET_EN[seg.planet]} contacts your ${angleEn} — a rare pivot that resets your ${seg.angle === 'ASC' ? 'self-image and starting point' : 'public direction and standing'}.`
      signals.push({
        id: `astro.angle-contact.${seg.planet}.${seg.angle}.${seg.startIso.slice(0, 10)}`,
        source: 'astro',
        kind: 'angle-contact',
        name: `${seg.planet} ☌ ${seg.angle}`,
        korean: lineKo,
        english: lineEn,
        polarity: 0,
        layer: 'yearly',
        active: {
          start: `${seg.startIso.slice(0, 10)}T00:00:00.000Z`,
          peak: seg.startIso,
          end: `${seg.endIso.slice(0, 10)}T23:59:59.000Z`,
        },
        weight: 0.85,
        evidence: {
          module: 'astro-house-transit',
          planets: [seg.planet],
          detail: { angle: seg.angle, lineKo, lineEn },
        },
      })
    }

    return signals
  },
}

export default astroHouseTransitExtractor
