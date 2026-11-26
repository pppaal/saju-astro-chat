/**
 * '왜 이런 날' 근거의 점성 부모 — 교차를 만든 하늘의 신호를 구조(ReasonAstroDetail)로.
 *
 * v9 캘린더의 교차 행 STARS 칸은 "Transit ☉ · 24° Scorpio"처럼 트랜짓 행성·어스펙트·본명
 * 접점·그날 트랜짓 위치를 보여 준다. 교차 신호 자체는 '상관 × 태양' 페어 이름뿐이라, 그
 * 교차를 만든 점성 부모의 구조가 필요하다.
 *
 * ── 부모 = 엔진이 적은 참조 ── (G14)
 * cross-activation 이 모든 교차에 부모 참조(ActiveSignal.crossParents — 두 부모 id, 점성 부모의
 * 행성·종류·층, 트랜짓이면 어스펙트·본명 접점·orb)를 싣는다. 최상위 필드라 evidence 를 비운
 * 월 셀(stripEvidence)에도 남는다. 여기서는 그 값을 그대로 옮길 뿐 — 이름·id·창으로 부모를
 * 추정하지 않는다(예전 findAstroParent 휴리스틱은 표본 30일 중 1일을 'unknown' 으로 냈다).
 * 참조가 없는 교차는 엔진 버그다 — 근거에 점성 구조를 붙이지 않는다(지어내지 않는다).
 * 참조의 orb 는 그 트랜짓 구간의 가장 좁은 orb 다(트랜짓 추출기의 orbDegrees) — 그 값은 화면에
 * 그대로 내지 않는다(아래).
 *
 * ── 트랜짓 위치 · 그 순간의 orb ── (QA-3)
 * withTransitPositions 가 그날 현지 정오 트랜짓 차트(getCachedTransitChart — 트랜짓 추출기가
 * 같은 키로 이미 계산·Redis 캐시한 차트)에서 그 행성의 별자리·도를 얹고, 같은 차트에서 orb =
 * |angleDiff(트랜짓 황경, 본명 황경) − 어스펙트 각| 을 다시 재 덮어쓴다(트랜짓 추출기의 orb 와 같은
 * 식). 그래서 STARS 보조 줄의 도와 orb 가 같은 순간을 말한다 — 예전엔 구간 최소 orb(정확일)를
 * 그날 정오 위치 옆에 붙여 '1° Virgo · conjunct natal Moon · orb 0.1°'(실제 2.9°)처럼 서로
 * 어긋났다. 위치를 못 구하면 orb 도 내지 않는다. 본명 황경은 이미 지은 본명 차트에서
 * (natalPointLongitudes — 트랜짓 추출기와 같은 점 집합). 뷰 층 계산이라 캐시 버전 변경 없음.
 *
 * 순수 함수(withTransitPositions 만 캐시 읽기 비동기). 시계를 읽지 않는다.
 */

import type { ActiveSignal } from '@/lib/calendar-engine/types'
import { ASPECT_ANGLES, type AspectType } from '@/lib/astrology/foundation/types'
import { angleDiff } from '@/lib/astrology/foundation/utils'
import type { DestinyDayReason, ReasonAstroDetail } from '@/types/calendar/month'
import { getCachedTransitChart } from '@/lib/calendar-engine/ephe-cache'
import { createCache } from '@/lib/calendar-engine/cache'
import { SIBSIN_HANJA } from '@/lib/saju/sibsinLabels'
import { planetKoOr } from '@/lib/calendar-engine/derivers/evidenceLadder'
import { SIGN_KO } from '@/lib/astrology/signLabels'
import type { PlanetGlyph } from '@/components/v9/Glyph'
import { logger } from '@/lib/logger'

export {
  ASPECT_KEY_BY_SYMBOL,
  ASPECT_SYMBOL,
  astroPlanetOf,
  parseTransitName,
} from '@/lib/calendar-engine/derivers/evidenceLadder'

/**
 * 교차 근거의 점성 구조 — 교차의 부모 참조(crossParents)에서 행성·종류(·어스펙트·본명
 * 접점·orb). 참조가 없으면 null.
 */
