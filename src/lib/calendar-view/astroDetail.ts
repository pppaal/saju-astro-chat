/**
 * '왜 이런 날' 근거의 점성 부모 — 교차를 만든 하늘의 신호를 구조(ReasonAstroDetail)로.
 *
 * v9 캘린더의 교차 행 STARS 칸은 "Transit ☉ · 24° Scorpio"처럼 트랜짓 행성·어스펙트·본명
 * 접점·그날 트랜짓 위치를 보여 준다. 교차 신호 자체는 '상관 × 태양' 페어 이름뿐이라, 그
 * 교차를 만든 점성 부모 신호를 셀 안에서 찾아 읽는다.
 *
 * ── 부모 찾기 ──
 * · evidence 가 있는 셀(오늘 — getFocusDayCell)은 교차의 detail.parentIds[1] 이 부모 id 다.
 * · 월 셀은 evidence 를 비워 캐시한다(stripEvidence) — id·이름·층·부호·창은 남는다. 교차
 *   추출기(cross-activation)의 규칙을 그대로 거꾸로 읽는다: 부모는 활성(하늘에서 움직이는)
 *   점성 신호이고, 그 행성이 교차의 점성 키이며, 부호가 교차와 반대가 아니고(combinePolarity —
 *   부호 있는 교차의 부모는 매핑 부호이거나 0), 층은 교차 층보다 좁지 않고(교차 층 = 좁은 부모 층),
 *   창이 교차 창(id 의 '~' 구간)을 덮는다. 후보가 여럿이면 |polarity|×weight → id 순.
 * · aspect·natalPoint 는 트랜짓 부모의 이름('Sun □ Moon')에서 — 트랜짓 추출기의 이름 규약
 *   `${transit} ${기호} ${natal}` 을 거꾸로 읽는다. orb 는 evidence 가 있을 때만(지어내지 않는다).
 *
 * ── 트랜짓 위치 ──
 * withTransitPositions 가 그날 현지 정오 트랜짓 차트(getCachedTransitChart — 트랜짓 추출기가
 * 같은 키로 이미 계산·Redis 캐시한 차트)에서 그 행성의 별자리·도를 얹는다. 호출부가 날짜
 * 수를 제한한다(assembleTiers: 큰 날 최대 6 + 오늘). 캐시 버전 변경 없음.
 *
 * 순수 함수(withTransitPositions 만 캐시 읽기 비동기). 시계를 읽지 않는다.
 */

import type { ActiveSignal, CalendarCell, SignalLayer } from '@/lib/calendar-engine/types'
import type { DestinyDayReason, ReasonAstroDetail } from '@/types/calendar/month'
import { getCachedTransitChart } from '@/lib/calendar-engine/ephe-cache'
import { createCache } from '@/lib/calendar-engine/cache'
import { SIBSIN_HANJA } from '@/lib/saju/sibsinLabels'
import {
  astroPlanetOf,
  isDignitySignal,
  parseTransitName,
  planetKoOr,
} from '@/lib/calendar-engine/derivers/evidenceLadder'
import { SIGN_KO } from '@/lib/astrology/signLabels'
import type { PlanetGlyph } from '@/components/v9/Glyph'
import { logger } from '@/lib/logger'

export {
  ASPECT_KEY_BY_SYMBOL,
  ASPECT_SYMBOL,
  astroPlanetOf,
  parseTransitName,
} from '@/lib/calendar-engine/derivers/evidenceLadder'

const LAYER_RANK: Record<SignalLayer, number> = {
  instant: 0,
  hourly: 1,
  daily: 2,
  monthly: 3,
  yearly: 4,
  decadal: 5,
}

/** 교차 id 끝의 창 'layer:YYYY-MM-DD~YYYY-MM-DD' → 첫·마지막 날짜. */
function crossWindowDays(cross: ActiveSignal): { from: string; to: string } {
  const m = /:(\d{4}-\d{2}-\d{2})~(\d{4}-\d{2}-\d{2})$/.exec(cross.id)
  if (m) return { from: m[1], to: m[2] }
  return { from: cross.active.start.slice(0, 10), to: cross.active.end.slice(0, 10) }
}

/** 교차의 점성 키(영문 행성) — 구조 detail 우선, 없으면 id 'cross.{saju}-x-{Planet}.' 에서. */
function crossAstroKey(cross: ActiveSignal): string | undefined {
  const d = cross.evidence?.detail
  if (typeof d?.astroKey === 'string' && d.astroKey) return d.astroKey
  const m = /^cross\.[^.]*-x-([^.]+)\./.exec(cross.id)
  return m ? m[1] : undefined
}

