import { getSwisseph } from '@/lib/astrology/foundation/ephe'
import { isoToJD, natalToJD, extractSwissLongitude } from '@/lib/astrology/foundation/shared'
import { angleDiff } from '@/lib/astrology/foundation/utils'
import type {
  ActiveSignal,
  ExtractorContext,
  Polarity,
  SignalExtractor,
  SignalLayer,
} from '../types'

/**
 * Heliocentric (일심 점성) 추출기.
 *
 * 지구 중심(geocentric)이 아니라 태양 중심(heliocentric) 좌표에서 본 행성 위치로
 * 어스펙트를 계산. 점성학적으로 "인생 사명·궤적" 의 배경 톤 — 영혼 차원의
 * 결과 흐름. Sun/Moon 은 의미상 제외 (Sun=중심, Moon=지구 위성).
 *
 * 적용 행성: Mercury, Venus, Mars, Jupiter, Saturn (inner 5개).
 *   - 외행성(Uranus/Neptune/Pluto) 은 본 추출기에서 제외 — 성능 + 헬리오 변화율
 *     매우 느려 캘린더 시간 스케일에 의미 적음.
 *
 * 메이저 4 aspect (conjunction 0°, square 90°, trine 120°, opposition 180°) 만,
 * orb ≤ 1.5°.
 *
 * 성능:
 *   - 본명 5 행성 helio = 1회 호출 (cache).
 *   - range 안은 5일 down-sample (헬리오 변화 느림 — Mercury 88일/궤도라
 *     일일 평균 ~4° 이지만 외행성은 일 단위 0.1° 미만; 5일 sample 이 메이저
 *     aspect orb 1.5° 잡기에 충분).
 *   - 결과: 1년(365일) → ~73 sample × 5 transit 행성 = 365 호출. 본명 +5.
 *   - 기존 transit extractor (매일 정오 10 행성 = 3650 호출) 대비 1/10 비용.
 *
 * Polarity (spec):
 *   conjunction +1, trine +2, opposition -1, square -1.
 *
 * Layer:
 *   Mercury 가 transit 일 때는 빠른 변화라 'daily';
 *   나머지는 'monthly' (배경 톤).
 *
 * 캐싱 키:
 *   helio:natal:{yyyy-mm-dd}:{hh-mm}      → Record<planet, longitude>
 *   helio:transit:{yyyy-mm-dd}            → Record<planet, longitude>
 */

const HELIO_PLANETS = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'] as const
type HelioPlanet = (typeof HELIO_PLANETS)[number]

type AspectName = 'conjunction' | 'square' | 'trine' | 'opposition'

const ASPECT_DEFS: Array<{ name: AspectName; angle: number }> = [
  { name: 'conjunction', angle: 0 },
  { name: 'square', angle: 90 },
  { name: 'trine', angle: 120 },
  { name: 'opposition', angle: 180 },
]

const ORB_DEG = 1.5

// down-sample 간격(일) — 5 일이면 1년 365일 → 73 회 호출.
const SAMPLE_STEP_DAYS = 5

const ASPECT_POLARITY: Record<AspectName, Polarity> = {
  conjunction: 1,
  trine: 2,
  opposition: -1,
  square: -1,
}

const ASPECT_SYMBOL: Record<AspectName, string> = {
  conjunction: '☌',
  square: '□',
  trine: '△',
  opposition: '☍',
}

const ASPECT_KOREAN: Record<AspectName, string> = {
  conjunction: '합',
  square: '스퀘어',
  trine: '트라인',
  opposition: '오포지션',
}

const PLANET_KOREAN: Record<HelioPlanet, string> = {
  Mercury: '수성',
  Venus: '금성',
  Mars: '화성',
  Jupiter: '목성',
  Saturn: '토성',
}