export function reasonAstroDetail(
  cross: Pick<ActiveSignal, 'crossParents'>
): ReasonAstroDetail | null {
  const ref = cross.crossParents
  if (!ref) return null
  const out: ReasonAstroDetail = { transitPlanet: ref.planet, sourceKind: ref.kind }
  if (ref.aspect) out.aspect = ref.aspect
  if (ref.natal) out.natalPoint = ref.natal
  if (typeof ref.orb === 'number') out.orb = ref.orb
  return out
}

/**
 * 근거(pickDayReason 의 화면 모양)에 십신 한자와 점성 구조를 붙인 사본. signal 은 그 근거를
 * 고른 교차 신호(pickDayReasonSignal) — 같은 셀·같은 마크로 고른 것이어야 한다.
 */
export function withReasonDetail(
  reason: DestinyDayReason,
  signal: Pick<ActiveSignal, 'crossParents'>
): DestinyDayReason {
  const out: DestinyDayReason = { ...reason }
  const hanja = SIBSIN_HANJA[reason.saju]
  if (hanja) out.sajuHanja = hanja
  const detail = reasonAstroDetail(signal)
  if (detail) out.astroDetail = detail
  return out
}

export interface TransitLocation {
  latitude: number
  longitude: number
  timeZone: string
}

/** 본명 접점 이름 → 황경(도). */
export type NatalPointLongitudes = ReadonlyMap<string, number>

interface NamedLongitude {
  name: string
  longitude: number
}

/**
 * 본명 접점 황경 — 트랜짓 추출기(astro-transit)가 어스펙트를 재는 점 집합 그대로: 행성 + 추가 점
 * (카이런 · 릴리스) + ASC · MC. 이미 지은 본명 차트(NatalContext.astro)에서 읽기만 한다.
 */
export function natalPointLongitudes(astro: {
  chart: { planets: readonly NamedLongitude[]; ascendant?: NamedLongitude; mc?: NamedLongitude }
  extraPoints?: readonly NamedLongitude[]
}): NatalPointLongitudes {
  const out = new Map<string, number>()
  const points = [
    ...astro.chart.planets,
    ...(astro.extraPoints ?? []),
    astro.chart.ascendant,
    astro.chart.mc,
  ]
  for (const p of points) {
    if (p && typeof p.longitude === 'number' && !out.has(p.name)) out.set(p.name, p.longitude)
  }
  return out
}

/**
 * 그 순간의 orb — |angleDiff(트랜짓 황경, 본명 황경) − 어스펙트 각|(트랜짓 추출기와 같은 식),
 * 소수 둘째 자리. 트랜짓 부모가 아니거나(어스펙트 · 본명 접점 없음) 본명 황경을 모르면 undefined.
 */
export function orbAtInstant(
  detail: Pick<ReasonAstroDetail, 'aspect' | 'natalPoint'>,
  transitLongitude: number,
  natal: NatalPointLongitudes
): number | undefined {
  if (!detail.aspect || !detail.natalPoint) return undefined
  const angle = ASPECT_ANGLES[detail.aspect as AspectType]
  const natalLon = natal.get(detail.natalPoint)
  if (typeof angle !== 'number' || typeof natalLon !== 'number') return undefined
  return Math.round(Math.abs(angleDiff(transitLongitude, natalLon) - angle) * 100) / 100
}

/**
 * 날짜별 근거에 그날 현지 정오 트랜짓 위치(별자리·도)와 *같은 차트의* orb 를 얹는다 — 입력을
 * 바꾸지 않고 새 객체를 돌려준다. 트랜짓 추출기와 같은 키('YYYY-MM-DDT12:00:00', 출생지 좌표·
 * 시간대)라 캘린더 빌드가 이미 채운 Redis 캐시를 읽는다. 참조의 구간 최소 orb 는 버린다 — 그날
 * 위치를 못 구하면(차트 실패 · 행성 없음) 위치도 orb 도 없이 둔다(fail-soft, 어긋난 숫자 없음).
 */
