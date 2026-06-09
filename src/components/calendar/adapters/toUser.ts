/**
 * NatalContext → destinypal `user` 객체 adapter.
 *
 * 참고 shape (destinypal data.js):
 *   user: { birth, birthKo, place, sex, score, grade, ilgan, yongsin, huisin,
 *           gyeokguk, gyeokgukEn, gangyak, dominantSibsin, elements, astro,
 *           intro, introEn,
 *           // Phase 3 신규
 *           geokgukStatus, sect, almuten, lots }
 *
 * 정통화 보완 (audit):
 *   - "F등급" 라벨은 그대로 두되 geokgukStatus 라인 별도 노출 ("정인격 · 반성반파")
 *   - "재성 43%" 텍스트는 dominantSibsin 그대로 두되, rootLine (월령/통근) 추가 노출
 *   - astro: Sun/Asc/MC 외 sect ("낮"/"밤") + sect light (Sun/Moon) 표기
 *   - almuten: Almuten Figuris 후보 (가장 dignity score 높은 행성)
 *   - lots: 7대 Arabic Parts (Fortune/Spirit/Eros/Necessity/Courage/Victory/Nemesis)
 */

import type { NatalContext } from '@/lib/calendar-engine/context/types'
import type { ArabicLot, ArabicLotName } from '@/lib/astrology/foundation/arabicParts'
import type { ZodiacKo } from '@/lib/astrology/foundation/types'
import type { DestinyDignityEntry, DestinyAlmutenFiguris, DestinyArabicLot } from '@/types/calendar'
import { ELEMENT_KO, ELEMENT_EN, SIGN_KO, PLANET_KO, geokgukStatusLine, rootLine } from './shared'

export interface DestinypalUserElements {
  목: number
  화: number
  토: number
  금: number
  수: number
}

export interface DestinypalUserAstro {
  sun?: string // 한글: "물병자리"
  asc?: string
  mc?: string
  sunEn?: ZodiacKo // 영문: "Aquarius"
  ascEn?: ZodiacKo
  mcEn?: ZodiacKo
}

export interface DestinypalUserSect {
  /** 'day' | 'night' */
  kind: 'day' | 'night'
  /** 한글 표기 "낮"/"밤" */
  ko: string
  /** sect light — 낮차트=Sun, 밤차트=Moon */
  light: 'Sun' | 'Moon'
  lightKo: string // "태양"/"달"
}

export interface DestinypalUserAlmuten {
  /** 가장 dignity score 높은 행성 (Almuten Figuris 약식). */
  planet: string
  planetKo: string
  sign?: string
  signKo?: string
  score: number
}

export interface DestinypalUserLot {
  name: string // ArabicLotName
  sign: string // ZodiacKo
  signKo: string
  degreeInSign: number // 0..30
  formula: string
}

export interface DestinypalUser {
  birth: string // "1995-02-09 06:40"
  birthKo: string // "1995년 2월 9일 06:40"
  place: string
  sex: '남' | '여' | string
  // 옛 score/grade — 가짜 "종합 점수 S~F" 등급이라 2026-06-06 제거. 사주는
  // 정량 등급으로 압축되지 않는다 (사용자 요청 + 아키텍처 정리).
  ilgan: {
    hanja: string
    kr: string // "신금"
    en: string // "Sin · Yin Metal"
    element: string // "금"
  }
  yongsin: {
    hanja: string // "火·土"
    kr: string // "화·토"
    en: string // "Fire · Earth"
  }
  huisin: {
    hanja: string
    kr: string
    en: string
  }
  gyeokguk: string // "정인격"
  gyeokgukEn: string // "Jeong-in (Direct Resource)"
  gangyak: string // "강(强)" | "약(弱)" | "중화(中和)"
  dominantSibsin: { name: string; pct: number }
  elements: DestinypalUserElements
  astro: DestinypalUserAstro
  intro: string
  introEn: string

