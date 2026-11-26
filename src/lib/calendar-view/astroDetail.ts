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
import { LOT_EN, LOT_KO } from '@/lib/calendar-engine/extractors/astro-arabic-part'
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
  const q = ref.aspect ? undefined : parentQualifier(ref.astro)
  if (q) out.qualifier = q
  return out
}

/** 로트 접촉 부모의 qualifier 접두 — 'lot.Victory'. 품위·위상 키(소문자)와 겹치지 않는다. */
const LOT_QUALIFIER = 'lot.'

/**
 * 어스펙트 없는 점성 부모의 성격 — 엔진이 적은 부모 id 에서 읽는다(추정 아님): 품위
 * 'astro.dignity.{행성}|{품위}|{별자리}.{날}' → 품위 키, 달 위상 'astro.moon-phase.{날}.{위상}' →
 * 위상 키, 로트 접촉 'astro.arabic-part.{로트}.{행성}.{날}' → 'lot.{로트}'(R-VC-8). 그 밖(이름에
 * 성격이 없는 부모)은 undefined.
 */
function parentQualifier(astroId: string | undefined): string | undefined {
  if (!astroId) return undefined
  const dignity = /^astro\.dignity\.[^|]+\|([a-z]+)\|/.exec(astroId)
  if (dignity && DIGNITY_WORD.en[dignity[1]]) return dignity[1]
  const phase = /^astro\.moon-phase\.\d{4}-\d{2}-\d{2}\.([a-z_]+)$/.exec(astroId)
  if (phase && MOON_PHASE_WORD.en[phase[1]]) return phase[1]
  const lot = /^astro\.arabic-part\.([A-Za-z]+)\./.exec(astroId)
  if (lot && LOT_EN[lot[1]]) return `${LOT_QUALIFIER}${lot[1]}`
  return undefined
}

/** qualifier 'lot.Victory' → 'on Lot of Victory' / '승리의 로트'. 로트가 아니면 undefined. */
function lotWord(qualifier: string, lang: Lang): string | undefined {
  if (!qualifier.startsWith(LOT_QUALIFIER)) return undefined
  const key = qualifier.slice(LOT_QUALIFIER.length)
  if (lang === 'ko') return LOT_KO[key]?.label
  const en = LOT_EN[key]?.label
  return en ? `on ${en}` : undefined
}

/** 품위 말 — 근거 사다리 STARS 칸과 교차 행 보조 줄이 같은 말(astro-dignity 라벨과 같은 KO). */
export const DIGNITY_WORD: Record<Lang, Record<string, string>> = {
  en: {
    domicile: 'In domicile',
    exaltation: 'Exalted',
    detriment: 'In detriment',
    fall: 'In fall',
    triplicity: 'In triplicity',
    term: 'In its terms',
    face: 'In its face',
  },
  ko: {
    domicile: '도미사일(자기 자리)',
    exaltation: '엑잘테이션(고양)',
    detriment: '디트리먼트(반대 자리)',
    fall: '폴(추락)',
    triplicity: '트리플리시티',
    term: '텀',
    face: '페이스',
  },
}

/** 달 위상 말 — KO 는 엔진 위상 이름(electional getMoonPhaseName)과 같다(테스트로 고정). */
export const MOON_PHASE_WORD: Record<Lang, Record<string, string>> = {
  en: {
    new_moon: 'new moon',
    waxing_crescent: 'waxing crescent',
    first_quarter: 'first quarter',
    waxing_gibbous: 'waxing gibbous',
    full_moon: 'full moon',
    waning_gibbous: 'waning gibbous',
    last_quarter: 'last quarter',
    waning_crescent: 'waning crescent',
  },
  ko: {
    new_moon: '삭 (새달)',
    waxing_crescent: '초승달',
    first_quarter: '상현달',
    waxing_gibbous: '차오르는 달',
    full_moon: '보름달',
    waning_gibbous: '기우는 달',
    last_quarter: '하현달',
    waning_crescent: '그믐달',
  },
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
 * 보조 줄 조각 사이 구분 — 점 앞은 줄바꿈 없는 공백, 뒤는 보통 공백. 줄은 점 뒤에서만 갈려
 * '· orb 2.9°' 처럼 점으로 여는 줄이 생기지 않는다(QA R-VC-6, base_v9 .nw 의 의도).
 */
export const SUB_SEP = '\u00A0· '

/**
 * 근거 STARS 칸 보조 줄 — 'Transit · 24° Scorpio · square natal Moon · orb 0.4°'.
 * 위치는 있을 때만, orb 는 트랜짓 부모일 때 그 위치와 같은 순간의 값만(withTransitPositions).
 * 조각 안의 낱말은 줄바꿈 없는 공백(U+00A0)으로 잇는다 — ' · ' 만 줄이 갈리는 자리라 '1° |
 * Sagittarius', 'orb | 0.1°' 처럼 값이 쪼개지지 않는다(QA VC-8, base_v9 .nw 와 같은 규칙).
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
  } else if (detail.qualifier) {
    // 어스펙트 없는 부모 — 품위·달 위상 말('exalted' · 'waxing gibbous'). 같은 행성의 두 교차가
    // 같은 줄로 보이지 않게(QA VC-5). 로트 접촉은 그 로트 이름('on Lot of Victory', R-VC-8).
    const lot = lotWord(detail.qualifier, lang)
    const word = DIGNITY_WORD[lang][detail.qualifier] ?? MOON_PHASE_WORD[lang][detail.qualifier]
    if (lot) parts.push(lot)
    else if (word) parts.push(ko ? word : word.toLowerCase())
  }
  if (typeof detail.orb === 'number') {
    parts.push(ko ? `오브 ${detail.orb.toFixed(1)}°` : `orb ${detail.orb.toFixed(1)}°`)
  }
  return parts.map((p) => p.replace(/ /g, '\u00A0')).join(SUB_SEP)
}
