/**
 * 인생 흐름 뷰모델 — v9.2 Life(/destiny) 화면 데이터(순수). assembleLifetime 의 페이로드
 * (lifetime + user)만 읽고 화면이 그대로 그릴 구조를 낸다: 히어로, 읽기, 이 10년의 겹침,
 * 축별 교차 + 집계, 타고난 강점 표, 인생 곡선(표지 · 대운 띠), 10년 시간표, 전략.
 *
 * ── 단일 권위(다시 계산하지 않는다) ──
 *  · 인생 모양 · 서사 머리/본문 · 정점 = lifetime.lifePattern(lifePattern.ts — 곡선 파이프라인).
 *  · 다음 인생 마디 = lifetime.nextLifeTurn(생애 마디 중 올해 다음 첫 항목 — 대운 경계 아님).
 *  · 겹침 = lifetime.decadeCross(정직성 게이트 통과분만). 없으면 빈 상태(오너 결정 13).
 *  · 축별 교차 · 집계 = lifetime.crossCheck(리포트 buildCrossRows · tallyCrossRows 그대로).
 *  · 강점 = lifetime.sibsinRadar(엔진 categoryCount · 원국 글자).
 *  · 곡선 = lifetime.lifeCurve(만 0–90세) — 화면은 인생 읽기 범위(0–84세)로 자른다.
 *  · 대운 = lifetime.daewoon(현재 대운 SSOT · runningDaeunIndex).
 *  · 전략 = lifetime.lifeStrategy(EN 필드 — B3).
 *
 * 결정론: 시계를 읽지 않는다. '지금'은 페이로드(currentYear · nowAge)에서만 온다.
 * en 출력에는 한글이 없다(엔진 EN 필드만 쓴다) — 한자 간지 · 일간은 그대로.
 */

import type {
  DestinyDaewoon,
  DestinyLifeCurvePoint,
  DestinyLifetime,
  DestinyUserSummary,
} from '@/types/calendar'
import type { CardPillar } from '@/lib/card/types'
import type { CrossTally } from '@/lib/report/natalCrossShared'
import type { CrossToneKey } from '@/lib/report/toneLabel'
import type { LifeStarPoint } from '@/lib/report/lifeCrossCheck'
import type { RadarChar } from '@/lib/report/sibsinRadar'
import { UI } from '@/lib/report/integratedReportLabels'
import type { SajuElement } from '@/lib/saju/elementBridge'
import type { PlanetGlyph } from '@/components/v9/Glyph'
import { KO_TO_SAJU_ELEMENT } from '@/lib/saju/elementBridge'
import { getBranchElement, getStemElement } from '@/lib/saju/stemBranchUtils'
import { sibsinArea, sibsinAreaEn } from '@/lib/calendar-engine/derivers/plainLanguage'
import { eulReul, eunNeun } from '@/lib/i18n/koParticle'
import { pick, type Bi } from '@/lib/i18n/bi'
import { planetGlyph, planetLabel, signLabel } from './astroDetail'
import type { SajuCellVM, StarsCellVM, TimingRowVM } from './dayViewModel'
import type { Lang } from './dateLabels'

/** 인생 읽기 범위 — 출생 해부터 84년(히어로 'Lifetime read · 1997–2081', 곡선 자르기, 먼 대운). */
export const LIFE_READ_YEARS = 84

// ─── 화면 데이터 모양 ─────────────────────────────────────────────────────────

export interface LifeHeroVM {
  /** 인생 모양 키(lifePattern.key) — 없으면 null. */
  shapeKey: string | null
  /** 인생 모양 이름 — 'Ups and downs' / '굴곡형'. */
  shape: string
  /** H1 — 마지막 단어만 따로(이탤릭). 한 단어면 lead 가 빈 문자열. */
  h1: { lead: string; last: string }
  /** 인생 읽기 범위 — 출생 해 ~ +84. */
  range: { from: number; to: number; label: string }
  /** 리드 = 유형 태그('Blooms late, lasts long.'). */
  lede: string
  now: { age: number; year: number; note: string }
  /** 다음 인생 마디 — 없으면 null. */
  nextTurn: { age: number; year: number; label: string; note: string } | null
}

export interface LifeReadingVM {
  /** 인용 머리(첫 문장). */
  lead: string
  /** 나머지 문장. */
  body: string
}