  // ── Phase 3 정통화 신규 ──
  /** 격국 성패 라인 — "정인격 · 반성반파 (+편인 보호 / -재성 분탈)" */
  geokgukStatus?: string
  /** 일간 뿌리 정통화 한 줄 — "월령 寅 실령 · 통근 얇음" */
  rootStatus?: string
  /** 섹트 (낮/밤) + sect light — adapter local 표현. */
  sect: DestinypalUserSect
  /**
   * sectKind — DestinyUserSummary.sect (literal 'day'|'night') 와 호환.
   * 일부 tier 가 user.sectKind 를 직접 읽도록 별도 노출.
   */
  sectKind: 'day' | 'night'
  /** Almuten Figuris (가장 dignity 높은 행성) — adapter local 짧은 셔트. */
  almuten?: DestinypalUserAlmuten
  /**
   * Almuten Figuris — DestinyAlmutenFiguris shape (planet + score + runnerUps).
   * 본명 5점 합산 dignity 점수 — UI 가 직접 읽음.
   */
  almutenFiguris: DestinyAlmutenFiguris
  /**
   * 본명 행성 dignities — DestinyDignityEntry[].
   * YearTier 가 dignity 칩/도트 그릴 때 직접 읽음.
   */
  dignities: DestinyDignityEntry[]
  /** 7대 Arabic Parts — adapter local 짧은 셔트. */
  lots: DestinypalUserLot[]
  /**
   * 7대 Arabic Parts — DestinyArabicLot[] (sign + degree + house + sect + korean).
   * UI 가 .house / .sect / .korean 으로 읽음.
   */
  lotsFull: DestinyArabicLot[]
}

// ── 일간 한글 음 (한자→한글) ───────────────────────────────────────────────
const STEM_ILGAN_KR: Record<string, string> = {
  甲: '갑목',
  乙: '을목',
  丙: '병화',
  丁: '정화',
  戊: '무토',
  己: '기토',
  庚: '경금',
  辛: '신금',
  壬: '임수',
  癸: '계수',
}
const STEM_ILGAN_EN: Record<string, string> = {
  甲: 'Gap · Yang Wood',
  乙: 'Eul · Yin Wood',
  丙: 'Byeong · Yang Fire',
  丁: 'Jeong · Yin Fire',
  戊: 'Mu · Yang Earth',
  己: 'Gi · Yin Earth',
  庚: 'Gyeong · Yang Metal',
  辛: 'Sin · Yin Metal',
  壬: 'Im · Yang Water',
  癸: 'Gye · Yin Water',
}
// 한글 일간 → 한자 (사주 엔진 dayMaster.name 은 보통 한글 "신")
const STEM_KO_TO_HAN: Record<string, string> = {
  갑: '甲',
  을: '乙',
  병: '丙',
  정: '丁',
  무: '戊',
  기: '己',
  경: '庚',
  신: '辛',
  임: '壬',
  계: '癸',
}

const GEOKGUK_EN_NAME: Record<string, string> = {
  식신격: 'Siksin (Eating-god)',
  상관격: 'Sanggwan (Hurting-officer)',
  편재격: 'Pyeonjae (Indirect-wealth)',
  정재격: 'Jeongjae (Direct-wealth)',
  편관격: 'Pyeongwan (Indirect-officer)',
  정관격: 'Jeonggwan (Direct-officer)',
  편인격: 'Pyeonin (Indirect-resource)',
  정인격: 'Jeongin (Direct-resource)',
}

const GANGYAK_HANJA: Record<string, string> = {
  strong: '강(强)',
  weak: '약(弱)',
  medium: '중화(中和)',
}

function fiveElements(natal: NatalContext): DestinypalUserElements {
  const fe = natal.saju.fiveElements
  return {
    목: fe?.wood ?? 0,
    화: fe?.fire ?? 0,
    토: fe?.earth ?? 0,
    금: fe?.metal ?? 0,
    수: fe?.water ?? 0,
  }
}

function deriveIlgan(natal: NatalContext) {
  const dm = natal.saju.dayMaster
  const han = dm?.name ? (STEM_KO_TO_HAN[dm.name] ?? dm.name) : ''
  return {
    hanja: han,
    kr: STEM_ILGAN_KR[han] ?? dm?.name ?? '',
    en: STEM_ILGAN_EN[han] ?? dm?.name ?? '',
    element: dm?.element ?? '',
  }
}

function yongsinTriad(natal: NatalContext) {
  const p = natal.saju.yongsin?.primary
  const s = natal.saju.yongsin?.secondary
  const arr = [p, s].filter(Boolean) as string[]
  const hanja = arr.length ? arr.join('·') : ''
  const kr = arr.length ? arr.map((e) => ELEMENT_KO[e] ?? e).join('·') : ''
  const en = arr.length ? arr.map((e) => ELEMENT_EN[e] ?? e).join(' · ') : ''
  return { hanja, kr, en }
}