export async function withTransitPositions(
  items: ReadonlyArray<{ dateIso: string; detail: ReasonAstroDetail }>,
  location: TransitLocation,
  natal: NatalPointLongitudes
): Promise<ReasonAstroDetail[]> {
  const cache = createCache()
  return Promise.all(
    items.map(async ({ dateIso, detail }) => {
      // 구간 최소 orb(정확일의 값)는 그날 위치 옆에 두지 않는다.
      const { orb: _windowOrb, ...bare } = detail
      void _windowOrb
      try {
        const chart = await getCachedTransitChart({
          iso: `${dateIso.slice(0, 10)}T12:00:00`,
          latitude: location.latitude,
          longitude: location.longitude,
          timeZone: location.timeZone,
          inMemoryCache: cache,
        })
        const body = chart.planets.find((p) => p.name === detail.transitPlanet)
        if (!body) return bare
        const placed: ReasonAstroDetail = {
          ...bare,
          transitSign: body.sign,
          transitDeg: body.degree,
        }
        const orb = orbAtInstant(detail, body.longitude, natal)
        if (orb !== undefined) placed.orb = orb
        return placed
      } catch (err) {
        logger.warn('[calendar-view] transit position unavailable — reason without position', err)
        return bare
      }
    })
  )
}

// ─── 표시 — v9 STARS 칸의 문구(지역화). 구조 값은 영문 키, 여기서만 말로 바꾼다. ───

export type Lang = 'ko' | 'en'

const ASPECT_WORD: Record<Lang, Record<string, string>> = {
  en: {
    conjunction: 'conjunct',
    opposition: 'opposite',
    trine: 'trine',
    square: 'square',
    sextile: 'sextile',
    quincunx: 'quincunx',
    semisextile: 'semisextile',
    quintile: 'quintile',
    biquintile: 'biquintile',
    sesquiquadrate: 'sesquiquadrate',
  },
  // astro-transit aspectKorean 과 같은 말.
  ko: {
    conjunction: '컨정션',
    opposition: '어포지션',
    trine: '트라인',
    square: '스퀘어',
    sextile: '섹스타일',
    quincunx: '퀸컹스',
    semisextile: '세미섹스타일',
    quintile: '퀸타일',
    biquintile: '바이퀸타일',
    sesquiquadrate: '세스퀴쿼드러트',
  },
}

/** 어스펙트 말 — 'square' / '스퀘어'. */
export function aspectWord(aspect: string, lang: Lang): string {
  return ASPECT_WORD[lang][aspect] ?? aspect
}

/** 행성·접점 이름 — 'Sun' / '태양'. */
export function planetLabel(name: string, lang: Lang): string {
  return planetKoOr(name, lang)
}

/** 별자리 이름 — 'Scorpio' / '전갈자리'. */
export function signLabel(sign: string, lang: Lang): string {
  return lang === 'ko' ? (SIGN_KO[sign] ?? sign) : sign
}

const GLYPHS = new Set([
  'sun',
  'moon',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
])

/** v9 행성 기호 키 — 그릴 기호가 없는 점(교점·소천체)은 undefined. */
export function planetGlyph(name: string | undefined): PlanetGlyph | undefined {
  if (!name) return undefined
  if (name === 'Ascendant' || name === 'Asc') return 'asc'
  const k = name.toLowerCase()
  return GLYPHS.has(k) ? (k as PlanetGlyph) : undefined
}

/**
 * 근거 STARS 칸 보조 줄 — 'Transit · 24° Scorpio · square natal Moon · orb 0.4°'.
 * 위치는 있을 때만, orb 는 트랜짓 부모일 때 그 위치와 같은 순간의 값만(withTransitPositions).
 */
export function astroDetailSub(detail: ReasonAstroDetail, lang: Lang): string {
  const ko = lang === 'ko'
  const parts: string[] = [ko ? '트랜짓' : 'Transit']
  if (detail.transitSign && typeof detail.transitDeg === 'number') {
    const sign = signLabel(detail.transitSign, lang)
    parts.push(ko ? `${sign} ${detail.transitDeg}°` : `${detail.transitDeg}° ${sign}`)
  }
  if (detail.aspect && detail.natalPoint) {
    const natal = planetLabel(detail.natalPoint, lang)
    const asp = aspectWord(detail.aspect, lang)
    parts.push(ko ? `본명 ${natal} ${asp}` : `${asp} natal ${natal}`)
  }
  if (typeof detail.orb === 'number') {
    parts.push(ko ? `오브 ${detail.orb.toFixed(1)}°` : `orb ${detail.orb.toFixed(1)}°`)
  }
  return parts.join(' · ')
}
