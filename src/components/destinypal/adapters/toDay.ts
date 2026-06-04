/**
 * Day 전체 (193 signals 풀) → destinypal `day` 객체 adapter.
 *
 * destinypal day:
 *   { date, dateKo, iljin, iljinSibsin, score, themes[5], totalSignals,
 *     oneLine, signals[], transits[], shinsalActive[],
 *     // Phase 3 신규
 *     appliedPatterns, crossActivations, gongmang, jijanggan, geokgukStatus }
 *
 * 입력:
 *   - 대상 날짜 CalendarCell (그 날의 모든 ActiveSignal + derivedScore + themeScores)
 *   - NatalContext (geokgukStatus / 공망 anchor 등 본명 컨텍스트)
 *
 * Phase 3 신규 필드:
 *   - appliedPatterns: kind === 'applied-pattern' (상관견관·식신제살 등)
 *   - crossActivations: kind === 'cross-activation' (사주×점성 동시 페어)
 *   - gongmang: kind === 'gongmang'
 *   - jijanggan: kind === 'jijanggan' (지장간 3층 활성)
 *   - geokgukStatus: 본명 격국 status (그 날 active 인지 + 이유)
 *
 * 정통화 보완:
 *   - 신살 polarity cap (common ±2, classical-noble ±3) — capShinsalPolarity 적용
 */

import type { CalendarCell, ActiveSignal } from '@/lib/calendar-engine/types'
import type { NatalContext } from '@/lib/calendar-engine/context/types'
import {
  toGanji,
  type Ganji,
  capShinsalPolarity,
  PLANET_KO,
  geokgukStatusLine,
  ymdFromIso,
} from './shared'
import { getSibsinKo } from '@/lib/saju/cycleRelations'

export interface DestinypalDayThemeBar {
  key: 'love' | 'money' | 'career' | 'health' | 'growth'
  ko: string
  v: number
}

export interface DestinypalDaySignal {
  cat: string // 'saju/shinsal' | 'saju/pillar-sibsin' | 'astro/transit' | …
  label: string
  romaji?: string
  polarity: number // -3..+3 (캡 적용)
  kind?: string // raw signal kind (디버그/필터용)
  themes?: string[]
}

export interface DestinypalDayTransit {
  body: string // "Mercury"
  bodyKo?: string // "수성"
  aspect: string // "합" / "사각" / "삼각"
  target: string // "본명 Ascendant"
  glyph?: string
  polarity: number
}

export interface DestinypalDayAppliedPattern {
  id: string
  name: string
  body?: string
  polarity: number
}

export interface DestinypalDayCrossActivation {
  signalId: string
  name: string
  sajuLine?: string
  astroLine?: string
  meaning?: string
  polarity: number
}

export interface DestinypalDayGongmang {
  active: boolean
  branches: string[] // 본명 일주 공망 2지지
  reason?: string // "오늘 일진 지지 ↔ 본명 공망 지지"
}

export interface DestinypalDayJijangganLayer {
  branch: string // 그 날 지지
  layer: '여기' | '중기' | '정기'
  stem: string // 그 층의 천간
  sibsin: string // 일간 vs 이 천간 십신
  weight: number // 0.35 / 0.50 / 0.70
}

export interface DestinypalDay {
  date: string // "2026-06-15"
  dateKo: string // "2026년 6월 15일"
  iljin: Ganji
  iljinSibsin: string // 일간 vs 일진 천간 십신
  score: number
  themes: DestinypalDayThemeBar[]
  totalSignals: number
  oneLine: string
  signals: DestinypalDaySignal[]
  transits: DestinypalDayTransit[]
  shinsalActive: string[]

  // ── Phase 3 정통화 ──
  appliedPatterns: DestinypalDayAppliedPattern[]
  crossActivations: DestinypalDayCrossActivation[]
  gongmang?: DestinypalDayGongmang
  jijanggan: DestinypalDayJijangganLayer[]
  geokgukStatus?: string
}

const THEME_KO: Record<DestinypalDayThemeBar['key'], string> = {
  love: '재성·연애',
  money: '재물',
  career: '관성·일',
  health: '건강',
  growth: '성장',
}

