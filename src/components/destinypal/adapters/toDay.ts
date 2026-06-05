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
import { getGongmang } from '@/lib/saju/shinsal'

// 천간(한자) → 5원소 룩업. destinypal Day 의 jijanggan layer element 산출.
const STEM_TO_ELEMENT: Record<string, '목' | '화' | '토' | '금' | '수'> = {
  甲: '목', 乙: '목',
  丙: '화', 丁: '화',
  戊: '토', 己: '토',
  庚: '금', 辛: '금',
  壬: '수', 癸: '수',
}

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
  /** 본명 일주에서 산출된 공망 2지지 — ['戌','亥'] 등 (항상 2개). */
  natalBranches: [string, string]
  /** 현재 시점에서 활성화된 공망 지지들 (대운/세운/월운/일진 등과 겹친 것). */
  activeBranches: string[]
  /** 활성화의 축 — '일진'/'월운'/'세운'/'대운' 중. */
  activeAxes: Array<'대운' | '세운' | '월운' | '일진'>
  /** 한 줄 의미. */
  note?: string
  /** 활성 여부 (activeBranches.length > 0) — UI compat helper. */
  active: boolean
  /** 활성된 공망 branches — natalBranches 와 같은 의미 (legacy alias). */
  branches: string[]
  /** 활성 reason 한 줄 (legacy alias of note). */
  reason?: string
}

export interface DestinypalDayJijangganLayer {
  /** 그 층의 천간 한자. */
  stem: string
  /** 일간 기준 십신. */
  sibsin: string
  /** 5원소 — '목'/'화'/'토'/'금'/'수'. */
  element: '목' | '화' | '토' | '금' | '수'
  /** 지장간 강도 라벨. */
  layer: '정기' | '중기' | '여기'
}

/**
 * destinypal Day 의 지장간 3층 — 본명 일주(=일지) 의 정기·중기·여기.
 *
 * 백엔드 NatalContext.saju.dayJijanggan (정기/중기/여기 한자) 를 그대로 받아
 * 일간 기준 십신 + 오행 lookup 으로 한 번에 평탄화.
 */
export interface DestinypalDayJijangganObj {
  jeonggi: DestinypalDayJijangganLayer
  junggi?: DestinypalDayJijangganLayer
  yeogi?: DestinypalDayJijangganLayer
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
  /**
   * 공망 — 본명 일주 공망 2지지 + 현재 활성 지지.
   * destinypal DestinyGongmang shape 과 호환.
   */
  gongmang: DestinypalDayGongmang
  /**
   * 본명 일주(=일지) 지장간 — 정기/중기/여기 객체 shape.
   * destinypal DayTier 가 `jijanggan.jeonggi / .junggi / .yeogi` 로 직접 읽음.
   */
  jijanggan: DestinypalDayJijangganObj
  geokgukStatus?: string

  // ── DayTier optional 필드 — adapter 가 빈 배열로라도 채워서 .map() 안전 ──
  /** cross-activation 페어 (DestinyCrossActivation 호환 — 일단 빈 배열로 prefill). */
  crossSignals: DestinypalDayCrossActivation[]
  /** 모든 신호 — UI 가 .allSignals?.length 로 fallback 분기. */
  allSignals: DestinypalDaySignal[]
  /** narrative chip 묶음 — DayTier 가 .map. */
  narrative: Array<{ tag: string; body: string }>
  /** 상위 우호 사유 — CalendarCell.topReasons 그대로. */
  topReasons: string[]
  /** 상위 주의 사유 — CalendarCell.cautions 그대로. */
  cautions: string[]
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
  // cell.signals 의 jijanggan signal 활성 layer 표시용 (보조). primary 는 natal.dayJijanggan.
  let gongmangActiveFromSignal: { branches: string[]; reason?: string } | null = null

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

