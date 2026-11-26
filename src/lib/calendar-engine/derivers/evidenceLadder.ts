/**
 * 근거 사다리(evidence ladder) — 한 시점의 근거를 *시간층별 지배신호 1개*로 세운다.
 *
 * 왜: 예전 화면은 (1) 점수·사유·톤이 서로 다른 layer 모집단을 봐서 어긋나고,
 * (2) 전문어가 든 사유를 drop-on-doubt 로 통째로 버려 사용자가 보는 "왜"가
 * 합성 문장으로 떨어졌다(docs/운흐름.md §0.5.0·§5.1, 근거 리서치 D2·D3).
 *
 * 이 deriver 는 그 대신 **10년 → 올해 → 이달 → 오늘** 4개 시간층 각각에서
 * 가장 무거운 신호 1개를 세우고, 각 칸을 "쉬운 결론(본문) + 용어(칩)" 2단으로
 * 낸다. 점수·근거·톤이 같은 사다리를 함께 읽게 하려는 표시용 산출물.
 *
 * 순수 함수. LLM 0번. 사주 pillar-sibsin 이 4층 backbone(용신 대비 polarity),
 * 점성 신호는 같은 층에 있으면 칩 하나로 합류한다.
 *
 * ── 구조 필드(v9.2 사다리) ──
 * 칸마다 표시 문자열(결론·칩)과 함께 구조를 싣는다 — 화면(v9 교차 행)이 문자열을 다시
 * 쪼개지 않게:
 *  · range — 그 층 기간(현지 민용 날짜, 양끝 포함). 10년은 *대운* 창(본명 대운 목록 —
 *    호출부가 ladderDaeunRange 로 넘긴다; 신호 창은 천간·지지 5년 반쪽이라 쓰지 않는다),
 *    올해·이달은 그 층 십신 기둥 신호의 절기 창(세운 立春~, 월운 節~), 오늘은 그 날.
 *  · saju — 십신 기둥 {ko, en, hanja}.
 *  · astro — 점성 칩의 구조 {kind, planet, dignity?, sign?, aspect?, natalPoint?, lots?, event?}.
 *    10년 칸이 ZR 이면 lots 에 영혼·운명 L1 챕터(별자리·주인·햇수·기간)를, 올해 칸에는 그날
 *    활성인 행성 회귀(라이프사이클 마디, 예: 첫 토성 회귀)를 event 로 단다.
 * 행성·별자리·품위·어스펙트 값은 언어 무관 영문 키다(표시는 뷰모델이 지역화).
 */

import type { ActiveSignal, SignalLayer } from '../types'
import { STATIC_NATAL_KINDS } from '../signalTaxonomy'
import { sibsinArea, sibsinAreaEn, sibsinGloss } from './plainLanguage'
import { SIBSIN_EN, SIBSIN_HANJA } from '@/lib/saju/sibsinLabels'
import { PLANET_KO } from '../data/planetNames'
import { daeunWindows } from '../periodPillars'
import { lifecycleEventDef, type AstroLifecycleEventKind } from '../lifecycle/astroLifecycle'

export type LadderScale = 'decadal' | 'yearly' | 'monthly' | 'daily'
export type Lang = 'ko' | 'en'

interface EvidenceChip {
  /** 짧은 용어 라벨 — '정재', '금성 △ 금성' 등. */
  text: string
  source: 'saju' | 'astro'
}

/** 기간 — 현지 민용 날짜 'YYYY-MM-DD', 양끝 포함. */
export interface LadderRange {
  start: string
  end: string
}

/** 사주 칸 — 십신 기둥(또는 십신이 없을 때 그 층 사주 지배신호의 짧은 라벨). */
interface RungSaju {
  ko: string
  en: string
  /** 십신 한자(正財). 십신이 아니면 ''. */
  hanja: string
}

/** ZR L1 챕터 하나 — 영혼(spirit)·운명(fortune) 랏. */
interface RungLot {
  lot: 'spirit' | 'fortune'
  /** 챕터 별자리 — 'Taurus'. */
  sign: string
  /** 그 별자리 주인 — 'Venus'. */
  ruler: string
  /** 챕터 햇수(ZR 소년수). */
  years: number
  range: LadderRange
}

/** 행성 회귀 마디(라이프사이클) — '첫 토성 회귀'. */
interface RungEvent {
  /** 마디 kind — 'saturn_return_1'. */
  kind: string
  planet?: string
  ko: string
  en: string
  /** 통과 창(첫 접근 1° ~ 마지막 통과 뒤 1°). */
  range: LadderRange
}