export interface LifeOverlapVM {
  /** 'This decade · 2021–2030' — 지금 대운이 없으면 null. */
  rangeLabel: string | null
  rows: TimingRowVM[]
  /** 행이 없을 때의 정직한 빈 상태 문구(오너 결정 13). 행이 있으면 null. */
  empty: string | null
  /** 첫 행의 트랜짓 · 본명 자리 한 줄 — 둘 다 있을 때만. */
  caption: string | null
}

export interface LifeTraitCellVM {
  text: string
  w?: string
  sub?: string
}

export interface LifeTraitStarsVM extends LifeTraitCellVM {
  /** 보조 줄의 점들(기호를 그리는 화면용) — 정체성: 태양 · 상승, 욕망: 달. */
  points?: Array<{ glyph?: PlanetGlyph; text: string }>
}

export interface LifeTraitRowVM {
  key: string
  axis: string
  verdict: CrossToneKey
  saju?: LifeTraitCellVM
  stars?: LifeTraitStarsVM
  /** 칸 대신 엔진의 한 문장 요지. */
  phrase?: string
}

export interface LifeTraitsVM {
  tally: CrossTally
  /** 'Saju × stars · 16 traits'. */
  countLabel: string
  rows: LifeTraitRowVM[]
  fullReportHref: string
  /** 전체 리포트의 축 수(결핍 축 포함). */
  reportTraitCount: number
  /** '18 traits in your full report'. */
  moreLabel: string
  /** 출생시각 미상 + 출생일 안에 달이 별자리를 바꿀 때의 안내(리포트와 같은 말). 아니면 null. */
  caveat: string | null
}

export type LifeStrengthKey = 'wealth' | 'status' | 'support' | 'creativity' | 'drive'

export interface LifeStrengthRowVM {
  /** 십성 묶음 키(영문 슬러그) — 재성 wealth · 관성 status · 인성 support · 식상 creativity · 비겁 drive. */
  key: LifeStrengthKey
  label: string
  /** 묶음 한자 — 財 · 官 · 印 · 食傷 · 比劫. */
  hanja: string
  chars: RadarChar[]
  count: number
  strongest: boolean
}

export interface LifeStrengthsVM {
  rows: LifeStrengthRowVM[]
  /** 'Your strongest thread is Status.' — 근거가 없으면 null. */
  heading: string | null
  /** 가장 센 결의 이름(H2 강조용). */
  strongest: string | null
  /** 가장 센 결이 다른 결과 개수가 같은지. */
  strongestTied: boolean
  /** 오행 띠 — 원국 글자 수(일간 포함). */
  elements: Array<{ key: SajuElement; label: string; count: number }>
  dayMaster: string
  /** 시간 미상 — 세 기둥만 센 추정값. */
  estimated: boolean
  caption: string
}

export type LifeCurveMarkerKind = 'now' | 'crest' | 'peak' | 'dip'

export interface LifeCurveVM {
  points: DestinyLifeCurvePoint[]
  span: { fromAge: number; toAge: number; fromYear: number; toYear: number }
  markers: Array<{ kind: LifeCurveMarkerKind; age: number; year: number }>
  /** 대운 띠 — 대운 천간 오행, 인생 읽기 범위로 자른 연도. */
  eras: Array<{ from: number; to: number; element: SajuElement; gz: string }>
  heading: { main: string; sub: string | null }
  rangeLabel: string
  caption: string
}

export type LifeDecadeState = 'past' | 'now' | 'future' | 'far'

export interface LifeDecadeRowVM {
  gz: string
  /** 레일 색 — 대운 천간 오행. */
  element: SajuElement
  /** '2021–2030'. */
  years: string
  start: number
  /** 끝 연도(배타). */
  end: number
  /** 주제 — 'Opportunity & money' / '돈·현실'. 모르면 빈 문자열. */
  theme: string
  /** 'Byeongo · age 24–33' / '병오 · 24–33세'. */
  roman: string
  state: LifeDecadeState
  /** 이 행에 다음 인생 마디가 든다. */
  lifeTurn?: { label: string; year: number; age: number }
  /** 서사가 가리키는 정점이 이 행에 든다 — 엔진의 정점 절. */
  peakNote?: string
  /** 지금 행 — 올해 세운 한 줄 + 캘린더 링크. */
  yrow?: { text: string; link: string; href: string }
}

export interface LifeDecadesVM {
  heading: string
  rangeLabel: string
  rows: LifeDecadeRowVM[]
  caption: string
}