/** Swiss Ephemeris heliocentric flag (SEFLG_HELCTR = 8). */
function getHelioFlags(): number {
  const sw = getSwisseph()
  // SEFLG_HELCTR 가 local d.ts 에 없어 cast.
  const HELCTR = (sw as unknown as { SEFLG_HELCTR?: number }).SEFLG_HELCTR ?? 8
  return sw.SEFLG_SPEED | HELCTR
}

/** 5 행성의 heliocentric 황경(°) 계산. cache 키로 1회만 호출. */
function calcHelioLongitudes(jdUT: number): Record<HelioPlanet, number> {
  const sw = getSwisseph()
  const flags = getHelioFlags()
  const planetIds: Record<HelioPlanet, number> = {
    Mercury: sw.SE_MERCURY,
    Venus: sw.SE_VENUS,
    Mars: sw.SE_MARS,
    Jupiter: sw.SE_JUPITER,
    Saturn: sw.SE_SATURN,
  }
  const out = {} as Record<HelioPlanet, number>
  for (const name of HELIO_PLANETS) {
    const res = sw.swe_calc_ut(jdUT, planetIds[name], flags)
    if ('error' in res) {
      throw new Error(`swe_calc_ut helio(${name}): ${res.error}`)
    }
    out[name] = extractSwissLongitude(res as unknown as Record<string, unknown>)
  }
  return out
}

/** orb 계산 — angleDiff 가 항상 0~180 이라 target 과 직접 차이만 보면 됨. */
function aspectOrb(lonA: number, lonB: number, targetAngle: number): number {
  const diff = angleDiff(lonA, lonB)
  return Math.abs(diff - targetAngle)
}