/** 점성 칸 — 칩의 구조. 값은 언어 무관 영문 키. */
export interface RungAstro {
  /** 'transit' · 'dignity' · 'zodiacal-releasing' · 'lifecycle' · 그 밖의 점성 kind. */
  kind: string
  /** 그 신호의 행성(ZR 은 챕터 주인). */
  planet?: string
  /** 품위 키 — 'fall' · 'domicile' · 'term' …(kind 'dignity'). */
  dignity?: string
  /** 별자리 — 품위·ZR 챕터의 별자리. */
  sign?: string
  /** 어스펙트 키 — 'trine'(kind 'transit'). */
  aspect?: string
  /** 본명 접점 — 'Venus'(kind 'transit'). */
  natalPoint?: string
  /** ZR L1 영혼·운명 챕터(10년 칸이 ZR 일 때). */
  lots?: RungLot[]
  /** 그날 활성인 행성 회귀(올해 칸). */
  event?: RungEvent
  /** 항성 합의 별 이름 — {en: 'Regulus', ko: '레굴루스'}(kind 'fixed-star'). */
  star?: RungStar
}

/** 항성 이름 — EN 은 카탈로그 영문명, KO 는 한글명에서 글로스 괄호를 뗀 것. */
interface RungStar {
  en: string
  ko: string
}

export interface EvidenceRung {
  scale: LadderScale
  /** 시간대 라벨 — '10년'/'올해'/'이달'/'오늘'. */
  scaleLabel: string
  /** 전문어 없는 결론 한 줄. */
  conclusion: string
  /** 방향(부호) — 색·톤용. 지배신호 polarity. */
  polarity: number
  /** 용어 칩 — 결론의 출처를 살려 보여준다(버리지 않고 접기). */
  chips: EvidenceChip[]
  /** 그 층의 기간(모듈 주석 — 10년은 대운 창). 모르면 없음. */
  range?: LadderRange
  /** 사주 칸 구조. */
  saju?: RungSaju
  /** 점성 칸 구조. */
  astro?: RungAstro
}

/** deriveEvidenceLadder 의 기간 입력 — 신호만으로는 알 수 없는 값. */
export interface LadderOptions {
  /** 그 날짜의 대운 창(ladderDaeunRange). 없으면 10년 칸 range 생략. */
  daeunRange?: LadderRange | null
  /** 오늘 칸의 날짜 'YYYY-MM-DD'. 없으면 일진 기둥 신호의 창. */
  dateIso?: string
}

const SCALE_ORDER: LadderScale[] = ['decadal', 'yearly', 'monthly', 'daily']

const SCALE_LABEL: Record<Lang, Record<LadderScale, string>> = {
  ko: { decadal: '10년', yearly: '올해', monthly: '이달', daily: '오늘' },
  en: { decadal: '10-yr', yearly: 'This year', monthly: 'This month', daily: 'Today' },
}

/** 각 사다리 scale 이 어느 신호 layer 를 담는가. (hourly/instant 는 daily 로 접음.) */
const SCALE_LAYERS: Record<LadderScale, SignalLayer[]> = {
  decadal: ['decadal'],
  yearly: ['yearly'],
  monthly: ['monthly'],
  daily: ['daily', 'hourly', 'instant'],
}

const impact = (s: ActiveSignal): number => Math.abs(s.polarity) * s.weight

/**
 * *정통 십신 기둥*(대운/세운/월운/일진 간지의 십신)만 골라 십신명을 준다.
 * 'pillar-sibsin' kind 는 12운성 전이·기신/구신·조후 라인까지 함께 emit 하므로
 * (name 이 '甲申 (비견)' 처럼 `간지 (십신)` 정형인 것만 backbone), 그렇지 않은
 * 파생 라인은 backbone 에서 제외한다. 없으면 undefined.
 */
function primarySibsin(s: ActiveSignal): string | undefined {
  if (s.kind !== 'pillar-sibsin') return undefined
  // '간지 (십신)' 정형만 — evidence.sibsin 은 12운성 전이 라인 등 파생에도 붙어
  // 있어(예 '일진 금 동일 (비겁)') 신뢰 못 함. name 은 stripEvidence 에도 보존됨.
  const m = s.name.match(/^[^\s()]+\s*\(([^)]+)\)\s*$/)
  return m ? m[1].trim() : undefined
}

/** 지배신호 선택 — 같은 layer 후보 중 impact 최대(동점이면 weight, 그래도 id). */
function pickDominant(cands: ActiveSignal[]): ActiveSignal | undefined {
  let best: ActiveSignal | undefined
  for (const s of cands) {
    if (
      !best ||
      impact(s) > impact(best) ||
      // 전순서(total order) tie-break — impact 동점→weight, weight 동점→id.
      // 옛 `weight> || id<` 는 (낮은 weight·낮은 id) 후보가 순서 따라 이겨 결정성이
      // 깨졌다(감사).
      (impact(s) === impact(best) &&
        (s.weight > best.weight || (s.weight === best.weight && s.id < best.id)))
    ) {
      best = s
    }
  }
  return best
}