function huisinTriad(natal: NatalContext) {
  // huisin = secondary yongsin (희신). secondary 가 없으면 빈 셋.
  const s = natal.saju.yongsin?.secondary
  if (!s) return { hanja: '', kr: '', en: '' }
  return {
    hanja: s,
    kr: ELEMENT_KO[s] ?? s,
    en: ELEMENT_EN[s] ?? s,
  }
}

function deriveAstro(natal: NatalContext): DestinypalUserAstro {
  const chart = natal.astro.chart
  const sun = chart.planets.find((p) => p.name === 'Sun')
  const asc = chart.ascendant
  const mc = chart.mc
  return {
    sun: sun ? SIGN_KO[sun.sign] : undefined,
    asc: asc ? SIGN_KO[asc.sign] : undefined,
    mc: mc ? SIGN_KO[mc.sign] : undefined,
    sunEn: sun?.sign,
    ascEn: asc?.sign,
    mcEn: mc?.sign,
  }
}

function deriveSect(natal: NatalContext): DestinypalUserSect {
  const k = natal.astro.sect
  return {
    kind: k,
    ko: k === 'day' ? '낮' : '밤',
    light: k === 'day' ? 'Sun' : 'Moon',
    lightKo: k === 'day' ? '태양' : '달',
  }
}

function deriveAlmuten(natal: NatalContext): DestinypalUserAlmuten | undefined {
  const dignities = natal.astro.dignities
  if (!dignities || dignities.length === 0) return undefined
  // 가장 높은 score 한 명 — Almuten Figuris 의 quick proxy (정통은 다중 요인
  // 가중합이지만 여기선 dignity score 최대값만).
  let best: (typeof dignities)[number] | undefined
  for (const d of dignities) {
    if (!best || d.score > best.score) best = d
  }
  if (!best) return undefined
  return {
    planet: best.planet,
    planetKo: PLANET_KO[best.planet] ?? best.planet,
    sign: best.sign,
    signKo: SIGN_KO[best.sign],
    score: best.score,
  }
}

function deriveLots(lots: ArabicLot[] | undefined): DestinypalUserLot[] {
  if (!lots) return []
  return lots.map((lot) => ({
    name: lot.name,
    sign: lot.sign,
    signKo: SIGN_KO[lot.sign],
    degreeInSign: lot.degreeInSign,
    formula: lot.formula,
  }))
}

const LOT_KO: Record<ArabicLotName, string> = {
  Fortune: '복점·재물',
  Spirit: '영점·진로',
  Eros: '에로스·욕망',
  Necessity: '필연·강제',
  Courage: '용기·실행',
  Victory: '승리·성취',
  Nemesis: '응보·시련',
}

/**
 * NatalContext.astro.lots (house 포함) → DestinyArabicLot[].
 * sect 는 NatalContext.astro.sect 그대로.
 */
function deriveLotsFull(natal: NatalContext): DestinyArabicLot[] {
  const list = natal.astro.lots ?? []
  const sect = natal.astro.sect
  return list.map((lot) => ({
    name: lot.name,
    sign: lot.sign,
    degree: lot.degreeInSign,
    house: lot.house ?? 0,
    sect,
    korean: LOT_KO[lot.name],
  }))
}

/**
 * NatalContext.astro.dignities → DestinyDignityEntry[] (shape 동일 — passthrough).
 */
function deriveDignitiesFull(natal: NatalContext): DestinyDignityEntry[] {
  const list = natal.astro.dignities ?? []
  return list.map((d) => ({
    planet: d.planet,
    sign: d.sign,
    degree: d.degree,
    tiers: d.tiers,
    score: d.score,
  }))
}

/**
 * NatalContext.astro.almutenFiguris → DestinyAlmutenFiguris (planet + score + runnerUps).
 * 결과 없음 → fallback (planet '—', score 0).
 */
function deriveAlmutenFigurisFull(natal: NatalContext): DestinyAlmutenFiguris {
  const af = natal.astro.almutenFiguris
  if (!af || !af.winner) {
    return { planet: '—', score: 0 }
  }
  const winnerScore = af.scores[af.winner] ?? 0
  // runnerUps — winner 외 top 2 점수
  const runnerUps = Object.entries(af.scores)
    .filter(([p]) => p !== af.winner)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([planet, score]) => ({ planet, score }))
  return {
    planet: af.winner,
    score: winnerScore,
    runnerUps,
  }
}