export interface LifeStrategyVM {
  heading: string
  lucky?: { label: string; colors: string; direction: string; numbers: string }
  allies?: { animals: string; tiles: Array<{ ch: string; el: SajuElement }>; note: string }
  wealth?: { h3: string; p: string }
  watch?: { years: Array<{ age: number; year: number }>; note: string }
}

export interface LifeShareVM {
  typeName: string
  lifeShape: string | null
  /**
   * 화면 미니 카드의 연 · 월 · 일주(공유 이미지 · 링크엔 넣지 않는다). 카드 데이터 그대로
   * (roman · hangul 둘 다) — SajuCard 가 locale 로 읽기를 고른다.
   */
  pillars: CardPillar[]
}

export interface LifetimeViewModel {
  lang: Lang
  hero: LifeHeroVM
  reading: LifeReadingVM | null
  overlap: LifeOverlapVM
  traits: LifeTraitsVM | null
  strengths: LifeStrengthsVM | null
  curve: LifeCurveVM | null
  decades: LifeDecadesVM
  strategy: LifeStrategyVM | null
  share: LifeShareVM | null
}

export interface LifetimeViewModelInput {
  lifetime: DestinyLifetime
  user: Pick<DestinyUserSummary, 'ilgan' | 'elements'>
}

export interface LifetimeViewModelOptions {
  lang: Lang
  /** 지금 대운 행의 '하루 단위로 보기' 링크. 기본 '/calendar'. */
  calendarHref?: string
  /** 오늘(출생지 민용 날짜 'YYYY-MM-DD') — 겹침 캡션의 날짜. 없으면 날짜 없이. */
  todayIso?: string
}

// ─── 문구(ko/en) ─────────────────────────────────────────────────────────────

