import { getCachedTransitChart } from '../../ephe-cache'
import type { Chart, House } from '@/lib/astrology/foundation/types'
import type { ActiveSignal, ExtractorContext, SignalExtractor, SignalLayer } from '../../types'
import { PLANET_KO } from '../../data/planetNames'
import { ordinalEn } from '../../ordinal'

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
 */

const TRACK_LAYER: Record<string, SignalLayer> = {
  Mars: 'monthly',
  Jupiter: 'monthly',
  Saturn: 'yearly',
  Uranus: 'yearly',
  Neptune: 'yearly',
  Pluto: 'yearly',
}
const SLOW = new Set(['Saturn', 'Uranus', 'Neptune', 'Pluto'])

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
          if (typeof ascLon === 'number' && angleDist(p.longitude, ascLon) <= 3) angle = 'ASC'
          else if (typeof mcLon === 'number' && angleDist(p.longitude, mcLon) <= 3) angle = 'MC'
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
