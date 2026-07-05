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
import { getGongmang, getTwelveStage } from '@/lib/saju/shinsal'
import { humanizeReason } from './humanizeReason'
import { reconcileDayTone, type DayVerdict } from '@/lib/calendar-engine/derivers/reconcile'
import { LAYER_WEIGHT } from '@/lib/calendar-engine/derivers/constants'
import {
  REASON_LAYERS,
  TONE_LAYERS,
  STATIC_NATAL_KINDS,
} from '@/lib/calendar-engine/signalTaxonomy'
import { pickBySeed } from '@/lib/calendar-engine/derivers/personSeed'
// 12운성 단계 — saju-shinsal 이 'rok-ma' 신살로도 emit 하지만(점수 신호로는 유지),
// 12운성은 twelveStageMatrix 에서 따로 보여주므로 '활성 신살' 칩에는 중복 노출하지
// 않는다(예: 제왕·건록이 신살 목록에 잘못 끼던 문제).
const TWELVE_STAGE_NAMES = new Set(['건록', '제왕'])

// 천간(한자) → 5원소 룩업. destinypal Day 의 jijanggan layer element 산출.
const STEM_TO_ELEMENT: Record<string, '목' | '화' | '토' | '금' | '수'> = {
  甲: '목',
  乙: '목',
  丙: '화',
  丁: '화',
  戊: '토',
  己: '토',
  庚: '금',
  辛: '금',
  壬: '수',
  癸: '수',
}

export interface DestinypalDaySignal {
  cat: string // 'saju/shinsal' | 'saju/pillar-sibsin' | 'astro/transit' | …
  label: string
  romaji?: string
  polarity: number // -3..+3 (캡 적용)
  kind?: string // raw signal kind (디버그/필터용)
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
  totalSignals: number
  oneLine: string
  /** 한 줄 요약 영문 — 클라이언트 로케일 토글용(서버언어 고정 방지). */
  oneLineEn: string
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
  /** 상위 우호 사유(KO). */
  topReasons: string[]
  /** 상위 우호 사유(EN) — 토글용. */
  topReasonsEn: string[]
  /** 상위 주의 사유(KO). */
  cautions: string[]
  /** 상위 주의 사유(EN) — 토글용. */
  cautionsEn: string[]
  /** 본명 4기둥(천간) × 일진 지지 12운성 — getTwelveStage 정통 계산(기둥별 실제값). */
  twelveStageMatrix: TwelveStageCell[]
  /** 출력 화해 verdict — 헤드라인·한줄·칩 톤 단일 권위 (reconcile.ts). */
  dayTone: DayVerdict
}

/** 본명 한 기둥의 천간이 일진 지지에 대해 갖는 12운성. */
export interface TwelveStageCell {
  pillar: string // 年 月 日 時
  stem: string // 본명 기둥 천간 (한자)
  branch: string // 일진 지지 (한자)
  stage: string // 12운성 (장생/목욕/…)
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
// 칩·짧은 라벨 슬롯이라 한 단어 평어 — '긴장각/대립각' 류 각(角) 조어는 용어투라
// 교체(감사 갭 #4). 긴 문장 슬롯의 관계 묘사는 humanizeReason.ASPECT_PLAIN 담당.
const ASPECT_KO: Record<string, string> = {
  conjunction: '겹침',
  sextile: '순풍',
  square: '마찰',
  trine: '맞물림',
  opposition: '맞섬',
  semisextile: '스침',
  quincunx: '어긋남',
  quintile: '퀸타일',
  biquintile: '바이퀸타일',
  sesquiquadrate: '세스큐쿼드레이트',
}

const PLANET_GLYPH: Record<string, string> = {
  Sun: '☉',
  Moon: '☽',
  Mercury: '☿',
  Venus: '♀',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
  Uranus: '♅',
  Neptune: '♆',
  Pluto: '♇',
}

export interface ToDayOptions {
  /** 대상 일자 CalendarCell. */
  cell: CalendarCell
  /** 본명 컨텍스트. */
  natal: NatalContext
  /** 일진 ganji (한자/한글) — 미지정 시 cell 의 datetime 으로 60갑자 환산 시도. */
  iljinStem?: string
  iljinBranch?: string
  /** 신살 polarity cap 적용 여부 — 기본 true (정통화 보완). */
  applyShinsalCap?: boolean
  /**
   * 그날 일진+시진 층 점수(0~100, deriveLayeredScores.daily). 주어지면 day.score 를
   * 절대 derivedScore 대신 이 층별 값으로 — "그날 그사람에게 좋은/나쁜".
   */
  favorScore?: number
  /** 로케일 — topReasons/cautions 를 ko/en 으로. 기본 'ko'. */
  lang?: 'ko' | 'en'
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
  // 문구 회전용 — 큐레이션 사유 층(월·일·시·정점)의 impact net.
  let reasonNet = 0
  // 화해(tense/bright) 판정용 — *그날 고유* 층(daily·instant)만. 월운·시진의
  // 상수 베이스가 그날 흉 신호를 덮어 bright 상시 발동하던 문제 교정(TONE_LAYERS).
  let toneNet = 0

