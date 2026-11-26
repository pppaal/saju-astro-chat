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
 * orb 는 그 트랜짓 구간의 가장 좁은 orb 다(트랜짓 추출기의 orbDegrees).
 *
 * ── 트랜짓 위치 ──
 * withTransitPositions 가 그날 현지 정오 트랜짓 차트(getCachedTransitChart — 트랜짓 추출기가
 * 같은 키로 이미 계산·Redis 캐시한 차트)에서 그 행성의 별자리·도를 얹는다. 호출부가 날짜
 * 수를 제한한다(assembleTiers: 큰 날 최대 6 + 오늘). 캐시 버전 변경 없음.
 *
 * 순수 함수(withTransitPositions 만 캐시 읽기 비동기). 시계를 읽지 않는다.
 */

import type { ActiveSignal } from '@/lib/calendar-engine/types'
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

/**
 * 날짜별 근거에 그날 현지 정오 트랜짓 위치(별자리·도)를 얹는다 — 입력을 바꾸지 않고 새
 * 객체를 돌려준다. 트랜짓 추출기와 같은 키('YYYY-MM-DDT12:00:00', 출생지 좌표·시간대)라
 * 캘린더 빌드가 이미 채운 Redis 캐시를 읽는다. 차트 계산이 실패하면 위치 없이 둔다(fail-soft).
 */
export async function withTransitPositions(
  items: ReadonlyArray<{ dateIso: string; detail: ReasonAstroDetail }>,
  location: TransitLocation
): Promise<ReasonAstroDetail[]> {
  const cache = createCache()
  return Promise.all(
    items.map(async ({ dateIso, detail }) => {
      try {
        const chart = await getCachedTransitChart({
          iso: `${dateIso.slice(0, 10)}T12:00:00`,
          latitude: location.latitude,
          longitude: location.longitude,
          timeZone: location.timeZone,
          inMemoryCache: cache,
        })
        const body = chart.planets.find((p) => p.name === detail.transitPlanet)
        if (!body) return detail
        return { ...detail, transitSign: body.sign, transitDeg: body.degree }
      } catch (err) {
        logger.warn('[calendar-view] transit position unavailable — reason without position', err)
        return detail
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
 * 위치는 있을 때만(큰 날·오늘), orb 는 트랜짓 부모일 때만(엔진 참조에 있을 때).
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