// 점성 kind → 짧은 칩 라벨. 결론은 사주가 이끌고, 점성은 칩 하나로 합류.
const ASTRO_KIND_CHIP: Record<Lang, Record<string, string>> = {
  ko: {
    profection: '프로펙션',
    'zodiacal-releasing': 'ZR 챕터',
    'solar-return': '솔라리턴',
    'lunar-return': '루나리턴',
    progression: '진행',
    'progressed-moon': '진행 달',
    lifecycle: '행성 마디',
    'moon-phase': '달 위상',
    'void-of-course': '보이드',
    'fixed-star': '항성',
    'arabic-part': '아라빅 파트',
    'house-transit': '하우스 트랜짓',
    'angle-contact': '앵글 접촉',
    dignity: '품위',
    eclipse: '식(蝕)',
    electional: '택일',
    'solar-arc': '솔라아크',
  },
  en: {
    profection: 'profection',
    'zodiacal-releasing': 'ZR',
    'solar-return': 'solar return',
    'lunar-return': 'lunar return',
    progression: 'progression',
    'progressed-moon': 'prog. Moon',
    lifecycle: 'planet phase',
    'moon-phase': 'moon phase',
    'void-of-course': 'void',
    'fixed-star': 'fixed star',
    'arabic-part': 'arabic part',
    'house-transit': 'house transit',
    'angle-contact': 'angle contact',
    dignity: 'dignity',
    eclipse: 'eclipse',
    electional: 'electional',
    'solar-arc': 'solar arc',
  },
}

const ASPECT_MARK: Record<string, string> = {
  conjunction: '☌',
  opposition: '☍',
  square: '□',
  trine: '△',
  sextile: '✶',
  quincunx: '⚻',
  semisextile: '⚺',
}

// PLANET_KO 는 10행성+ASC/MC 만. 트랜짓 natal point 로 자주 오는 교점·소천체·각도점을
// 보강해 KO 칩에 'True Node'/'Chiron' 같은 영문이 새지 않게 한다(감사).
const POINT_KO_EXTRA: Record<string, string> = {
  'True Node': '북교점',
  'North Node': '북교점',
  'South Node': '남교점',
  Node: '교점',
  Chiron: '카이런',
  Lilith: '릴리스',
  Descendant: '하강점',
  DC: '하강점',
  IC: '천저점',
  Vertex: '버텍스',
}
/** 행성·접점 표시명 — KO 는 한글(10행성·앵글·교점·소천체), EN 은 영문 키 그대로. */
export const planetKoOr = (name: string, lang: Lang): string =>
  lang === 'ko' ? (PLANET_KO[name] ?? POINT_KO_EXTRA[name] ?? name) : name

/** name 의 영문 행성/포인트 토큰만 한글로. 긴 키부터(‘True Node’ 가 ‘Node’ 보다
 *  먼저) 치환해 부분겹침 방지. */
function koPointTokens(name: string): string {
  let t = name
  const map: Array<[string, string]> = [
    ...Object.entries(PLANET_KO),
    ...Object.entries(POINT_KO_EXTRA),
  ].sort((a, b) => b[0].length - a[0].length)
  for (const [en, ko] of map) {
    t = t.replace(new RegExp(`\\b${en}\\b`, 'g'), ko)
  }
  return t
}

/**
 * 위계(dignity) 신호 — astro-dignity 추출기가 트랜짓 품위는 kind 'transit', 본명 Almuten
 * 스냅샷은 kind 'natal-dignity'(정적 본명 — 사다리 입력에서 빠짐)로 낸다. evidence 를
 * 뺀 월 셀에서도 module 은 남으므로 module(또는 id 접두)로 가린다.
 */
const isDignitySignal = (s: ActiveSignal): boolean =>
  s.evidence?.module === 'astro-dignity' || s.id.startsWith('astro.dignity.')

// ─── 신호 이름·id 읽기 — evidence 를 비운 월 셀에서도 살아남는 표지로 구조를 복원 ───

/** 트랜짓 이름의 어스펙트 기호 → 키 (astro-transit aspectSymbol 의 역). */
export const ASPECT_KEY_BY_SYMBOL: Readonly<Record<string, string>> = {
  '☌': 'conjunction',
  '☍': 'opposition',
  '△': 'trine',
  '□': 'square',
  '✶': 'sextile',
  '⚻': 'quincunx',
  '⚺': 'semisextile',
  Q: 'quintile',
  bQ: 'biquintile',
  '⚼': 'sesquiquadrate',
}

/** 어스펙트 키 → 기호(표시용). */
export const ASPECT_SYMBOL: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(ASPECT_KEY_BY_SYMBOL).map(([sym, key]) => [key, sym])
)

/**
 * 트랜짓 이름('Sun □ Moon', 'Neptune ☍ True Node') → 트랜짓 행성·어스펙트 키·본명 접점.
 * 이름 규약은 astro-transit 의 `${transit} ${기호} ${natal}`. 기호 토큰이 없으면 null.
 */