  for (const s of cell.signals) {
    const polarity = clampPolarity(maybeCap(s, applyCap))
    if (!STATIC_NATAL_KINDS.has(s.kind) && REASON_LAYERS.has(s.layer)) {
      reasonNet += s.polarity * s.weight * (LAYER_WEIGHT[s.layer] ?? 0.5)
      if (TONE_LAYERS.has(s.layer)) {
        toneNet += s.polarity * s.weight * (LAYER_WEIGHT[s.layer] ?? 0.5)
      }
    }
    const cat = KIND_TO_CAT[s.kind] ?? s.source + '/' + s.kind

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

    // 신살 active 라벨 — 12운성(건록·제왕)은 신살이 아니므로 칩에서 제외(12운성 매트릭스 노출).
    if (
      s.kind === 'shinsal' &&
      s.evidence?.shinsalName &&
      !TWELVE_STAGE_NAMES.has(s.evidence.shinsalName)
    ) {
      shinsalActiveSet.add(s.evidence.shinsalName)
    }

    // applied-pattern
    if (s.kind === 'applied-pattern') {
      appliedPatterns.push({
        id: s.id,
        name: s.name,
        body:
          typeof s.evidence?.detail?.body === 'string'
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
    })
  }

  // 본명 격국 status (Phase 3)
  const advanced = natal.saju.analyses
  const statusResult = advanced?.geokguk?.statusResult
  const geokgukStatus = geokgukStatusLine(
    advanced?.geokguk?.primary && advanced.geokguk.primary !== '미정'
      ? advanced.geokguk.primary
      : undefined,
    statusResult?.status,
    statusResult?.factors?.positive,
    statusResult?.factors?.negative
  )

  // ── 본명 일주 지장간 3층 (정기/중기/여기) 객체 빌드 ──
  const jijanggan = buildJijangganObj(natal)

  // ── 공망 — 본명 일주에서 산출 + cell.signals 의 gongmang signal 활성 분 합쳐 정리 ──
  const gongmang = buildGongmang(natal, gongmangActiveFromSignal)

  // 본명 4기둥(천간) × 일진 지지 → 기둥별 실제 12운성. (placeholder 아님 — getTwelveStage 정통)
  const iljinBranchHan = opts.iljinBranch ?? (iljin.hanja ? iljin.hanja[1] : '') ?? ''
  const pillarsForStage = natal.saju?.pillars as unknown as
    | Record<string, { heavenlyStem?: { name?: string } }>
    | undefined
  const PILLAR_LABELS: Array<[string, string]> = [
    ['year', '年'],
    ['month', '月'],
    ['day', '日'],
    ['time', '時'],
  ]
  const twelveStageMatrix: TwelveStageCell[] = iljinBranchHan
    ? PILLAR_LABELS.map(([key, label]) => {
        const stem = pillarsForStage?.[key]?.heavenlyStem?.name ?? ''
        return {
          pillar: label,
          stem,
          branch: iljinBranchHan,
          stage: stem ? getTwelveStage(stem, iljinBranchHan) : '—',
        }
      })
    : []

  // 상대 우호도 우선(그 사람 분포 백분위) — 없으면 절대 derivedScore 폴백.
  const shownScore = Math.round(opts.favorScore ?? cell.derivedScore)
  // 양쪽 로케일을 함께 산출 — DayTier 가 클라이언트 로케일로 고른다(서버언어로
  // 굳어 토글 시 한/영이 섞이던 문제 해소). 길이는 동일하므로 reconcile 에 무해.
  const topReasons = (cell.topReasons ?? []).map((r) => humanizeReason(r, 'ko'))
  const topReasonsEn = (cell.topReasonsEn ?? []).map((r) => humanizeReason(r, 'en'))
  const cautions = (cell.cautions ?? []).map((r) => humanizeReason(r, 'ko'))
  const cautionsEn = (cell.cautionsEn ?? []).map((r) => humanizeReason(r, 'en'))

  // ── 출력 화해 — 점수 밴드 ↔ 그날 고유 신호 net 을 한 verdict 로 묶는다(단일 권위). ──
  const dayTone = reconcileDayTone({
    score: shownScore,
    reasonNet: toneNet,
    hasGoodReason: topReasons.length > 0,
    hasCautionReason: cautions.length > 0,
  })

  return {
    date: dateIso,
    dateKo,
    iljin,
    iljinSibsin,
    score: shownScore,
    totalSignals: cell.signals.length,
    oneLine: deriveOneLine(dayTone, shownScore + reasonNet, 'ko'),
    oneLineEn: deriveOneLine(dayTone, shownScore + reasonNet, 'en'),
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
    topReasons,
    topReasonsEn,
    cautions,
    cautionsEn,
    twelveStageMatrix,
    dayTone,
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
    layer: '정기' | '중기' | '여기'
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
  active: { branches: string[]; reason?: string } | null
): DestinypalDayGongmang {
  const dayStem = natal.saju?.pillars?.day?.heavenlyStem?.name ?? ''
  const dayBranch = natal.saju?.pillars?.day?.earthlyBranch?.name ?? ''
  const natalRaw = dayStem && dayBranch ? getGongmang(dayStem, dayBranch) : []
  const natalBranches: [string, string] = [natalRaw[0] ?? '—', natalRaw[1] ?? '—']
  const activeBranches = active?.branches ?? []
  const isActive = activeBranches.length > 0
  const activeAxes: Array<'대운' | '세운' | '월운' | '일진'> = isActive ? ['일진'] : []
  // note 는 실제 활성(닿은 지지가 있을 때)만 — 비활성인데 "공망에 닿음" 문구가
  // 남아 칩(활성 없음)과 모순되던 문제 방지.
  const note = isActive ? active?.reason : undefined
  return {
    natalBranches,
    activeBranches,
    activeAxes,
    note,
    // legacy aliases
    active: isActive,
    branches: natalBranches,
    reason: note,
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
  try {
    return getSibsinKo(dm, stem) || '—'
  } catch {
    return '—'
  }
}

function stringDetail(s: ActiveSignal, key: string): string | undefined {
  const v = s.evidence?.detail?.[key]
  return typeof v === 'string' ? v : undefined
}

// 톤별 한 줄 verdict 풀 — 사람마다(점수/사유 net) 다른 문장이 나오도록 rot 로 회전.
// 옛 버전은 topReasons[0](칩 라벨)을 그대로 반환해 '↑ 이달 · …(게자리)' 같은 내부
// 마커가 헤드라인에 새고, 풀이 톤당 1문장이라 사람마다 같은 줄로 붕괴했다.
export const ONE_LINE_POOL = {
  positive: {
    ko: [
      '흐름이 등을 밀어주는 하루.',
      '내디딘 만큼 받쳐주는 하루.',
      '문이 잘 열리는 하루 — 먼저 움직여보세요.',
      '하려던 일에 바람이 붙는 하루.',
      '연락도 제안도 잘 통하는 하루.',
      '작게라도 한 걸음 내딛기 좋은 하루.',
    ],
    en: [
      'The current is at your back today.',
      'A day that rewards stepping forward.',
      'Doors open easily — make the first move.',
      'A tailwind for what you set out to do.',
      'Reaching out and proposing land well today.',
      'A good day to take even a small step.',
    ],
  },
  caution: {
    ko: [
      '추진보다 정비가 어울리는 하루.',
      '한 박자 천천히 가면 탈이 없는 하루.',
      '큰 결정은 하루 미뤄도 좋은 하루.',
      '무리한 약속·지출은 접어두는 하루.',
      '부딪힘이 생기기 쉬우니 말은 둥글게.',
      '지키고 다듬는 데 힘을 쓰는 하루.',
    ],
    en: [
      'A day better for upkeep than pushing.',
      'Ease off a beat and the day stays smooth.',
      'Big calls can wait a day.',
      'Hold off on overreach and big spends.',
      'Friction comes easy — keep words soft.',
      'Spend today guarding and refining.',
    ],
  },
  mixed: {
    ko: [
      '좋고 나쁨이 함께 있는 하루 — 잘 풀리는 쪽에 집중하세요.',
      '오르내림이 있는 하루 — 무게중심만 지키세요.',
      '맑았다 흐렸다 하는 하루 — 흐름 따라 가볍게.',
      // 평탄("고른/기복 없이") 변형은 금지 — mixed 후크가 변동성("딱 갈려")을 말하므로
      // 같은 화면에서 모순됐다(감사). mixed 풀은 전부 변동성 프레임으로 유지한다.
      '풀리는 쪽과 막히는 쪽이 또렷이 갈리는 하루.',
      '되는 일에 힘을 싣고 안 되는 일은 흘려보내요.',
      '오르내림을 타면 무난히 지나가는 하루.',
    ],
    en: [
      'Highs and lows are mixed — lean on what flows.',
      'Ups and downs today — just hold your center.',
      'Sun and clouds trade off — move light with it.',
      'A day that splits clearly between what flows and what stalls.',
      'Back what works, let the rest pass.',
      'Ride the swings and the day passes fine.',
    ],
  },
} as const

/**
 * 한 줄 요약 — 화해된 톤별 풀에서 rot(점수+사유 net)으로 회전 선택. 톤은 verdict 가
 * 권위(positive/caution/mixed). 칩 라벨을 직접 노출하지 않아 마커 누수가 없고,
 * 사람마다 rot 가 달라 같은 톤이어도 문장이 갈린다.
 */
function deriveOneLine(verdict: DayVerdict, rot: number, lang: 'ko' | 'en' = 'ko'): string {
  const ko = lang !== 'en'
  const tone =
    verdict.tone === 'positive' ? 'positive' : verdict.tone === 'caution' ? 'caution' : 'mixed'
  const pool = ONE_LINE_POOL[tone][ko ? 'ko' : 'en']
  return pickBySeed(pool, rot)
}

/**
 * 셀 → 화해 verdict + 한 줄(양 로케일) — 월 리드아웃과 일(日) 티어의 *단일 소스*.
 *
 * 점수가 이미 월 모집단(layered.daily)에서 오듯, 톤·문장도 같은 월 셀 신호에서
 * 파생시킨다. 예전엔 월 리드아웃(toneMeaningFor 풀)과 일 화면(ONE_LINE_POOL)이
 * 다른 풀·다른 톤 산식이라 같은 날의 문장이 두 화면에서 달랐다. 이제 두 화면이
 * 같은 (cell, favorScore) 입력으로 이 함수를 지나므로 문장이 그대로 이어진다.
 */
export function reconcileCellOneLine(
  cell: CalendarCell,
  favorScore?: number
): { dayTone: DayVerdict; score: number; oneLine: string; oneLineEn: string } {
  // toDay 본문과 동일 산식 — reasonNet(문구 회전)·toneNet(화해 판정) 분리.
  let reasonNet = 0
  let toneNet = 0
  for (const s of cell.signals) {
    if (!STATIC_NATAL_KINDS.has(s.kind) && REASON_LAYERS.has(s.layer)) {
      reasonNet += s.polarity * s.weight * (LAYER_WEIGHT[s.layer] ?? 0.5)
      if (TONE_LAYERS.has(s.layer)) {
        toneNet += s.polarity * s.weight * (LAYER_WEIGHT[s.layer] ?? 0.5)
      }
    }
  }
  const score = Math.round(favorScore ?? cell.derivedScore)
  const dayTone = reconcileDayTone({
    score,
    reasonNet: toneNet,
    hasGoodReason: (cell.topReasons ?? []).length > 0,
    hasCautionReason: (cell.cautions ?? []).length > 0,
  })
  return {
    dayTone,
    score,
    oneLine: deriveOneLine(dayTone, score + reasonNet, 'ko'),
    oneLineEn: deriveOneLine(dayTone, score + reasonNet, 'en'),
  }
}