const impact = (s: ActiveSignal) => Math.abs(s.polarity) * s.weight

/**
 * 교차 신호의 점성 부모 — evidence 가 있으면 parentIds, 없으면 교차 규칙을 거꾸로 읽은
 * 후보 중 가장 센 것(모듈 주석). 못 찾으면 null.
 */
export function findAstroParent(
  cell: Pick<CalendarCell, 'signals'>,
  cross: ActiveSignal
): ActiveSignal | null {
  const parentIds = cross.evidence?.detail?.parentIds
  if (Array.isArray(parentIds) && typeof parentIds[1] === 'string') {
    const byId = cell.signals.find((s) => s.id === parentIds[1])
    if (byId) return byId
  }
  const planet = crossAstroKey(cross)
  if (!planet) return null
  const sign = Math.sign(cross.polarity)
  const { from, to } = crossWindowDays(cross)
  let best: ActiveSignal | null = null
  for (const s of cell.signals) {
    if (s.source !== 'astro' || astroPlanetOf(s) !== planet) continue
    // 부호: 교차 부호와 반대인 부모는 없다(combinePolarity — 한쪽 0 은 허용).
    if (sign !== 0 && Math.sign(s.polarity) === -sign) continue
    if (LAYER_RANK[s.layer] < LAYER_RANK[cross.layer]) continue
    if (s.active.start.slice(0, 10) > from || s.active.end.slice(0, 10) < to) continue
    if (
      !best ||
      impact(s) > impact(best) ||
      (impact(s) === impact(best) &&
        (s.weight > best.weight || (s.weight === best.weight && s.id < best.id)))
    ) {
      best = s
    }
  }
  return best
}

/**
 * 교차 근거의 점성 구조 — 부모 신호에서 트랜짓 행성·어스펙트·본명 접점(·orb).
 * evidenceCell(오늘의 evidence 포함 셀)을 주면 그 안의 같은 교차(id)로 부모를 정확히 찾고
 * orb 를 싣는다. 부모를 못 찾으면 교차의 점성 키만으로 { transitPlanet } (sourceKind 'unknown').
 */
export function reasonAstroDetail(
  cell: Pick<CalendarCell, 'signals'>,
  cross: ActiveSignal,
  evidenceCell?: Pick<CalendarCell, 'signals'> | null
): ReasonAstroDetail | null {
  const evCross = evidenceCell?.signals.find((s) => s.id === cross.id) ?? null
  const parent =
    (evCross && evidenceCell ? findAstroParent(evidenceCell, evCross) : null) ??
    findAstroParent(cell, cross)
  const planet = (parent && astroPlanetOf(parent)) ?? crossAstroKey(cross)
  if (!planet) return null
  const out: ReasonAstroDetail = {
    transitPlanet: planet,
    sourceKind: parent ? (isDignitySignal(parent) ? 'dignity' : parent.kind) : 'unknown',
  }
  if (parent && parent.kind === 'transit' && !isDignitySignal(parent)) {
    const parsed = parseTransitName(parent.name)
    const aspect = parent.evidence?.aspectType ?? parsed?.aspect
    const natal = parent.evidence?.planets?.[1] ?? parsed?.natalPoint
    if (aspect) out.aspect = aspect
    if (natal) out.natalPoint = natal
    const orb = parent.evidence?.orbDegrees
    if (typeof orb === 'number' && Number.isFinite(orb)) out.orb = Math.round(orb * 100) / 100
  }
  return out
}

/**
 * 근거(pickDayReason 의 화면 모양)에 십신 한자와 점성 구조를 붙인 사본. signal 은 그 근거를
 * 고른 교차 신호(pickDayReasonSignal) — 같은 셀·같은 마크로 고른 것이어야 한다.
 */
export function withReasonDetail(
  reason: DestinyDayReason,
  cell: Pick<CalendarCell, 'signals'>,
  signal: ActiveSignal,
  evidenceCell?: Pick<CalendarCell, 'signals'> | null
): DestinyDayReason {
  const out: DestinyDayReason = { ...reason }
  const hanja = SIBSIN_HANJA[reason.saju]
  if (hanja) out.sajuHanja = hanja
  const detail = reasonAstroDetail(cell, signal, evidenceCell)
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
 * 위치는 있을 때만(큰 날·오늘), orb 는 evidence 가 있는 날만(지어내지 않는다).
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