export function parseTransitName(
  name: string
): { transitPlanet: string; aspect: string; natalPoint: string } | null {
  const tokens = name.trim().split(/\s+/)
  const at = tokens.findIndex((t) => ASPECT_KEY_BY_SYMBOL[t] !== undefined)
  if (at <= 0 || at >= tokens.length - 1) return null
  return {
    transitPlanet: tokens.slice(0, at).join(' '),
    aspect: ASPECT_KEY_BY_SYMBOL[tokens[at]],
    natalPoint: tokens.slice(at + 1).join(' '),
  }
}

/** 위계 신호 id 'astro.dignity.{행성}|{품위}|{별자리}.{날짜}' → 구조. */
function parseDignityId(id: string): { planet: string; dignity: string; sign: string } | null {
  const m = /^astro\.dignity\.([^|]+)\|([^|]+)\|([^.]+)\./.exec(id)
  return m ? { planet: m[1], dignity: m[2], sign: m[3] } : null
}

/**
 * 하늘에서 움직이는 행성이 아닌 점성 kind — 교차 키가 될 수 없는 집합(cross-activation
 * NON_ACTIVE_ASTRO_KINDS)에 본명 품위 스냅샷을 더한 것.
 */
const NON_ACTIVE_ASTRO_KINDS: ReadonlySet<string> = new Set([
  'eclipse',
  'profection',
  'zodiacal-releasing',
  'planetary-hour',
  'solar-arc',
  'progression',
  'progressed-moon',
  'solar-return',
  'lunar-return',
  'natal-dignity',
])

/** 라이프사이클 마디 kind → 회귀하는 행성(astro-lifecycle EVENT_PLANET). 진행 달은 없음. */
function lifecyclePlanet(event: string): string | undefined {
  if (event.startsWith('progressed_')) return undefined
  if (event.startsWith('jupiter_')) return 'Jupiter'
  if (event.startsWith('saturn_')) return 'Saturn'
  if (event.startsWith('uranus_')) return 'Uranus'
  if (event.startsWith('neptune_')) return 'Neptune'
  if (event.startsWith('pluto_')) return 'Pluto'
  if (event.startsWith('chiron_')) return 'Chiron'
  return undefined
}

const lifecycleKindOf = (s: ActiveSignal): string =>
  typeof s.evidence?.detail?.event === 'string'
    ? (s.evidence.detail.event as string)
    : s.id.replace(/^astro\.lifecycle\./, '')

/** 이름 머리의 천체 — 'True Node' 처럼 두 단어인 점도 받는다. */
const KNOWN_BODIES = [
  'True Node',
  'North Node',
  'South Node',
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
  'Chiron',
  'Lilith',
] as const
function leadingBody(name: string): string | undefined {
  return KNOWN_BODIES.find((b) => name === b || name.startsWith(`${b} `))
}

/**
 * 점성 신호의 활성(하늘의) 행성 — evidence.planets[0](교차 추출기와 같은 키)이 있으면 그것,
 * 없으면(월 셀) id·이름에서 복원. 하늘에서 움직이는 행성이 아닌 kind 는 undefined.
 */
export function astroPlanetOf(s: ActiveSignal): string | undefined {
  if (s.source !== 'astro' || NON_ACTIVE_ASTRO_KINDS.has(s.kind)) return undefined
  if (s.kind === 'lifecycle') return lifecyclePlanet(lifecycleKindOf(s))
  const fromEvidence = s.evidence?.planets?.[0]
  if (fromEvidence) return fromEvidence
  const m = /^astro\.(?:transit|dignity)\.([^|.]+)\|/.exec(s.id)
  if (m) return m[1]
  if (s.kind === 'moon-phase' || s.kind === 'void-of-course') return 'Moon'
  return leadingBody(s.name)
}

/** ZR L1 이름 'ZR Spirit L1: Taurus (Venus, 8년)' → 랏 챕터. 다른 ZR 신호는 null. */
function parseZrL1(s: ActiveSignal): RungLot | null {
  const m = /^ZR (Spirit|Fortune) L1: (\w+) \((\w+), (\d+)년\)$/.exec(s.name)
  if (!m) return null
  return {
    lot: m[1] === 'Spirit' ? 'spirit' : 'fortune',
    sign: m[2],
    ruler: m[3],
    years: Number(m[4]),
    range: windowRange(s),
  }
}