const COPY = {
  overlapRange: (a: number, b: number): Bi => ({
    en: `This decade · ${a}–${b}`,
    ko: `이번 10년 · ${a}–${b}`,
  }),
  overlapEmpty: {
    en: 'No overlapping signal this decade. We show one only when your 10-year saju cycle and a slow planet point the same way.',
    ko: '이번 10년엔 겹치는 신호가 없어요. 사주 대운과 긴 주기 천체가 같은 쪽을 가리킬 때만 보여 드려요.',
  },
  traitCount: (n: number): Bi => ({
    en: `Saju × stars · ${n} traits`,
    ko: `사주 × 별자리 · ${n}가지`,
  }),
  traitMore: (n: number): Bi => ({
    en: `${n} traits in your full report`,
    ko: `전체 리포트의 ${n}가지 축`,
  }),
  dayMaster: (h: string): Bi => ({ en: `Day master ${h}`, ko: `일간 ${h}` }),
  stageNote: (name: string, nameEn: string): Bi => ({
    en: `Living your ${nameEn.toLowerCase()}`,
    ko: `${name}${eulReul(name)} 지나는 중`,
  }),
  strongest: (label: string, labelKo: string): Bi => ({
    en: `Your strongest thread is ${label}.`,
    ko: `가장 센 결은 ${labelKo}${eunNeun(labelKo) === '은' ? '이에요' : '예요'}.`,
  }),
  strengthsCaption: (dm: string, hourGz: string | null): Bi =>
    hourGz
      ? {
          en: `One tile = one character in your four pillars, read against your ${dm} day master — including your hidden hour pillar ${hourGz}.`,
          ko: `타일 하나 = 네 기둥의 글자 하나, ${dm} 일간을 기준으로 읽었어요 — 숨겨 둔 시주 ${hourGz}까지 포함해요.`,
        }
      : {
          en: `One tile = one character in your four pillars, read against your ${dm} day master.`,
          ko: `타일 하나 = 네 기둥의 글자 하나, ${dm} 일간을 기준으로 읽었어요.`,
        },
  strengthsEstimated: (dm: string): Bi => ({
    en: `One tile = one character in your pillars, read against your ${dm} day master. Birth time unknown — three pillars only, so these counts are an estimate.`,
    ko: `타일 하나 = 기둥의 글자 하나, ${dm} 일간을 기준으로 읽었어요. 태어난 시각을 몰라 세 기둥만 셌어요 — 개수는 추정이에요.`,
  }),
  curveSlope: {
    rising: { en: 'Right now the flow is rising.', ko: '지금 흐름은 오르는 중이에요.' },
    falling: { en: 'Right now the flow is easing off.', ko: '지금 흐름은 잦아드는 중이에요.' },
    plateau: { en: 'Right now the flow is even.', ko: '지금 흐름은 고른 편이에요.' },
  } satisfies Record<string, Bi>,
  curveCrest: (age: number): Bi => ({
    en: `Next crest around ${age}.`,
    ko: `다음 마루는 ${age}세 무렵.`,
  }),
  curveRange: (a0: number, a1: number, y0: number, y1: number): Bi => ({
    en: `Curve · age ${a0}–${a1} · ${y0}–${y1}`,
    ko: `곡선 · ${a0}–${a1}세 · ${y0}–${y1}`,
  }),
  curveCaption: {
    en: 'Saju cycles — 10-year, yearly and clashes — layered with outer-planet transits.',
    ko: '사주 주기(10년 · 1년 · 충)에 외행성 트랜짓을 겹쳐 그렸어요.',
  },
  decadesHeading: {
    en: 'Life’s weather shifts every ten years.',
    ko: '삶의 날씨는 10년마다 바뀌어요.',
  },
  decadesRange: (a: number, b: number): Bi => ({
    en: `10-year cycles · ${a}–${b}`,
    ko: `10년 주기 · ${a}–${b}`,
  }),
  // FIX9b F9 — 시간표 캡션.
  decadesCaption: {
    en: 'Themes name a decade’s topic, not its quality.',
    ko: '주제는 그 10년의 화제를 말할 뿐, 좋고 나쁨을 말하지 않아요.',
  },
  lifeTurnTag: { en: 'LIFE TURN', ko: '인생 전환' },
  yearRuns: (year: number, gz: string, same: boolean): Bi => ({
    en: `${year} runs on ${gz}${same ? ' too' : ''}.`,
    ko: same ? `${year}년도 ${gz}의 해예요.` : `${year}년은 ${gz}의 해예요.`,
  }),
  yearLink: { en: 'See it day by day', ko: '하루 단위로 보기' },
  strategyHeading: { en: 'Odds in your favor', ko: '운을 내 편으로' },
  luckyLabel: (en: string, ko: string, hanja: string): Bi => ({
    en: `Lucky colors · ${en} ${hanja}`,
    ko: `행운의 색 · ${ko} ${hanja}`,
  }),
  luckyLabelBare: { en: 'Lucky colors', ko: '행운의 색' },
  alliesNote: {
    en: 'Cheoneul benefactors 天乙 — these signs help at the pivotal moments.',
    ko: '천을귀인 天乙 — 결정적인 순간에 힘이 되어 주는 띠예요.',
  },
  watchNote: {
    en: 'The flow dips here — better for consolidating than for big bets.',
    ko: '흐름이 내려가는 해예요 — 큰 승부보다 다지기에 좋아요.',
  },
} as const

/** 본명 품위 — STARS 칸 보조 줄(문장 중간이라 en 소문자). */
const DIGNITY_WORD: Record<Lang, Record<string, string>> = {
  en: {
    domicile: 'in domicile',
    exaltation: 'exalted',
    detriment: 'in detriment',
    fall: 'in fall',
  },
  ko: { domicile: '자기 자리', exaltation: '고양', detriment: '반대 자리', fall: '추락' },
}

/** 십성 묶음 → 화면 키(영문 슬러그 — en 화면 데이터에 한글 키를 남기지 않는다). */
const GROUP_KEY: Record<string, LifeStrengthKey> = {
  재성: 'wealth',
  관성: 'status',
  인성: 'support',
  식상: 'creativity',
  비겁: 'drive',
}

/** 십성 묶음 한자 — 강점 표 이름 옆. */
const GROUP_HANJA: Record<string, string> = {
  재성: '財',
  관성: '官',
  인성: '印',
  식상: '食傷',
  비겁: '比劫',
}

const ELEMENT_LABEL: Record<SajuElement, Bi> = {
  wood: { en: 'Wood', ko: '목' },
  fire: { en: 'Fire', ko: '화' },
  earth: { en: 'Earth', ko: '토' },
  metal: { en: 'Metal', ko: '금' },
  water: { en: 'Water', ko: '수' },
}
const ELEMENT_ORDER: SajuElement[] = ['wood', 'fire', 'earth', 'metal', 'water']
const ELEMENT_KO_KEY: Record<SajuElement, '목' | '화' | '토' | '금' | '수'> = {
  wood: '목',
  fire: '화',
  earth: '토',
  metal: '금',
  water: '수',
}

