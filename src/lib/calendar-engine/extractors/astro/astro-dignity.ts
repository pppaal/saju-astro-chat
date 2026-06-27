import {
  dignityOf,
  triplicityOf,
  termOf,
  faceOf,
  dignityTiers,
  dignityScore,
} from '@/lib/astrology/foundation/dignities'
import type { Chart, PlanetBase } from '@/lib/astrology/foundation/types'
import type {
  ActiveSignal,
  ExtractorContext,
  SignalExtractor,
  Polarity,
  SignalLayer,
} from '../../types'
import { getCachedTransitChart } from '../../ephe-cache'
import { PLANET_KO } from '../../data/planetNames'
import { SIGN_KO } from '@/lib/astrology/signLabels'

/** 영문 행성/별자리 → 한글 (없으면 원문). ko 라벨에 영어가 새지 않게. */
const koPlanet = (p: string): string => PLANET_KO[p] ?? p
const koSign = (s: string): string => SIGN_KO[s] ?? s

/**
 * 행성 품위 (Essential Dignity) 추출기 — 5-tier (Hellenistic).
 *
 * 기존 4-tier (도미사일/엑잘트/디트리먼트/폴) 위에 헬레니즘 minor dignity
 * (Triplicity / Term / Face) 를 추가했다. 트랜짓 행성이 자기 dignity 사인/구간
 * 에 들어갈 때 신호를 만들고, 같은 행성·dignity·sign·tier 가 유지되는 동안
 * 한 개 신호로 묶는다.
 *
 * polarity 매핑:
 *   major:  domicile +2 / exaltation +3 / detriment -2 / fall -3
 *   minor:  triplicity / term / face 매칭 시 +1 (weight 로 강도 조절:
 *           triplicity 0.5 / term 0.3 / face 0.2)
 *
 * 본명 행성(natal planets)도 한 번 평가해 본명 5-tier Almuten 스냅샷 신호로
 * 같이 내보낸다 (layer: 'yearly', 활성 윈도우 = 전체 range).
 */

const DIGNITY_POLARITY: Record<string, Polarity> = {
  domicile: 2,
  exaltation: 3,
  detriment: -2,
  fall: -3,
  peregrine: 0, // 무권 — skip
}

const DIGNITY_LABEL: Record<string, string> = {
  domicile: '도미사일 (자기 자리)',
  exaltation: '엑잘테이션 (고양)',
  detriment: '디트리먼트 (반대 자리)',
  fall: '폴 (추락)',
}

const DIGNITY_LABEL_EN: Record<string, string> = {
  domicile: 'Domicile (home sign)',
  exaltation: 'Exaltation',
  detriment: 'Detriment',
  fall: 'Fall',
}

const DIGNITY_FLOW_EN: Record<string, string> = {
  domicile: 'operates at full natural strength',
  exaltation: 'is honoured and elevated — at its best',
  detriment: 'works against its nature — strained',
  fall: 'is weakened and out of place',
}

const SLOW = new Set(['Saturn', 'Uranus', 'Neptune', 'Pluto'])
const MEDIUM = new Set(['Jupiter', 'Mars'])

// Hellenistic 정통: 외행성 + non-traditional points 는 essential dignity 보유 X.
// 이 추출기는 traditional 7행성에 한해서만 dignity 신호를 emit.
const TRADITIONAL_PLANETS = new Set([
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
])
const DIGNITY_BLOCKED = new Set([
  'Uranus',
  'Neptune',
  'Pluto',
  'True Node',
  'Mean Node',
  'Chiron',
  'Lilith',
])