const astroHeliocentricExtractor: SignalExtractor = {
  source: 'astro',
  kind: 'heliocentric',
  extract(ctx: ExtractorContext): ActiveSignal[] {
    const { natal, range, cache } = ctx
    const signals: ActiveSignal[] = []

    const start = new Date(range.start)
    const end = new Date(range.end)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return signals

    // ─── 본명 helio 위치 (1회 호출, 캐시) ───
    const natalKey =
      `helio:natal:${natal.input.year}-${natal.input.month}-${natal.input.date}` +
      `:${natal.input.hour}-${natal.input.minute}`
    let natalHelio = cache.get<Record<HelioPlanet, number>>(natalKey)
    if (!natalHelio) {
      try {
        const natalJD = natalToJD(natal.input)
        natalHelio = calcHelioLongitudes(natalJD)
        cache.set(natalKey, natalHelio)
      } catch {
        return [] // Swiss Eph 실패 시 조용히 스킵
      }
    }

    // ─── range 안 5일 간격 transit helio 위치 + hit 수집 ───
    type Hit = {
      iso: string
      transitPlanet: HelioPlanet
      natalPlanet: HelioPlanet
      aspect: AspectName
      orb: number
      transitLon: number
      natalLon: number
    }
    const hitsByKey = new Map<string, Hit[]>()

    const tz = natal.astro.location.timeZone
    const stepMs = SAMPLE_STEP_DAYS * 86_400_000
    for (let t = start.getTime(); t <= end.getTime(); t += stepMs) {
      const dayIso = new Date(t).toISOString().slice(0, 10)
      const noonIso = `${dayIso}T12:00:00`
      const transitKey = `helio:transit:${dayIso}`
      let transitHelio = cache.get<Record<HelioPlanet, number>>(transitKey)
      if (!transitHelio) {
        try {
          const jd = isoToJD(noonIso, tz)
          transitHelio = calcHelioLongitudes(jd)
          cache.set(transitKey, transitHelio)
        } catch {
          continue
        }
      }

      for (const tp of HELIO_PLANETS) {
        const transitLon = transitHelio[tp]
        for (const np of HELIO_PLANETS) {
          const natalLon = natalHelio[np]
          for (const def of ASPECT_DEFS) {
            const orb = aspectOrb(transitLon, natalLon, def.angle)
            if (orb > ORB_DEG) continue
            // 같은 이름 행성 + conjunction 은 본명 helio 가 transit 같은 행성의
            // 회귀(궤도 1주) 신호 — 유지 (e.g. Jupiter helio return).
            const key = `${tp}|${def.name}|${np}`
            const arr = hitsByKey.get(key) ?? []
            arr.push({
              iso: noonIso,
              transitPlanet: tp,
              natalPlanet: np,
              aspect: def.name,
              orb,
              transitLon,
              natalLon,
            })
            hitsByKey.set(key, arr)
          }
        }
      }
    }

    // ─── 연속 hit 묶기 → ActiveSignal ───
    for (const [, hits] of hitsByKey) {
      hits.sort((a, b) => a.iso.localeCompare(b.iso))
      const segments = splitConsecutive(hits, SAMPLE_STEP_DAYS)
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i]
        const tightest = seg.reduce((best, h) => (h.orb < best.orb ? h : best), seg[0])
        const sample = seg[0]
        const polarity = ASPECT_POLARITY[sample.aspect]
        const layer: SignalLayer = sample.transitPlanet === 'Mercury' ? 'daily' : 'monthly'
        // orb 가 좁을수록 강하게 — orb 0 일 때 weight = 0.4, 1.5° 일 때 0.16.
        const orbDecay = Math.max(0.4, 1 - tightest.orb / ORB_DEG)
        const weight = 0.4 * orbDecay

        const startIso = seg[0].iso
        const endIso = seg[seg.length - 1].iso

        signals.push({
          id: `astro.heliocentric.${sample.transitPlanet}-${sample.aspect}-${sample.natalPlanet}.${startIso.slice(0, 10)}`,
          source: 'astro',
          kind: 'heliocentric',
          name: `${sample.transitPlanet} ${ASPECT_SYMBOL[sample.aspect]} ${sample.natalPlanet} (heliocentric)`,
          korean: `${PLANET_KOREAN[sample.transitPlanet]} 헬리오 ${ASPECT_KOREAN[sample.aspect]} ${PLANET_KOREAN[sample.natalPlanet]}`,
          themes: [],
          polarity,
          layer,
          active: { start: startIso, peak: tightest.iso, end: endIso },
          weight,
          evidence: {
            module: 'astro-heliocentric',
            aspectType: sample.aspect,
            orbDegrees: tightest.orb,
            planets: [sample.transitPlanet, sample.natalPlanet],
            detail: {
              mode: 'heliocentric',
              transitPlanet: sample.transitPlanet,
              natalPlanet: sample.natalPlanet,
              transitHelioLon: Number(tightest.transitLon.toFixed(4)),
              natalHelioLon: Number(tightest.natalLon.toFixed(4)),
              aspect: sample.aspect,
              orb: Number(tightest.orb.toFixed(4)),
              sampleStepDays: SAMPLE_STEP_DAYS,
              segmentSamples: seg.length,
              segmentIndex: i,
              totalSegments: segments.length,
            },
          },
        })
      }
    }

    return signals
  },
}

/**
 * 같은 (transit,aspect,natal) 키의 hit 들을 연속 구간으로 나눔.
 * sample 간격이 stepDays 라 gap > stepDays × 1.5 이면 새 segment 시작.
 */
function splitConsecutive<T extends { iso: string }>(hits: T[], stepDays: number): T[][] {
  const segments: T[][] = []
  let current: T[] = []
  const maxGapMs = stepDays * 1.5 * 86_400_000
  for (const h of hits) {
    if (current.length === 0) {
      current.push(h)
      continue
    }
    const prev = current[current.length - 1]
    const gap = new Date(h.iso).getTime() - new Date(prev.iso).getTime()
    if (gap <= maxGapMs) {
      current.push(h)
    } else {
      segments.push(current)
      current = [h]
    }
  }
  if (current.length) segments.push(current)
  return segments
}

export default astroHeliocentricExtractor