// signal.kind → cat 라벨
const KIND_TO_CAT: Record<string, string> = {
  shinsal: 'saju/shinsal',
  hyeongchung: 'saju/hyeongchung',
  'pillar-sibsin': 'saju/pillar-sibsin',
  'tonggeun-shift': 'saju/tonggeun-shift',
  'saju-pattern': 'saju/saju-pattern',
  jijanggan: 'saju/jijanggan',
  'geokguk-status': 'saju/geokguk-status',
  gongmang: 'saju/gongmang',
  'applied-pattern': 'saju/applied-pattern',
  transit: 'astro/transit',
  eclipse: 'astro/eclipse',
  progression: 'astro/progression',
  'progressed-moon': 'astro/progressed-moon',
  'solar-return': 'astro/solar-return',
  'lunar-return': 'astro/lunar-return',
  profection: 'astro/profection',
  'zodiacal-releasing': 'astro/zodiacal-releasing',
  lifecycle: 'astro/lifecycle',
  electional: 'astro/electional',
  'moon-phase': 'astro/moon-phase',
  'void-of-course': 'astro/void-of-course',
  'fixed-star': 'astro/fixed-star',
  'arabic-part': 'astro/arabic-part',
  'house-transit': 'astro/house-transit',
  'angle-contact': 'astro/angle-contact',
  midpoint: 'astro/midpoint',
  asteroid: 'astro/asteroid',
  'solar-arc': 'astro/solar-arc',
  draconic: 'astro/draconic',
  harmonic: 'astro/harmonic',
  'cross-activation': 'cross/activation',
}

// 한국어 어스펙트 (transit signal 의 evidence.aspectType → 한글 라벨).
const ASPECT_KO: Record<string, string> = {
  conjunction: '합',
  sextile: '섹스타일',
  square: '사각',
  trine: '삼각',
  opposition: '대립',
  semisextile: '반섹스타일',
  quincunx: '퀸컹스',
  quintile: '퀸타일',
  biquintile: '바이퀸타일',
  sesquiquadrate: '세스큐쿼드레이트',
}

const PLANET_GLYPH: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
}

export interface ToDayOptions {
  /** 대상 일자 CalendarCell. */
  cell: CalendarCell
  /** 본명 컨텍스트. */
  natal: NatalContext
  /** 일진 ganji (한자/한글) — 미지정 시 cell 의 datetime 으로 60갑자 환산 시도. */
  iljinStem?: string
  iljinBranch?: string
  /** oneLine — 한 줄 요약. 미지정 시 derive 함수가 만든 결과 직주입 가능. */
  oneLine?: string
  /** 신살 polarity cap 적용 여부 — 기본 true (정통화 보완). */
  applyShinsalCap?: boolean
}

/**
 * CalendarCell + NatalContext → destinypal day.
 */