export interface ToUserOptions {
  /** "1995-02-09 06:40" — UI 노출용 birth 문자열. */
  birthDisplay?: string
  /** "서울" 등 출생지명. */
  place?: string
  /** "남"/"여" — saju 입력 sex. */
  sex?: string
  /** 7대 Arabic Lots — astrology.foundation.calculateArabicLots 결과를 그대로 주입. */
  lots?: ArabicLot[]
  /** intro / introEn — lifetimeFlow.intro 그대로 들고 오면 됨. */
  intro?: string
  introEn?: string
}

/**
 * NatalContext → destinypal user 객체.
 *
 * lots / intro 같은 외부 결과는 NatalContext 에 안 들어있는 derive 결과라
 * 별도 옵션으로 받아 평탄화한다.
 */
export function toUser(natal: NatalContext, opts: ToUserOptions = {}): DestinypalUser {
  const advanced = natal.saju.analyses
  // 옛 score/grade — 2026-06-06 폐기.

  // dominant sibsin
  let dominantSibsin: { name: string; pct: number } = { name: '', pct: 0 }
  if (advanced?.sibsin) {
    const cc = advanced.sibsin.categoryCount
    const sum = cc.비겁 + cc.식상 + cc.재성 + cc.관성 + cc.인성
    if (sum > 0) {
      const entries: Array<[string, number]> = [
        ['비겁', cc.비겁],
        ['식상', cc.식상],
        ['재성', cc.재성],
        ['관성', cc.관성],
        ['인성', cc.인성],
      ]
      entries.sort((a, b) => b[1] - a[1])
      dominantSibsin = {
        name: entries[0][0],
        pct: Math.round((entries[0][1] / sum) * 100),
      }
    }
  }

  // gangyak (강약)
  const gangyak = GANGYAK_HANJA[natal.saju.strength] ?? '중화(中和)'

  // gyeokguk
  const gPrimary = advanced?.geokguk?.primary ?? '미정'
  const gyeokguk = gPrimary
  const gyeokgukEn =
    GEOKGUK_EN_NAME[gPrimary] != null ? `${gPrimary} · ${GEOKGUK_EN_NAME[gPrimary]}` : gPrimary

  // geokguk status (Phase 3 — 정통화 보완)
  const statusResult = advanced?.geokguk?.statusResult
  const geokgukStatus = geokgukStatusLine(
    gPrimary !== '미정' ? gPrimary : undefined,
    statusResult?.status,
    statusResult?.factors?.positive,
    statusResult?.factors?.negative
  )

  // root (월령 + 통근)
  const monthBranch = natal.saju.pillars?.month?.earthlyBranch?.name
  const drStatus = advanced?.deukryeong?.status
  const tgStrength = advanced?.tonggeun?.totalStrength
  const rootStatus = rootLine(monthBranch, drStatus, tgStrength)

  // birth strings
  const inp = natal.input
  const birth =
    opts.birthDisplay ??
    (inp
      ? `${inp.year}-${String(inp.month).padStart(2, '0')}-${String(inp.date).padStart(2, '0')} ${String(inp.hour).padStart(2, '0')}:${String(inp.minute).padStart(2, '0')}`
      : '')
  const birthKo = inp
    ? `${inp.year}년 ${inp.month}월 ${inp.date}일 ${String(inp.hour).padStart(2, '0')}:${String(inp.minute).padStart(2, '0')}`
    : ''

  return {
    birth,
    birthKo,
    place: opts.place ?? '',
    sex: opts.sex ?? '',
    ilgan: deriveIlgan(natal),
    yongsin: yongsinTriad(natal),
    huisin: huisinTriad(natal),
    gyeokguk,
    gyeokgukEn,
    gangyak,
    dominantSibsin,
    elements: fiveElements(natal),
    astro: deriveAstro(natal),
    intro: opts.intro ?? '',
    introEn: opts.introEn ?? '',
    geokgukStatus,
    rootStatus,
    sect: deriveSect(natal),
    sectKind: natal.astro.sect,
    almuten: deriveAlmuten(natal),
    almutenFiguris: deriveAlmutenFigurisFull(natal),
    dignities: deriveDignitiesFull(natal),
    lots: deriveLots(opts.lots),
    lotsFull: deriveLotsFull(natal),
  }
}