const MONTH_EN = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

// ─── 작은 헬퍼 ───────────────────────────────────────────────────────────────

const cap = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
const mm = (n: number): string => String(n).padStart(2, '0')

function stemElement(gz: string): SajuElement {
  return KO_TO_SAJU_ELEMENT[getStemElement(gz.charAt(0))] ?? 'earth'
}
function branchElement(ch: string): SajuElement {
  return KO_TO_SAJU_ELEMENT[getBranchElement(ch)] ?? 'earth'
}

/** 'Ups and downs' → { lead: 'Ups and', last: 'downs' }. 한 단어면 lead ''. */
export function splitLastWord(label: string): { lead: string; last: string } {
  const words = label.trim().split(/\s+/)
  const last = words.pop() ?? ''
  return { lead: words.join(' '), last }
}

/**
 * 본명 점 한 줄 — 'Sun 0°38′ Aries' / '태양 양자리 0°38′'. 상승은 'ASC' / '상승'.
 * 도 · 분이 없으면(출생시각 미상) 별자리만 — 'Moon Leo' / '달 사자자리'.
 */
function pointText(p: LifeStarPoint, lang: Lang): string {
  const body = p.body === 'Ascendant' ? (lang === 'ko' ? '상승' : 'ASC') : planetLabel(p.body, lang)
  const sign = signLabel(p.sign, lang)
  if (typeof p.deg !== 'number' || typeof p.min !== 'number') return `${body} ${sign}`
  const dm = `${p.deg}°${mm(p.min)}′`
  return lang === 'ko' ? `${body} ${sign} ${dm}` : `${body} ${dm} ${sign}`
}

/** 'YYYY-MM-DD' → 'Nov 19, 2026' / '2026년 11월 19일'. */
function longDate(iso: string, lang: Lang): string {
  const [y, m, d] = iso.split('-').map(Number)
  return lang === 'ko' ? `${y}년 ${m}월 ${d}일` : `${MONTH_EN[m - 1]} ${d}, ${y}`
}

function currentDaewoon(daewoon: DestinyDaewoon[]): DestinyDaewoon | undefined {
  return daewoon.find((d) => d.now)
}

// ─── 섹션 ────────────────────────────────────────────────────────────────────

function buildHero(lifetime: DestinyLifetime, lang: Lang): LifeHeroVM {
  const lp = lifetime.lifePattern
  const shape = lp ? (lang === 'ko' ? lp.ko : (lp.en ?? lp.ko)) : ''
  const tagline = lp ? (lang === 'ko' ? lp.tagline : lp.taglineEn) : undefined
  const from = lifetime.birthYear
  const to = lifetime.birthYear + LIFE_READ_YEARS
  const stage = lifetime.lifeStages.find((s) => s.now)
  const turn = lifetime.nextLifeTurn
  return {
    shapeKey: lp?.key ?? null,
    shape,
    h1: splitLastWord(shape),
    range: { from, to, label: `${from}–${to}` },
    lede: tagline ? (lang === 'en' ? `${tagline}.` : tagline) : '',
    now: {
      age: lifetime.nowAge ?? lifetime.currentYear - lifetime.birthYear,
      year: lifetime.currentYear,
      note: stage ? pick(COPY.stageNote(stage.name, stage.nameEn ?? stage.name), lang) : '',
    },
    nextTurn: turn
      ? {
          age: turn.age,
          year: turn.year,
          label: lang === 'ko' ? turn.label : turn.labelEn,
          note: lang === 'ko' ? turn.meaningCore : turn.meaningCoreEn,
        }
      : null,
  }
}

function buildReading(lifetime: DestinyLifetime, lang: Lang): LifeReadingVM | null {
  const lp = lifetime.lifePattern
  if (!lp) return null
  const lead = lang === 'ko' ? lp.lead : lp.leadEn
  const body = lang === 'ko' ? lp.body : lp.bodyEn
  if (!lead) return null
  return { lead, body: body ?? '' }
}