export function toDay(opts: ToDayOptions): DestinypalDay {
  const { cell, natal } = opts
  const applyCap = opts.applyShinsalCap !== false
  const dateIso = cell.datetime.slice(0, 10)
  const ymd = ymdFromIso(cell.datetime)
  const dateKo = `${ymd.y}년 ${ymd.m}월 ${ymd.d}일`

  const dm = natal.saju?.dayMaster?.name ?? ''

  // 일진 ganji
  let iljin: Ganji = { hanja: '', kr: '', en: '' }
  let iljinSibsin = '—'
  if (opts.iljinStem && opts.iljinBranch) {
    iljin = toGanji(opts.iljinStem, opts.iljinBranch)
    iljinSibsin = dm ? safeSibsin(dm, opts.iljinStem) : '—'
  }

  // signals 평탄화
  const signals: DestinypalDaySignal[] = []
  const transits: DestinypalDayTransit[] = []
  const shinsalActiveSet = new Set<string>()
  const appliedPatterns: DestinypalDayAppliedPattern[] = []
  const crossActivations: DestinypalDayCrossActivation[] = []
  const jijanggan: DestinypalDayJijangganLayer[] = []
  let gongmang: DestinypalDayGongmang | undefined

  for (const s of cell.signals) {
    const polarity = clampPolarity(maybeCap(s, applyCap))
    const cat = KIND_TO_CAT[s.kind] ?? (s.source + '/' + s.kind)

    // transit → DayTransit 평탄화
    if (s.kind === 'transit') {
      const planets = s.evidence?.planets ?? []
      const body = planets[0] ?? ''
      const target = planets[1] ?? ''
      const aspectType = s.evidence?.aspectType ?? ''
      transits.push({
        body,
        bodyKo: PLANET_KO[body],
        aspect: ASPECT_KO[aspectType] ?? aspectType,
        target: target ? `본명 ${target}` : '',
        glyph: PLANET_GLYPH[body],
        polarity,
      })
      continue
    }

    // 신살 active 라벨
    if (s.kind === 'shinsal' && s.evidence?.shinsalName) {
      shinsalActiveSet.add(s.evidence.shinsalName)
    }

    // applied-pattern
    if (s.kind === 'applied-pattern') {
      appliedPatterns.push({
        id: s.id,
        name: s.name,
        body: typeof s.evidence?.detail?.body === 'string'
          ? (s.evidence.detail.body as string)
          : undefined,
        polarity,
      })
      continue
    }

    // cross-activation
    if (s.kind === 'cross-activation') {
      crossActivations.push({
        signalId: s.id,
        name: s.name,
        sajuLine: stringDetail(s, 'sajuName'),
        astroLine: stringDetail(s, 'astroName'),
        meaning: stringDetail(s, 'meaning'),
        polarity,
      })
      continue
    }

    // gongmang
    if (s.kind === 'gongmang') {
      const branches: string[] = []
      const detailBranches = s.evidence?.detail?.gongmangBranches
      if (Array.isArray(detailBranches)) {
        for (const b of detailBranches) if (typeof b === 'string') branches.push(b)
      }
      gongmang = {
        active: true,
        branches,
        reason: stringDetail(s, 'reason') ?? '오늘 시기 지지가 본명 일주 공망에 닿음',
      }
      // 일반 signals 풀에도 넣어 UI 가 카드 그릴 수 있게
    }

    // jijanggan
    if (s.kind === 'jijanggan') {
      const detail = s.evidence?.detail ?? {}
      const branch = stringDetail(s, 'branch') ?? ''
      const layer = (stringDetail(s, 'layer') ?? '정기') as DestinypalDayJijangganLayer['layer']
      const stem = stringDetail(s, 'stem') ?? ''
      const weight =
        typeof detail.weight === 'number'
          ? (detail.weight as number)
          : layer === '정기' ? 0.7 : layer === '중기' ? 0.5 : 0.35
      const sib = dm && stem ? safeSibsin(dm, stem) : '—'
      jijanggan.push({ branch, layer, stem, sibsin: sib, weight })
    }

    signals.push({
      cat,
      label: s.name,
      romaji: undefined,
      polarity,
      kind: s.kind,
      themes: s.themes,
    })
  }

  // themes 5축
  const ts = cell.themeScores ?? {}
  const themes: DestinypalDayThemeBar[] = (Object.keys(THEME_KO) as DestinypalDayThemeBar['key'][]).map((k) => ({
    key: k,
    ko: THEME_KO[k],
    v: Math.round((ts as Record<string, number | undefined>)[k] ?? 50),
  }))

  // 본명 격국 status (Phase 3)
  const advanced = natal.saju.advancedAnalysis
  const statusResult = advanced?.geokguk?.statusResult
  const geokgukStatus = geokgukStatusLine(
    advanced?.geokguk?.primary && advanced.geokguk.primary !== '미정' ? advanced.geokguk.primary : undefined,
    statusResult?.status,
    statusResult?.factors?.positive,
    statusResult?.factors?.negative,
  )

  return {
    date: dateIso,
    dateKo,
    iljin,
    iljinSibsin,
    score: Math.round(cell.derivedScore),
    themes,
    totalSignals: cell.signals.length,
    oneLine: opts.oneLine ?? deriveOneLine(cell),
    signals,
    transits,
    shinsalActive: Array.from(shinsalActiveSet),
    appliedPatterns,
    crossActivations,
    gongmang,
    jijanggan,
    geokgukStatus,
  }
}

function maybeCap(s: ActiveSignal, applyCap: boolean): number {
  if (!applyCap) return s.polarity
  if (s.kind !== 'shinsal') return s.polarity
  const name = s.evidence?.shinsalName ?? s.name
  return capShinsalPolarity(name, s.polarity)
}

function clampPolarity(n: number): number {
  if (n > 3) return 3
  if (n < -3) return -3
  return n
}

function safeSibsin(dm: string, stem: string): string {
  try { return getSibsinKo(dm, stem) || '—' } catch { return '—' }
}

function stringDetail(s: ActiveSignal, key: string): string | undefined {
  const v = s.evidence?.detail?.[key]
  return typeof v === 'string' ? v : undefined
}

function deriveOneLine(cell: CalendarCell): string {
  const top = cell.topReasons?.[0]
  if (top) return top
  return cell.derivedScore >= 60
    ? '흐름이 우호적인 하루.'
    : cell.derivedScore <= 35
      ? '추진보다 정비가 어울리는 하루.'
      : '큰 굴곡 없이 흘러가는 하루.'
}