const astroDignityExtractor: SignalExtractor = {
  source: 'astro',
  kind: 'transit', // 별도 SignalKind 없이 transit 카테고리에 묶음
  async extract(ctx: ExtractorContext): Promise<ActiveSignal[]> {
    const { natal, range, cache } = ctx
    const start = new Date(range.start)
    const end = new Date(range.end)
    const sect = natal.astro.sect

    // 매일 정오의 차트에서 각 행성의 dignity 추출 → 연속 구간 묶기
    type Hit = {
      iso: string
      planet: string
      sign: string
      degree: number
      dignity: string
      // minor tier matches (planet IS the ruler of that minor tier here)
      triplicity: boolean
      term: boolean
      face: boolean
    }
    const hits: Hit[] = []
    for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
      // noonIso: 차트 계산용(location timeZone wall-clock). tz suffix 금지.
      const noonIso = new Date(t).toISOString().slice(0, 10) + 'T12:00:00'
      // windowIso: hit/active window 저장용 — 동일 wall-clock + 명시적 `Z` 로
      // downstream new Date() 파싱을 서버 TZ 무관 UTC 정오로 고정 (현지 날짜 버킷 유지).
      const windowIso = noonIso + '.000Z'
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

      for (const p of chart.planets) {
        const sign = p.sign
        if (!sign) continue
        // Hellenistic 정통: 외행성·노드·Chiron·Lilith 는 dignity 미부여 → skip.
        // 단 transit/position 자체는 다른 모듈에서 활용 유지 (여기서만 emit 차단).
        if (DIGNITY_BLOCKED.has(p.name)) continue
        if (!TRADITIONAL_PLANETS.has(p.name)) continue
        const d = dignityOf(p.name, sign)
        const trip = triplicityOf(p.name, sign, sect === 'day') !== null
        const term = termOf(p.name, sign, p.degree) !== null
        const face = faceOf(p.name, sign, p.degree) !== null
        // peregrine + no minor tier match → skip (truly no rulership)
        if (d === 'peregrine' && !trip && !term && !face) continue
        hits.push({
          iso: windowIso,
          planet: p.name,
          sign,
          degree: p.degree,
          dignity: d,
          triplicity: trip,
          term,
          face,
        })
      }
    }

    // (planet, dignity, sign) 키로 연속 구간 묶기 — major dignity 신호
    const byKey = new Map<string, Hit[]>()
    for (const h of hits) {
      if (h.dignity === 'peregrine') continue
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
        if (current.length === 0) {
          current.push(h)
          continue
        }
        const gap =
          (new Date(h.iso).getTime() - new Date(current[current.length - 1].iso).getTime()) /
          86_400_000
        if (gap <= 1.5) current.push(h)
        else {
          segments.push(current)
          current = [h]
        }
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
          korean: `${koPlanet(sample.planet)} ${DIGNITY_LABEL[sample.dignity]} (${koSign(sample.sign)})`,
          english: `${sample.planet} in ${DIGNITY_LABEL_EN[sample.dignity] ?? sample.dignity} (${sample.sign}) — ${DIGNITY_FLOW_EN[sample.dignity] ?? ''}`,
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

    // ── Minor dignity signals (triplicity / term / face) ──
    // 같은 (planet, sign, tier) 가 연속되는 구간을 한 신호로 묶음.
    for (const tier of ['triplicity', 'term', 'face'] as const) {
      const tierKey = new Map<string, Hit[]>()
      for (const h of hits) {
        if (!h[tier]) continue
        const key = `${h.planet}|${tier}|${h.sign}`
        const arr = tierKey.get(key) ?? []
        arr.push(h)
        tierKey.set(key, arr)
      }
      for (const [key, group] of tierKey) {
        group.sort((a, b) => a.iso.localeCompare(b.iso))
        const segments: Hit[][] = []
        let current: Hit[] = []
        for (const h of group) {
          if (current.length === 0) {
            current.push(h)
            continue
          }
          const gap =
            (new Date(h.iso).getTime() - new Date(current[current.length - 1].iso).getTime()) /
            86_400_000
          if (gap <= 1.5) current.push(h)
          else {
            segments.push(current)
            current = [h]
          }
        }
        if (current.length) segments.push(current)

        for (const seg of segments) {
          const sample = seg[0]
          const startIso = seg[0].iso
          const endIso = seg[seg.length - 1].iso
          const peakIso = seg[Math.floor(seg.length / 2)].iso
          const polarity: Polarity = 1 // minor positive — +1 step (실 값은 weight 로 조절)
          const weight = tier === 'triplicity' ? 0.5 : tier === 'term' ? 0.3 : 0.2
          const label =
            tier === 'triplicity'
              ? '트리플리시티 (Triplicity)'
              : tier === 'term'
                ? '텀 (Term/Bound)'
                : '페이스 (Face/Decan)'
          const labelEn =
            tier === 'triplicity' ? 'Triplicity' : tier === 'term' ? 'Term/Bound' : 'Face/Decan'

          signals.push({
            id: `astro.dignity.${key}.${startIso.slice(0, 10)}`,
            source: 'astro',
            kind: 'transit',
            name: `${sample.planet} ${label} in ${sample.sign}`,
            korean: `${koPlanet(sample.planet)} ${label} (${koSign(sample.sign)})`,
            english: `${sample.planet} in minor dignity ${labelEn} (${sample.sign}) — a mild supportive placement`,
            polarity,
            layer: planetLayer(sample.planet),
            active: { start: startIso, peak: peakIso, end: endIso },
            weight,
            evidence: {
              module: 'astro-dignity',
              planets: [sample.planet],
              detail: {
                dignity: tier,
                sign: sample.sign,
                durationDays: seg.length,
              },
            },
          })
        }
      }
    }

    // ── Natal Almuten snapshot — 본명 5-tier 합산. 한 신호로 range 전체에 깔리는
    //    배경 신호. 본명 행성이 자기 사인의 minor dignity ruler 인 경우만 노출.
    const natalPlanets = natal.astro.chart.planets ?? []
    for (const p of natalPlanets) {
      if (!p.sign) continue
      // Hellenistic 정통: 외행성·노드·키론·릴리스 — natal Almuten 도 emit 안 함.
      if (DIGNITY_BLOCKED.has(p.name)) continue
      if (!TRADITIONAL_PLANETS.has(p.name)) continue
      const tiers = dignityTiers(p.name, p.sign, p.degree, sect)
      const matchedMinor: string[] = []
      if (tiers.triplicity) matchedMinor.push('triplicity')
      if (tiers.term) matchedMinor.push('term')
      if (tiers.face) matchedMinor.push('face')
      if (matchedMinor.length === 0) continue

      const score = dignityScore(tiers)
      // polarity 매핑: 점수 부호 → ±1/±2 step
      const polarity: Polarity =
        score >= 1.5 ? 2 : score >= 0.5 ? 1 : score <= -1.5 ? -2 : score <= -0.5 ? -1 : 0
      if (polarity === 0) continue

      signals.push({
        id: `astro.dignity.natal-almuten.${p.name}.${p.sign}.${matchedMinor.join('-')}`,
        source: 'astro',
        kind: 'transit',
        name: `Natal ${p.name} ${matchedMinor.join('+')} in ${p.sign}`,
        korean: `본명 ${koPlanet(p.name)} 5-tier 디그니티 (${koSign(p.sign)})`,
        polarity,
        layer: 'yearly',
        active: { start: range.start, peak: range.start, end: range.end },
        weight: 0.4,
        evidence: {
          module: 'astro-dignity',
          planets: [p.name],
          detail: {
            dignity: 'natal-almuten',
            sign: p.sign,
            degree: p.degree,
            tiers,
            score,
          },
        },
      })
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

// Re-export type for callers that want to inspect natal planets list
export type { PlanetBase }