/** ZR 신호 이름의 챕터 별자리·주인 'ZR Fortune L2: Pisces (Jupiter)' — 없으면 null. */
function parseZrChapter(name: string): { sign: string; ruler: string } | null {
  const m = /^ZR (?:Spirit|Fortune) L\d: (\w+) \((\w+)/.exec(name)
  return m ? { sign: m[1], ruler: m[2] } : null
}

/** 신호 활성 창 → 현지 날짜 기간(떠 있는 ISO 의 날짜 부분). */
const windowRange = (s: ActiveSignal): LadderRange => ({
  start: s.active.start.slice(0, 10),
  end: s.active.end.slice(0, 10),
})

/** 라이프사이클 신호 → 회귀 마디. 진행 달(상징 방향)·모르는 kind 는 null. */
function lifecycleEvent(s: ActiveSignal): RungEvent | null {
  const kind = lifecycleKindOf(s)
  const planet = lifecyclePlanet(kind)
  if (!planet) return null
  let def: ReturnType<typeof lifecycleEventDef>
  try {
    def = lifecycleEventDef(kind as AstroLifecycleEventKind)
  } catch {
    return null
  }
  return {
    kind,
    planet,
    ko: def.labelKo.split(' — ')[0].trim(),
    en: def.labelEn,
    range: windowRange(s),
  }
}

/**
 * 항성 합 신호 → 별 이름. evidence.detail(starName · starKorean)이 있으면 그것을, 월 셀처럼
 * evidence 가 비었으면 id('astro.fixed-star.{Star}.{Planet}.{date}')와 이름
 * ('Mars ☌ 레굴루스 (왕의 별)')에서 읽는다. 글로스 괄호('(왕의 별)')는 칩에 싣지 않는다(R-VC-3).
 */
function fixedStarName(s: ActiveSignal): RungStar | null {
  if (s.kind !== 'fixed-star') return null
  const detail = (s.evidence?.detail ?? {}) as { starName?: unknown; starKorean?: unknown }
  const en =
    (typeof detail.starName === 'string' && detail.starName) ||
    /^astro\.fixed-star\.([^.]+)\./.exec(s.id)?.[1] ||
    ''
  if (!en) return null
  const koRaw =
    (typeof detail.starKorean === 'string' && detail.starKorean) ||
    /☌\s*(.+)$/.exec(s.name)?.[1] ||
    ''
  const ko = koRaw.replace(/\s*[(（][^)）]*[)）]\s*$/, '').trim()
  return { en, ko: ko && !/^[\x00-\x7F]+$/.test(ko) ? ko : en }
}

/**
 * 점성 지배신호 → 칸 구조. lots 는 같은 셀의 ZR L1 들(10년 칸이 ZR 일 때만).
 */
function astroStructure(s: ActiveSignal, live: readonly ActiveSignal[]): RungAstro {
  if (isDignitySignal(s)) {
    const d = parseDignityId(s.id)
    return d
      ? { kind: 'dignity', planet: d.planet, dignity: d.dignity, sign: d.sign }
      : { kind: 'dignity', planet: astroPlanetOf(s) }
  }
  if (s.kind === 'transit') {
    const parsed = parseTransitName(s.name)
    const out: RungAstro = {
      kind: 'transit',
      planet: s.evidence?.planets?.[0] ?? parsed?.transitPlanet,
    }
    const aspect = s.evidence?.aspectType ?? parsed?.aspect
    const natal = s.evidence?.planets?.[1] ?? parsed?.natalPoint
    if (aspect) out.aspect = aspect
    if (natal) out.natalPoint = natal
    return out
  }
  if (s.kind === 'zodiacal-releasing') {
    const ch = parseZrChapter(s.name)
    const lots = live
      .map(parseZrL1)
      .filter((l): l is RungLot => l !== null)
      .sort((a, b) => (a.lot === b.lot ? 0 : a.lot === 'spirit' ? -1 : 1))
    const out: RungAstro = { kind: 'zodiacal-releasing' }
    if (ch) {
      out.planet = ch.ruler
      out.sign = ch.sign
    }
    if (lots.length) out.lots = lots
    return out
  }
  if (s.kind === 'lifecycle') {
    const ev = lifecycleEvent(s)
    return ev ? { kind: 'lifecycle', planet: ev.planet, event: ev } : { kind: 'lifecycle' }
  }
  const planet = astroPlanetOf(s) ?? s.evidence?.planets?.[0]
  const out: RungAstro = planet ? { kind: s.kind, planet } : { kind: s.kind }
  const star = fixedStarName(s)
  if (star) out.star = star
  return out
}

/** 그날 활성인 행성 회귀 중 가장 무거운 것(weight → id). */
function activeLifecycleEvent(live: readonly ActiveSignal[]): {
  event: RungEvent
  polarity: number
} | null {
  let best: { sig: ActiveSignal; event: RungEvent } | null = null
  for (const s of live) {
    if (s.kind !== 'lifecycle') continue
    const event = lifecycleEvent(s)
    if (!event) continue
    if (
      !best ||
      s.weight > best.sig.weight ||
      (s.weight === best.sig.weight && s.id < best.sig.id)
    ) {
      best = { sig: s, event }
    }
  }
  return best ? { event: best.event, polarity: best.sig.polarity } : null
}