function buildOverlap(
  lifetime: DestinyLifetime,
  lang: Lang,
  todayIso: string | undefined
): LifeOverlapVM {
  const cur = currentDaewoon(lifetime.daewoon)
  const rangeLabel = cur ? pick(COPY.overlapRange(cur.start, cur.end - 1), lang) : null
  const rows: TimingRowVM[] = (lifetime.decadeCross ?? []).map((c) => {
    const saju: SajuCellVM = { text: lang === 'ko' ? c.saju : c.sajuEn }
    if (c.sajuHanja) saju.hanja = c.sajuHanja
    const subParts: string[] = []
    if (c.astroEvent) subParts.push(pick(c.astroEvent, lang))
    if (c.dignity) subParts.push(DIGNITY_WORD[lang][c.dignity])
    if (c.natal) {
      const sign = signLabel(c.natal.sign, lang)
      subParts.push(lang === 'ko' ? `${sign} ${c.natal.deg}°` : `${c.natal.deg}° ${sign}`)
    }
    const stars: StarsCellVM = { text: lang === 'ko' ? c.astro : c.astroEn }
    const glyph = planetGlyph(c.astroEn)
    if (glyph) stars.glyph = glyph
    if (subParts.length) stars.sub = subParts.join(' · ')
    return {
      saju,
      stars,
      mark: c.polarity > 0 ? 'up' : 'down',
      note: cap(lang === 'ko' ? c.meaning : c.meaningEn),
    }
  })
  const first = (lifetime.decadeCross ?? []).find((c) => c.transit && c.natal)
  let caption: string | null = null
  if (first?.transit && first.natal) {
    const planet = planetLabel(first.astroEn, lang)
    const t = first.transit
    const n = first.natal
    const date = todayIso ? longDate(todayIso, lang) : null
    caption =
      lang === 'ko'
        ? `트랜짓 ${planet}은 ${signLabel(t.sign, lang)} ${t.deg}°${mm(t.min)}′${date ? `(${date})` : ''}, 본명 ${planet}은 ${signLabel(n.sign, lang)} ${n.deg}°${mm(n.min)}′에 있어요.`
        : `Transit ${planet} stands at ${t.deg}°${mm(t.min)}′ ${t.sign}${date ? ` (${date})` : ''}, natal ${planet} at ${n.deg}°${mm(n.min)}′ ${n.sign}.`
  }
  return {
    rangeLabel,
    rows,
    empty: rows.length === 0 ? pick(COPY.overlapEmpty, lang) : null,
    caption,
  }
}

function buildTraits(lifetime: DestinyLifetime, lang: Lang): LifeTraitsVM | null {
  const cc = lifetime.crossCheck
  if (!cc) return null
  const rows: LifeTraitRowVM[] = cc.rows[lang].map((r) => {
    const out: LifeTraitRowVM = { key: r.key, axis: r.axis, verdict: r.verdict }
    if (r.saju) {
      out.saju = { ...r.saju }
      if (r.sajuSub) out.saju.sub = pick(COPY.dayMaster(r.sajuSub.dayMaster), lang)
    }
    if (r.stars) {
      out.stars = { ...r.stars }
      if (r.starsSub?.length) {
        const points = r.starsSub.map((p) => ({
          glyph: planetGlyph(p.body),
          text: pointText(p, lang),
        }))
        out.stars.sub = points.map((p) => p.text).join(' · ')
        out.stars.points = points
      }
    }
    if (!r.saju && !r.stars && r.gist) out.phrase = r.gist
    return out
  })
  return {
    tally: cc.tally,
    countLabel: pick(COPY.traitCount(cc.tally.total), lang),
    rows,
    fullReportHref: cc.fullReportHref,
    reportTraitCount: cc.reportTraitCount,
    moreLabel: pick(COPY.traitMore(cc.reportTraitCount), lang),
    caveat: cc.moonSignMayDiffer ? pick(UI.moonSignMayDiffer, lang) : null,
  }
}