    // gongmang signal — 활성 정보 보조 capture (primary 는 natal.dayJijanggan).
    if (s.kind === 'gongmang') {
      const branches: string[] = []
      const detailBranches = s.evidence?.detail?.gongmangBranches
      if (Array.isArray(detailBranches)) {
        for (const b of detailBranches) if (typeof b === 'string') branches.push(b)
      }
      gongmangActiveFromSignal = {
        branches,
        reason: stringDetail(s, 'reason') ?? '오늘 시기 지지가 본명 일주 공망에 닿음',
      }
      // 일반 signals 풀에도 넣어 UI 가 카드 그릴 수 있게
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
  const advanced = natal.saju.analyses
  const statusResult = advanced?.geokguk?.statusResult
  const geokgukStatus = geokgukStatusLine(
    advanced?.geokguk?.primary && advanced.geokguk.primary !== '미정' ? advanced.geokguk.primary : undefined,
    statusResult?.status,
    statusResult?.factors?.positive,
    statusResult?.factors?.negative,
  )

  // ── 본명 일주 지장간 3층 (정기/중기/여기) 객체 빌드 ──
  const jijanggan = buildJijangganObj(natal)

  // ── 공망 — 본명 일주에서 산출 + cell.signals 의 gongmang signal 활성 분 합쳐 정리 ──
  const gongmang = buildGongmang(natal, gongmangActiveFromSignal)

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
    // optional 빈 컬렉션 — DayTier 가 .map() / .length 로 무조건 읽음.
    crossSignals: [],
    allSignals: signals,
    narrative: [],
    topReasons: cell.topReasons ?? [],
    cautions: cell.cautions ?? [],
  }
}

/**
 * NatalContext.saju.dayJijanggan (정기/중기/여기 한자) → 객체 shape.
 *
 * 각 층마다 일간 기준 십신 + STEM_TO_ELEMENT 룩업으로 오행 채움.
 * jeonggi 가 없으면 '—' 폴백 단일층으로 채움 (UI 가 jeonggi 를 무조건 읽음).
 */
function buildJijangganObj(natal: NatalContext): DestinypalDayJijangganObj {
  const dm = natal.saju?.dayMaster?.name ?? ''
  const dj = natal.saju.dayJijanggan
  function buildLayer(
    stem: string | undefined,
    layer: '정기' | '중기' | '여기',
  ): DestinypalDayJijangganLayer | undefined {
    if (!stem) return undefined
    return {
      stem,
      sibsin: dm ? safeSibsin(dm, stem) : '—',
      element: STEM_TO_ELEMENT[stem] ?? '토',
      layer,
    }
  }
  const jeonggi = buildLayer(dj?.jeonggi, '정기') ?? {
    stem: '—',
    sibsin: '—',
    element: '토' as const,
    layer: '정기' as const,
  }
  return {
    jeonggi,
    junggi: buildLayer(dj?.junggi, '중기'),
    yeogi: buildLayer(dj?.yeogi, '여기'),
  }
}

/**
 * 본명 일주에서 공망 2지지 산출 (getGongmang) + cell.signals 의 gongmang signal
 * 활성 데이터 합쳐 DestinypalDayGongmang 객체로 정리.
 *
 * activeAxes 는 일진 컨텍스트(가장 빠른 시기) 로 고정 — extractor 가 어떤 axis
 * 로 gongmang 을 점등했는지는 cell.signals.layer / scope 로 결정해도 되지만
 * 현재 풀에는 'daily' 가 표준이라 '일진' 으로 prefill.
 */
function buildGongmang(
  natal: NatalContext,
  active: { branches: string[]; reason?: string } | null,
): DestinypalDayGongmang {
  const dayStem = natal.saju?.pillars?.day?.heavenlyStem?.name ?? ''
  const dayBranch = natal.saju?.pillars?.day?.earthlyBranch?.name ?? ''
  const natalRaw = dayStem && dayBranch ? getGongmang(dayStem, dayBranch) : []
  const natalBranches: [string, string] = [
    natalRaw[0] ?? '—',
    natalRaw[1] ?? '—',
  ]
  const activeBranches = active?.branches ?? []
  const activeAxes: Array<'대운' | '세운' | '월운' | '일진'> =
    activeBranches.length > 0 ? ['일진'] : []
  return {
    natalBranches,
    activeBranches,
    activeAxes,
    note: active?.reason,
    // legacy aliases
    active: activeBranches.length > 0,
    branches: natalBranches,
    reason: active?.reason,
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