/**
 * 그 날짜의 대운 창 — 본명 대운 목록(daeunWindows, daeunAge SSOT)에서 그날이 든 칸.
 * 첫 대운 전(OD-12)·출생일 미상이면 undefined. 순수(시계 읽지 않음).
 */
export function ladderDaeunRange(
  natal: Parameters<typeof daeunWindows>[0],
  dateIso: string
): LadderRange | undefined {
  const d = dateIso.slice(0, 10)
  const w = daeunWindows(natal, { start: `${d}T00:00:00.000Z`, end: `${d}T23:59:59.999Z` }).find(
    (x) => x.startDate <= d && d <= x.endDate
  )
  return w ? { start: w.startDate, end: w.endDate } : undefined
}

/**
 * 위계 칩 — name 은 'Saturn 폴 (추락) in Aries' 처럼 한글 라벨이 박혀 있어 EN 칩·결론에
 * 한글이 샜다. EN 은 english 머리('Saturn in Fall (Aries)'), KO 는 korean 에서 글로스
 * 괄호를 뗀 짧은 라벨('토성 폴 (양자리)') — 별자리 괄호만 남겨 EN 과 짝을 맞춘다.
 */
function dignityChipText(s: ActiveSignal, lang: Lang): string {
  if (lang === 'en') return (s.english ?? s.name).split(' — ')[0].trim()
  if (!s.korean) return koPointTokens(s.name)
  return s.korean
    .replace(/\s*[(（][^)）]*[)）](?=\s*[(（])/g, '') // 마지막(별자리) 괄호 앞의 글로스 괄호
    .replace(/\b5-tier\s+/g, '') // 본명 Almuten 라벨의 영문 토막
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/** 점성 지배신호 → 짧은 칩 라벨. transit 은 '금성 △ 금성', 그 외는 kind 라벨. */
function astroChipText(s: ActiveSignal, lang: Lang): string {
  if (isDignitySignal(s)) return dignityChipText(s, lang)
  if (s.kind === 'transit') {
    const planets = s.evidence?.planets
    const mark = ASPECT_MARK[s.evidence?.aspectType ?? ''] ?? '·'
    if (planets && planets.length >= 2) {
      return `${planetKoOr(planets[0], lang)} ${mark} ${planetKoOr(planets[1], lang)}`
    }
    // evidence 없으면 name('Venus △ Venus')의 영문 행성/포인트 토큰만 한글로.
    return lang === 'ko' ? koPointTokens(s.name) : s.name
  }
  // 항성 합 — 'fixed star' 만 쓰면 어느 별인지 사라지고 행성 기호가 별처럼 읽혔다(R-VC-3).
  // EN 은 영문 별 이름(이름 문자열엔 한글 별 이름이 박혀 있다), KO 는 한글 별 이름.
  const star = fixedStarName(s)
  if (star) {
    const planet = astroPlanetOf(s)
    const starText = lang === 'ko' ? star.ko : star.en
    return planet ? `${planetKoOr(planet, lang)} ☌ ${starText}` : starText
  }
  return ASTRO_KIND_CHIP[lang][s.kind] ?? s.kind
}

// EN 결론 문장에선 각 기호를 말로 푼다(칩은 기호 유지) — 사다리 문장 줄의 '△' 가
// 판정 기호 옆에서 기호처럼 읽혔다(FIX9b F10). 공백으로 떨어진 토큰만 바꿔 'Q' 등이
// 이름 일부를 건드리지 않게 한다.
const ASPECT_WORD_EN: Record<string, string> = {
  '☌': 'conjunct',
  '☍': 'opposite',
  '△': 'trine',
  '□': 'square',
  '✶': 'sextile',
  '⚻': 'quincunx',
  '⚺': 'semisextile',
  '⚼': 'sesquiquadrate',
  Q: 'quintile',
  bQ: 'biquintile',
}
const spellAspectsEn = (t: string): string =>
  t
    .split(' ')
    .map((tok) => ASPECT_WORD_EN[tok] ?? tok)
    .join(' ')
// KO 결론도 같은 규칙(FIX9b F10 은 로케일을 가리지 않는다 · QA VC-7) — '달 □ 화성' → '달 스퀘어 화성'.
// 말은 astro-transit aspectKorean · calendar-view ASPECT_WORD.ko 와 같다.
const ASPECT_WORD_KO: Record<string, string> = {
  '☌': '컨정션',
  '☍': '어포지션',
  '△': '트라인',
  '□': '스퀘어',
  '✶': '섹스타일',
  '⚻': '퀸컹스',
  '⚺': '세미섹스타일',
  '⚼': '세스퀴쿼드러트',
  Q: '퀸타일',
  bQ: '바이퀸타일',
}
const spellAspectsKo = (t: string): string =>
  t
    .split(' ')
    .map((tok) => ASPECT_WORD_KO[tok] ?? tok)
    .join(' ')

// 사주 결론 템플릿 — 전문어 0, 방향(부호)·시간층별. area/gloss 는 SIBSIN_DOMAIN.
function sajuConclusion(sibsin: string, scale: LadderScale, polarity: number, lang: Lang): string {
  const area = lang === 'ko' ? sibsinArea(sibsin) : sibsinAreaEn(sibsin)
  const gloss = sibsinGloss(sibsin) // ko 전용 — en 은 area 로 대체
  if (lang === 'ko') {
    const vivid = gloss || area
    if (polarity > 0) {
      const tail: Record<LadderScale, string> = {
        decadal: '큰 흐름으로 받쳐주는 10년',
        yearly: '올해의 무게중심',
        monthly: '이달 순조로운 결',
        daily: '오늘 받쳐주는 기운',
      }
      return `${vivid} — ${tail[scale]}`
    }
    if (polarity < 0) {
      const tail: Record<LadderScale, string> = {
        decadal: '긴 호흡의 시험대가 되는 10년',
        yearly: '올해 눌리기 쉬운 축',
        monthly: '이달 걸리는 지점',
        daily: '오늘 조심할 지점',
      }
      return `${area} 쪽에 마찰 — ${tail[scale]}`
    }
    return `${vivid} — ${SCALE_LABEL.ko[scale]}의 바탕 기운`
  }
  // en
  if (polarity > 0) {
    const tail: Record<LadderScale, string> = {
      decadal: 'the throughline of this 10-yr stretch',
      yearly: "this year's center of gravity",
      monthly: 'flowing smoothly this month',
      daily: 'a supporting current today',
    }
    return `${area} — ${tail[scale]}`
  }
  if (polarity < 0) {
    const tail: Record<LadderScale, string> = {
      decadal: 'a long-haul test over this 10-yr stretch',
      yearly: 'an axis that gets pressed this year',
      // 'a rough patch' 는 달 전체가 거칠다는 과장 — 한 축의 걸림으로 좁힌다(KO 짝 동일).
      monthly: 'a sticking point this month',
      daily: 'a spot to watch today',
    }
    return `friction around ${area} — ${tail[scale]}`
  }
  return `${area} — the baseline note of ${SCALE_LABEL.en[scale].toLowerCase()}`
}

/** 점성만 있는 층의 결론 — 행성 흐름 한 줄(폴백). */
function astroConclusion(s: ActiveSignal, scale: LadderScale, lang: Lang): string {
  const label = astroChipText(s, lang)
  return lang === 'ko'
    ? `${spellAspectsKo(label)} 흐름이 ${SCALE_LABEL.ko[scale]}의 결을 잡아요`
    : `${spellAspectsEn(label)} sets the tone for ${SCALE_LABEL.en[scale].toLowerCase()}`
}

/**
 * 신호 다발 → 근거 사다리. scales 로 어느 층을 담을지 제어(월 카드는 daily 생략).
 * 사주 pillar-sibsin 이 backbone, 같은 층 점성 지배신호는 칩으로 합류.
 */
export function deriveEvidenceLadder(
  signals: ActiveSignal[],
  lang: Lang = 'ko',
  scales: LadderScale[] = SCALE_ORDER,
  opts: LadderOptions = {}
): EvidenceRung[] {
  // 정적 본명(명사) 표지는 흐름 근거가 아니므로 제외 — 점수 파이프라인과 동일 기준.
  const live = signals.filter((s) => !STATIC_NATAL_KINDS.has(s.kind))

  const rungs: EvidenceRung[] = []
  for (const scale of scales) {
    const layers = SCALE_LAYERS[scale]
    const inScale = live.filter((s) => layers.includes(s.layer))
    if (inScale.length === 0) continue

    // 사주 backbone — 그 층 간지의 십신 기둥(정통). 파생 라인(12운성·기신 등)은 제외.
    const sajuPrimary = pickDominant(inScale.filter((s) => primarySibsin(s) !== undefined))
    // 십신 기둥이 없을 때만(희귀) 그 층 사주 지배신호로 폴백.
    const sajuFallback = sajuPrimary
      ? undefined
      : pickDominant(inScale.filter((s) => s.source === 'saju' && s.polarity !== 0))
    // 점성 칩은 사주 결론과 같은 방향에서만 고른다 — 사주가 마찰(−)이라 말하는 칸에
    // 더 무거운 길(+) 트랜짓 칩이 붙어 칩과 결론이 서로 반대말을 했다. 같은 부호 후보가
    // 없으면 칩을 생략한다. 사주 결론이 중립(0)일 때만 예전처럼 부호 무관 최강(양보용).
    const astroCands = inScale.filter((s) => s.source === 'astro' && s.polarity !== 0)
    const sajuDir = sajuPrimary ? Math.sign(sajuPrimary.polarity) : 0
    const astroDom = pickDominant(
      sajuDir !== 0 ? astroCands.filter((s) => Math.sign(s.polarity) === sajuDir) : astroCands
    )

    if (!sajuPrimary && !sajuFallback && !astroDom) continue

    const chips: EvidenceChip[] = []
    let conclusion = ''
    let polarity = 0
    let saju: RungSaju | undefined
    let astro: RungAstro | undefined

    if (sajuPrimary) {
      const sibsin = primarySibsin(sajuPrimary)!
      saju = { ko: sibsin, en: SIBSIN_EN[sibsin] ?? sibsin, hanja: SIBSIN_HANJA[sibsin] ?? '' }
      // 칩은 십신 원어 — EN 은 표준 영문 라벨(SIBSIN_EN), 없으면 원어 폴백.
      chips.push({ text: lang === 'en' ? (SIBSIN_EN[sibsin] ?? sibsin) : sibsin, source: 'saju' })
      // 중립 십신(용신 무관, polarity 0)이 강한 점성 driver 를 가리지 않게 — 그 층에
      // 방향 있는 트랜짓이 있으면 톤·결론을 점성에 양보한다(칩은 유지). 안 그러면
      // 강한 트랜짓이 깔린 층이 "…바탕 기운"(중립)으로 잘못 떴다(감사).
      const yieldToAstro = sajuPrimary.polarity === 0 && !!astroDom && astroDom.polarity !== 0
      if (!yieldToAstro) {
        polarity = sajuPrimary.polarity
        conclusion = sajuConclusion(sibsin, scale, sajuPrimary.polarity, lang)
      }
    } else if (sajuFallback) {
      polarity = sajuFallback.polarity
      const label =
        (lang === 'ko' ? sajuFallback.korean : sajuFallback.english) ?? sajuFallback.name
      chips.push({ text: shortLabel(label), source: 'saju' })
      const en = sajuFallback.english ? shortLabel(sajuFallback.english) : ''
      saju = {
        ko: shortLabel(sajuFallback.korean ?? sajuFallback.name),
        en: HANGUL.test(en) ? '' : en,
        hanja: '',
      }
    }

    if (astroDom) {
      chips.push({ text: astroChipText(astroDom, lang), source: 'astro' })
      astro = astroStructure(astroDom, live)
      if (!conclusion) {
        conclusion = astroConclusion(astroDom, scale, lang)
        polarity = astroDom.polarity
      }
    }

    if (!conclusion) continue

    // 올해 칸 — 그날 활성인 행성 회귀(첫 토성 회귀 등)를 사건으로 단다. 점성 칸이 있으면
    // 그 위에, 없으면 회귀가 칸 방향과 어긋나지 않을 때만 점성 칸으로(칩 부호 규칙과 같은 정신).
    if (scale === 'yearly') {
      const life = activeLifecycleEvent(live)
      if (life) {
        if (astro) astro = { ...astro, event: life.event }
        else if (polarity === 0 || Math.sign(life.polarity) === Math.sign(polarity))
          astro = { kind: 'lifecycle', planet: life.event.planet, event: life.event }
      }
    }

    const rung: EvidenceRung = {
      scale,
      scaleLabel: SCALE_LABEL[lang][scale],
      conclusion,
      polarity,
      chips,
    }
    const range = rungRange(scale, sajuPrimary, opts)
    if (range) rung.range = range
    if (saju) rung.saju = saju
    if (astro) rung.astro = astro
    rungs.push(rung)
  }

  return rungs
}

const HANGUL = /[\u3131-\u318E\uAC00-\uD7A3]/

/**
 * 칸의 기간 — 10년은 대운 창(opts.daeunRange), 오늘은 opts.dateIso, 올해·이달은 그 층 십신
 * 기둥 신호의 절기 창(periodPillars — 빌드 범위와 무관). 모르면 undefined.
 */
function rungRange(
  scale: LadderScale,
  backbone: ActiveSignal | undefined,
  opts: LadderOptions
): LadderRange | undefined {
  if (scale === 'decadal') return opts.daeunRange ?? undefined
  if (scale === 'daily' && opts.dateIso) {
    const d = opts.dateIso.slice(0, 10)
    return { start: d, end: d }
  }
  return backbone ? windowRange(backbone) : undefined
}

/** 칩용 짧은 라벨 — 선행 마커/레이어 태그/괄호 글로스 제거, 20자 컷. */
function shortLabel(label: string): string {
  const t = label
    .replace(/^[↑↓·▲▼]\s*/, '')
    .replace(/\[[^\]]*\]\s*/g, '')
    .replace(/\s*[(（][^)）]*[)）]/g, '')
    .trim()
  return t.length > 20 ? `${t.slice(0, 19)}…` : t
}