function buildStrengths(
  lifetime: DestinyLifetime,
  user: LifetimeViewModelInput['user'],
  lang: Lang
): LifeStrengthsVM | null {
  const radar = lifetime.sibsinRadar
  if (!radar?.length) return null
  const max = Math.max(...radar.map((a) => a.count))
  const top = max > 0 ? radar.find((a) => a.count === max) : undefined
  const tied = max > 0 && radar.filter((a) => a.count === max).length > 1
  const rows: LifeStrengthRowVM[] = radar.map((a) => ({
    key: GROUP_KEY[a.category],
    label: lang === 'ko' ? a.labelKo : a.labelEn,
    hanja: GROUP_HANJA[a.category] ?? '',
    chars: a.chars ?? [],
    count: a.count,
    strongest: a === top,
  }))
  const dm = user.ilgan.hanja
  const estimated = radar.some((a) => a.estimated === true)
  // 숨긴 시주 간지 — 강점 타일 중 시주 천간 · 지지(둘 다 있을 때만).
  const hourChars = radar.flatMap((a) => a.chars ?? []).filter((c) => c.pillar === 'hour')
  const hourStem = hourChars.find((c) => c.part === 'stem')?.ch
  const hourBranch = hourChars.find((c) => c.part === 'branch')?.ch
  const hourGz = hourStem && hourBranch ? `${hourStem}${hourBranch}` : null
  return {
    rows,
    heading: top ? pick(COPY.strongest(top.labelEn, top.labelKo), lang) : null,
    strongest: top ? (lang === 'ko' ? top.labelKo : top.labelEn) : null,
    strongestTied: tied,
    elements: ELEMENT_ORDER.map((key) => ({
      key,
      label: pick(ELEMENT_LABEL[key], lang),
      count: user.elements?.[ELEMENT_KO_KEY[key]] ?? 0,
    })),
    dayMaster: dm,
    estimated,
    caption: pick(
      estimated ? COPY.strengthsEstimated(dm) : COPY.strengthsCaption(dm, hourGz),
      lang
    ),
  }
}

function buildCurve(lifetime: DestinyLifetime, lang: Lang): LifeCurveVM | null {
  const curve = lifetime.lifeCurve
  if (!curve || curve.points.length === 0) return null
  const fromYear = lifetime.birthYear
  const toYear = lifetime.birthYear + LIFE_READ_YEARS
  const inSpan = (age: number) => age >= 0 && age <= LIFE_READ_YEARS
  const points = curve.points.filter((p) => inSpan(p.age))
  const nowAge = curve.nowAge
  const markers: LifeCurveVM['markers'] = []
  if (inSpan(nowAge)) markers.push({ kind: 'now', age: nowAge, year: lifetime.currentYear })
  const crest = curve.now?.nextPeak
  if (crest && inSpan(crest.age)) markers.push({ kind: 'crest', age: crest.age, year: crest.year })
  const peak = lifetime.lifePattern?.peak
  if (peak && inSpan(peak.age)) markers.push({ kind: 'peak', age: peak.age, year: peak.year })
  for (const d of lifetime.lifeStrategy?.caution?.years ?? []) {
    if (inSpan(d.age)) markers.push({ kind: 'dip', age: d.age, year: d.year })
  }
  const eras: LifeCurveVM['eras'] = []
  for (const d of lifetime.daewoon) {
    const from = Math.max(d.start, fromYear)
    const to = Math.min(d.end, toYear)
    if (from < to) eras.push({ from, to, element: stemElement(d.gz.hanja), gz: d.gz.hanja })
  }
  const slope = curve.now?.slope ?? 'plateau'
  return {
    points,
    span: { fromAge: 0, toAge: LIFE_READ_YEARS, fromYear, toYear },
    markers,
    eras,
    heading: {
      main: pick(COPY.curveSlope[slope], lang),
      sub: crest && inSpan(crest.age) ? pick(COPY.curveCrest(crest.age), lang) : null,
    },
    rangeLabel: pick(COPY.curveRange(0, LIFE_READ_YEARS, fromYear, toYear), lang),
    caption: pick(COPY.curveCaption, lang),
  }
}

function buildDecades(lifetime: DestinyLifetime, lang: Lang, calendarHref: string): LifeDecadesVM {
  const readEnd = lifetime.birthYear + LIFE_READ_YEARS
  const turn = lifetime.nextLifeTurn
  const peak = lifetime.lifePattern?.peak
  const thisYear = lifetime.thisYear
  const rows: LifeDecadeRowVM[] = lifetime.daewoon.map((d) => {
    const gz = d.gz.hanja
    const sibsin = d.sibsin && d.sibsin !== '—' ? d.sibsin : ''
    const theme = sibsin ? (lang === 'ko' ? sibsinArea(sibsin) : cap(sibsinAreaEn(sibsin))) : ''
    const ageTo = d.startAge + 9
    const roman =
      lang === 'ko'
        ? `${d.gz.kr} · ${d.startAge}–${ageTo}세`
        : `${cap(d.gz.en)} · age ${d.startAge}–${ageTo}`
    const state: LifeDecadeState = d.now
      ? 'now'
      : d.end <= lifetime.currentYear
        ? 'past'
        : d.start >= readEnd
          ? 'far'
          : 'future'
    const row: LifeDecadeRowVM = {
      gz,
      element: stemElement(gz),
      years: `${d.start}–${d.end - 1}`,
      start: d.start,
      end: d.end,
      theme,
      roman,
      state,
    }
    const holds = (year: number) => year >= d.start && year < d.end
    if (turn && holds(turn.year)) {
      row.lifeTurn = { label: pick(COPY.lifeTurnTag, lang), year: turn.year, age: turn.age }
    }
    if (peak && holds(peak.year)) row.peakNote = lang === 'ko' ? peak.note : peak.noteEn
    if (d.now && thisYear) {
      row.yrow = {
        text: pick(COPY.yearRuns(lifetime.currentYear, thisYear.gz, thisYear.gz === gz), lang),
        link: pick(COPY.yearLink, lang),
        href: calendarHref,
      }
    }
    return row
  })
  const first = lifetime.daewoon[0]
  const last = lifetime.daewoon[lifetime.daewoon.length - 1]
  return {
    heading: pick(COPY.decadesHeading, lang),
    rangeLabel: first && last ? pick(COPY.decadesRange(first.start, last.end - 1), lang) : '',
    rows,
    caption: pick(COPY.decadesCaption, lang),
  }
}

/** 'Position is your wealth — you build steadily inside a role or org.' → h3 · p. */
function splitWealth(style: string, lang: Lang): { h3: string; p: string } {
  const i = style.indexOf(' — ')
  if (i < 0) return { h3: style, p: '' }
  const head = style.slice(0, i).trim()
  const rest = style.slice(i + 3).trim()
  return lang === 'en'
    ? { h3: /[.!?]$/.test(head) ? head : `${head}.`, p: cap(rest) }
    : { h3: head, p: rest }
}

function buildStrategy(lifetime: DestinyLifetime, lang: Lang): LifeStrategyVM | null {
  const st = lifetime.lifeStrategy
  if (!st) return null
  const out: LifeStrategyVM = { heading: pick(COPY.strategyHeading, lang) }
  if (st.lucky) {
    const el = st.lucky.element
    out.lucky = {
      label: el
        ? pick(COPY.luckyLabel(el.en, el.ko, el.hanja), lang)
        : pick(COPY.luckyLabelBare, lang),
      colors: (lang === 'ko' ? st.lucky.colors : st.lucky.colorsEn).join(' · '),
      direction: lang === 'ko' ? st.lucky.direction : st.lucky.directionEn,
      numbers: st.lucky.numbers.join(' · '),
    }
  }
  if (st.guin) {
    out.allies = {
      animals: (lang === 'ko' ? st.guin.animals : st.guin.animalsEn).join(' · '),
      tiles: st.guin.branches.map((ch) => ({ ch, el: branchElement(ch) })),
      note: pick(COPY.alliesNote, lang),
    }
  }
  if (st.wealth) {
    out.wealth = splitWealth(lang === 'ko' ? st.wealth.styleKo : st.wealth.styleEn, lang)
  }
  if (st.caution?.years.length) {
    out.watch = { years: st.caution.years, note: pick(COPY.watchNote, lang) }
  }
  return out
}

function buildShare(lifetime: DestinyLifetime, lang: Lang): LifeShareVM | null {
  const s = lifetime.share
  if (!s) return null
  return {
    typeName: pick(s.crossType, lang),
    lifeShape: s.lifeShape ? pick(s.lifeShape, lang) : null,
    pillars: s.screenPillars,
  }
}

/** 인생 흐름 화면 데이터 — 페이로드만 읽는다(순수 · 결정론). */
export function buildLifetimeViewModel(
  input: LifetimeViewModelInput,
  opts: LifetimeViewModelOptions
): LifetimeViewModel {
  const { lifetime, user } = input
  const { lang } = opts
  return {
    lang,
    hero: buildHero(lifetime, lang),
    reading: buildReading(lifetime, lang),
    overlap: buildOverlap(lifetime, lang, opts.todayIso),
    traits: buildTraits(lifetime, lang),
    strengths: buildStrengths(lifetime, user, lang),
    curve: buildCurve(lifetime, lang),
    decades: buildDecades(lifetime, lang, opts.calendarHref ?? '/calendar'),
    strategy: buildStrategy(lifetime, lang),
    share: buildShare(lifetime, lang),
  }
}
