'use client'

/* ============================================================
   destinypal · MonthTier
   ── 1달(月運) · MONTHLY 카드
   ── 직역 출처: destinypal-extracted/js/tiers/month.jsx (142 lines)
   ──
   ── 원본 보존:
   ──   - cal-head + 월운 Ganji
   ──   - 30일 calendar heatmap (intensity glow)
   ──   - mark 5종 (best ✦ / avoid ✕ / converge ✶ / caution △ / good ·) + focus
   ──   - ThemeBars 5축
   ──   - 핵심 이벤트 (BEST/AVOID/주의/길일)
   ──   - narrative 8 cards
   ──   - converge day (수렴 일)
   ──   - dive 버튼
   ──
   ── 보강 (디자인이 우리 데이터에 안 맞으면 합리적으로 매핑):
   ──   1. 실데이터 매핑: cell.intensity = cell.derivedScore × 0.01
   ──   2. mark 4종 추가: phase (◐) / voc (회색 띠) / return (○) / lifecycle (◇)
   ──   3. 응용패턴 daily count 블록 (재생관 18일 등 chip)
   ──   4. narrative source 메타 (어느 derivers)
   ──   5. 조후 강조 박스 (巳월 → 수 절실)
   ──   6. converge에 cross-activation A등급 매핑 의미 적용
   ──   7. 월운 sibsin 라벨 ("甲(정재) / 午(편관) — 재생관 흐름")
   ──   8. ZR L2 progress 바 (narrative 위)
   ============================================================ */

import type { CSSProperties, ReactNode } from 'react'
import type {
  DestinyMonth,
  DestinyCalendarCell,
  DestinyDayMark,
  TaggedNarrative,
} from '@/types/calendar'
import { Ganji } from '../atoms/Ganji'
import styles from './MonthTier.module.css'
import { CrossingList } from '@/components/calendar/atoms/CrossingList'
import summaryStyles from '@/components/calendar/atoms/TierSummary.module.css'
import { useI18n } from '@/i18n/I18nProvider'
import { SIBSIN_EN } from '@/lib/saju/sibsinLabels'
import { toneMeaningFor, type MeaningTone } from '@/lib/calendar-engine/derivers/toneMeaning'

const MONTH_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

// ============================================================================
// Props
// ============================================================================

export interface MonthTierProps {
  month: DestinyMonth
  onDive: (focusDay: number) => void
  onRise: () => void
}

// ============================================================================
// 보강 #2 — extended mark set (원본은 5종, 우리는 9종까지 지원)
// ============================================================================

type ExtendedMark =
  | DestinyDayMark // 'caution' | 'avoid' | 'good' | 'best' | 'converge' | 'focus'
  | 'phase' // 보강: 월상 phase 마디 (보름/그믐)
  | 'return' // 보강: lunar return 일
  | 'lifecycle' // 보강: 12운성 lifecycle 전환일

const STAR_GLYPH: Record<string, string> = {
  best: '✦',
  avoid: '✕',
  converge: '✶',
  caution: '△',
  good: '·',
  // 보강 mark 4종
  phase: '◐',
  return: '○',
  lifecycle: '◇',
}

// ============================================================================
// 보강 #1 — derivedScore → intensity (백엔드 0..100 → UI 0..1 매핑)
// 원본 data.js dayIntensity() 의사난수를 우리 실데이터로 치환.
// ============================================================================

function cellIntensity(cell: DestinyCalendarCell): number {
  // adapter 가 이미 intensity = score/100 으로 채워뒀지만,
  // score 가 있고 intensity 가 0 인 엣지 케이스를 한 번 더 보정.
  if (typeof cell.score === 'number' && cell.intensity === 0) {
    return Math.max(0, Math.min(1, cell.score / 100))
  }
  return Math.max(0, Math.min(1, cell.intensity))
}

// ============================================================================
// intensity → starlight glow (원본 month.jsx cellGlow() 그대로 포팅, +ink tone)
// ============================================================================

interface CellGlow {
  bg: string
  glow: string
}

function cellGlow(intensity: number, mark: string | null | undefined): CellGlow {
  // 색조(hue)가 *해석*을 따라가게: 좋음/best=쪽빛, 주의=호박(주황), 지킴(avoid)=적,
  // 수렴=금, 중립=옅은 회청. 밝기는 '중립(0.5)에서 얼마나 벗어났나'로 — 좋은 날은
  // 점수↑일수록, 주의·지킴 날은 점수↓일수록 진하게. (예전엔 avoid만 빨갛고 나머진
  // 전부 쪽빛이라 '주의' 날이 파랗게 보여 색과 해석이 어긋났다.)
  const up = Math.max(0, Math.min(1, (intensity - 0.5) * 2.2)) // 좋은 쪽 강도
  const down = Math.max(0, Math.min(1, (0.5 - intensity) * 2.2)) // 나쁜 쪽 강도
  const glow = (r: number, g: number, b: number, a: number) =>
    `radial-gradient(circle at 55% 42%, rgba(${r},${g},${b},${a}), transparent 66%)`

  // 지킴(避) — 적. 점수 낮을수록 진하게(하한 보정으로 항상 또렷).
  if (mark === 'avoid') {
    const s = Math.max(0.35, down)
    return { bg: `rgba(176,58,34,${0.14 + s * 0.26})`, glow: glow(176, 58, 34, 0.26 + s * 0.5) }
  }
  // 주의(注) — 호박/주황. 좋음(쪽빛)과 또렷이 구분.
  if (mark === 'caution') {
    const s = Math.max(0.3, down)
    return { bg: `rgba(198,116,40,${0.12 + s * 0.24})`, glow: glow(224, 148, 58, 0.22 + s * 0.5) }
  }
  // 수렴(土) — 금.
  if (mark === 'converge') {
    const s = Math.max(0.4, Math.abs(intensity - 0.5) * 2.2)
    return { bg: `rgba(179,135,58,${0.2 + s * 0.28})`, glow: glow(217, 168, 74, 0.28 + s * 0.62) }
  }
  // 좋음/best — 쪽빛 인디고. 점수 높을수록 진하게.
  if (mark === 'good' || mark === 'best') {
    const s = Math.max(0.3, up)
    return { bg: `rgba(52,64,111,${0.1 + s * 0.3})`, glow: glow(79, 93, 150, 0.2 + s * 0.6) }
  }
  // 중립(grade 2 / 무표시) — 옅은 회청. 좋지도 나쁘지도 않게.
  const s = Math.abs(intensity - 0.5) * 1.4
  return { bg: `rgba(96,104,124,${0.05 + s * 0.1})`, glow: glow(120, 128, 150, 0.06 + s * 0.28) }
}

// ============================================================================
// 캘린더 — 1일의 dow 계산 (원본은 firstDow=1 하드코딩, 우리는 ym 으로 계산)
// ============================================================================

function firstDowOfMonth(ym: string): number {
  // ym = "YYYY-MM"
  const yyyy = parseInt(ym.slice(0, 4), 10)
  const mm = parseInt(ym.slice(5, 7), 10)
  if (!Number.isFinite(yyyy) || !Number.isFinite(mm)) return 0
  // Date 는 month 가 0-indexed.
  const d = new Date(Date.UTC(yyyy, mm - 1, 1))
  return d.getUTCDay() // 0=Sun .. 6=Sat
}

const DOWS = ['일', '월', '화', '수', '목', '금', '토'] as const

// ============================================================================
// 보강 #7 — 월운 sibsin 라벨 생성
//   "甲(정재) / 午(편관) — 재생관 흐름"
// 십신 정보가 부족하면 천간 십신만, 아예 없으면 "월운 · {label}월" fallback.
// ============================================================================

function woolunCaption(month: DestinyMonth, ko = true): string {
  const branchHanja = month.woolun?.hanja?.slice(1) ?? ''
  const branchKo = branchHanja || month.label.replace(/.*\s/, '')
  const sib = month.woolunSibsin
  if (ko) {
    if (sib) return `월운 · ${branchKo}월 · ${sib}`
    return branchKo ? `월운 · ${branchKo}월` : '월운'
  }
  // en — 월운 = monthly luck pillar; 십신은 영문 라벨로.
  const sibEn = sib ? (SIBSIN_EN[sib] ?? sib) : ''
  if (sibEn) return `Monthly pillar · ${branchHanja} · ${sibEn}`
  return branchHanja ? `Monthly pillar · ${branchHanja}` : 'Monthly pillar'
}

function woolunSibsinTag(month: DestinyMonth): string | null {
  if (!month.woolun) return null
  const stem = month.woolun.hanja?.charAt(0) ?? ''
  const branch = month.woolun.hanja?.charAt(1) ?? ''
  if (!stem || !branch) return null
  const sibsin = month.woolunSibsin
  if (!sibsin) return `${stem} / ${branch}`
  // "甲(정재) / 午(편관) — 재생관 흐름" 형식
  return `${stem}(${sibsin}) / ${branch}`
}

// ============================================================================
// 보강 #5 — 조후(調候) 강조 박스
// 월지(月支) 한자에서 절기 시즌 추정 → 필요 오행 안내.
// ============================================================================

interface JohoHint {
  branchLabel: string
  body: ReactNode
}

const JOHO_MAP: Record<string, JohoHint> = {
  // 봄
  寅: {
    branchLabel: '寅월 (초봄)',
    body: (
      <>
        한기가 채 가시지 않은 결 — <b>화(火)</b> 와 <b>토(土)</b> 의 온기가 절실해요.
      </>
    ),
  },
  卯: {
    branchLabel: '卯월 (중춘)',
    body: (
      <>
        목 기운이 가장 무성한 시기 — <b>금(金)</b> 의 절제가 균형을 잡아줘요.
      </>
    ),
  },
  辰: {
    branchLabel: '辰월 (늦봄)',
    body: (
      <>
        토 기운이 자라며 목이 잠기는 결 — <b>수(水)</b> 와 <b>화(火)</b> 의 흐름을 챙겨야 해요.
      </>
    ),
  },
  // 여름
  巳: {
    branchLabel: '巳월 (초여름)',
    body: (
      <>
        화 기운이 본격적으로 살아나는 결 — <b>수(水)</b> 가 절실해요. 따뜻한 물·하체 보온으로
        균형을.
      </>
    ),
  },
  午: {
    branchLabel: '午월 (한여름)',
    body: (
      <>
        화 기운이 정점을 찍는 결 — <b>수(水)</b> 와 <b>금(金)</b> 의 견제가 살길이에요.
      </>
    ),
  },
  未: {
    branchLabel: '未월 (늦여름)',
    body: (
      <>
        건조한 토 기운이 강한 결 — <b>수(水)</b> 와 <b>목(木)</b> 의 윤기가 균형을 잡아줘요.
      </>
    ),
  },
  // 가을
  申: {
    branchLabel: '申월 (초가을)',
    body: (
      <>
        금 기운이 본격적으로 켜지는 결 — <b>화(火)</b> 의 다스림이 필요해요.
      </>
    ),
  },
  酉: {
    branchLabel: '酉월 (중추)',
    body: (
      <>
        금 기운이 가장 날카로운 결 — <b>화(火)</b> 와 <b>목(木)</b> 의 부드러움이 결을 살려요.
      </>
    ),
  },
  戌: {
    branchLabel: '戌월 (늦가을)',
    body: (
      <>
        건조한 토 기운이 강한 결 — <b>수(水)</b> 의 윤기가 절실해요.
      </>
    ),
  },
  // 겨울
  亥: {
    branchLabel: '亥월 (초겨울)',
    body: (
      <>
        수 기운이 본격적으로 켜지는 결 — <b>화(火)</b> 의 온기가 절실해요.
      </>
    ),
  },
  子: {
    branchLabel: '子월 (한겨울)',
    body: (
      <>
        수 기운이 정점을 찍는 결 — <b>화(火)</b> 와 <b>토(土)</b> 가 결을 데워야 해요.
      </>
    ),
  },
  丑: {
    branchLabel: '丑월 (늦겨울)',
    body: (
      <>
        차고 습한 토 기운이 강한 결 — <b>화(火)</b> 와 <b>목(木)</b> 의 봄 기운이 살길이에요.
      </>
    ),
  },
}

function pickJohoHint(month: DestinyMonth): JohoHint | null {
  const branch = month.woolun?.hanja?.charAt(1) ?? ''
  return JOHO_MAP[branch] ?? null
}

// ============================================================================
// 보강 #3 — 응용패턴 daily count (재생관 / 식상생재 등의 일수 집계)
// narrative 안에 "재생관 18일" 같은 표현이 있으면 chip 으로 추출.
// 패턴이 없으면 calendar 의 mark 분포를 chip 으로 노출 (fallback).
// ============================================================================

interface PatternChip {
  label: string
  count: number
}

function extractPatternChips(month: DestinyMonth): PatternChip[] {
  // 1) narrative body 에서 "<라벨> <숫자>일" 패턴 추출
  const chips: PatternChip[] = []
  const re = /([가-힣A-Za-z]{2,8})\s*(\d{1,2})\s*일/g
  for (const n of month.narrative ?? []) {
    let m: RegExpExecArray | null
    const body = n.body ?? ''
    while ((m = re.exec(body)) !== null) {
      const label = m[1]
      const count = parseInt(m[2], 10)
      // 자주 등장하는 generic 단어 필터.
      if (
        Number.isFinite(count) &&
        count >= 1 &&
        count <= 31 &&
        !/^(이번|올해|오늘|내일|어제|올해의|하루|매일|한)$/.test(label)
      ) {
        chips.push({ label, count })
      }
    }
  }
  if (chips.length > 0) return chips.slice(0, 6)

  // 2) fallback — calendar mark 분포로 chip 구성
  const dist: Record<string, number> = {}
  for (const c of month.calendar ?? []) {
    if (!c.mark || c.mark === 'focus') continue
    dist[c.mark] = (dist[c.mark] ?? 0) + 1
  }
  const FALLBACK_LABELS: Record<string, string> = {
    best: '최고일',
    good: '길일',
    avoid: '피하기',
    caution: '주의',
    converge: '수렴',
  }
  return Object.entries(dist)
    .map(([k, v]) => ({ label: FALLBACK_LABELS[k] ?? k, count: v }))
    .sort((a, b) => b.count - a.count)
}

// ============================================================================
// 보강 #4 — narrative source 메타 (어느 deriver 가 만든 글인가)
// tag 를 키로 매핑.
// ============================================================================

const NARR_SOURCE_HINT: Record<string, string> = {
  '올해의 운': 'deriveYearlyInterpretation',
  '이번 달': 'deriveMonthlyInterpretation',
  '타고난 결': 'deriveNatalGrade',
  '주요 흐름': 'deriveZodiacalReleasing',
  '하우스 흐름': 'deriveProfectionalHouse',
  '주요 패턴': 'deriveCalendarPatterns',
  '타이밍 팁': 'deriveVoidOfCourse',
  '몸·내면': 'deriveHealthSignals',
  '용신 흐름': 'deriveYongsinSupport',
  '주의할 결': 'deriveCautionWindows',
  '정점의 해': 'derivePeakWindows',
}

function narrativeSource(item: TaggedNarrative): string | null {
  return NARR_SOURCE_HINT[item.tag] ?? null
}

// ============================================================================
// 보강 #8 — ZR L2 progress bar
// month 객체에 ZR 정보가 없으면, narrative 안에서 "ZR" 언급을 찾고
// 없으면 그냥 fallback 으로 "이 달의 절기 진행" 게이지를 보여준다.
// ============================================================================

interface ZrProgress {
  label: string
  chapter: string
  pct: number
  meta: string
}

function pickZrProgress(month: DestinyMonth): ZrProgress | null {
  // narrative 에서 ZR 관련 카드를 찾기
  const zrCard = (month.narrative ?? []).find(
    (n) => /ZR|Zodiacal|챕터|chapter/i.test(n.body) || /주요\s*흐름/.test(n.tag)
  )
  // 이 달이 ym 으로 주어졌으니 절기 진행도(0..1) 를 일자 기준으로 계산.
  // (백엔드 ZR 노출이 없을 때의 합리적 fallback)
  const dd = month.focusDay ?? 1
  const totalDays = (month.calendar ?? []).length || 30
  const pct = Math.round((dd / totalDays) * 100)

  if (zrCard) {
    return {
      label: 'ZR · L2 진행',
      chapter: zrCard.body.split(/[.。]/)[0].trim() || zrCard.tag,
      pct,
      meta: `${dd} / ${totalDays} 일`,
    }
  }
  return {
    label: '절기 진행',
    chapter: `${month.label} 내 흐름`,
    pct,
    meta: `${dd} / ${totalDays} 일`,
  }
}

// ============================================================================
// 보강 #6 — converge cross-activation 매핑 의미
// astro/saju 첫 글자만 추출해 "정관 ↔ Saturn (책임·구조)" 형식 cross-map 한 줄.
// ============================================================================

function convergeCrossMap(month: DestinyMonth): string | null {
  const conv = month.converge
  if (!conv || !conv.bothSystems) return null
  const sajuHead = conv.saju?.[0]
  const astroHead = conv.astro?.[0]
  if (!sajuHead || !astroHead) return null
  // 짧게 다듬기
  const sajuShort = sajuHead.split(/\s|—|–|·/)[0] || sajuHead
  const astroShort = astroHead.split(/\s|—|–|·/)[0] || astroHead
  return `${sajuShort} ↔ ${astroShort} — A등급 cross-activation`
}

// ============================================================================
// voc dates → set of "MM-DD" (day 셀에 띠 표시)
// ============================================================================

function vocSet(month: DestinyMonth): Set<string> {
  const set = new Set<string>()
  for (const iso of month.voidOfCourseDates ?? []) {
    if (typeof iso === 'string' && iso.length >= 10) {
      set.add(iso.slice(5, 10)) // "MM-DD"
    }
  }
  return set
}

function lunarReturnDow(month: DestinyMonth): string | null {
  if (!month.lunarReturnIso) return null
  return month.lunarReturnIso.slice(5, 10)
}

// ============================================================================
// 컴포넌트
// ============================================================================

export function MonthTier({ month, onDive, onRise }: MonthTierProps) {
  const { locale } = useI18n()
  const ko = locale === 'ko'
  const firstDow = firstDowOfMonth(month.ym)
  const calendar = month.calendar ?? []
  const narrative = month.narrative ?? []
  const focusDay = month.focusDay
  const pattern = extractPatternChips(month)
  const joho = pickJohoHint(month)
  const zr = pickZrProgress(month)
  const crossMap = convergeCrossMap(month)
  const voc = vocSet(month)
  const lunarDs = lunarReturnDow(month)
  const woolunCap = woolunCaption(month, ko)
  const woolunSibTag = woolunSibsinTag(month)
  // 1달 제목 — ko: "2026년 6월의 흐름" / en: "June 2026"
  const [ymY, ymM] = month.ym.split('-').map(Number)
  const flowTitle = ko
    ? `${month.label}의 흐름`
    : `${MONTH_EN[(ymM ?? 1) - 1] ?? ''} ${ymY ?? ''}`.trim()

  // ── 교차 리스트 — '이달의 큰 날'(keyDays) = 사주×점성 수렴 날짜 ──
  // 제목 = 판정 레이블 + 그 날의 뜻(일상어). raw 엔진 신호명은 안 쓴다.
  // 그 날의 판정(달력 mark) → 셀/리스트 공용 짧은 레이블 (달력 색과 같은 소스).
  const cellVerdictLabel = (m: ExtendedMark | null | undefined): string => {
    switch (m) {
      case 'best':
        return ko ? '최고' : 'Best'
      case 'good':
        return ko ? '좋음' : 'Good'
      case 'caution':
        return ko ? '주의' : 'Caution'
      case 'avoid':
        return ko ? '피함' : 'Avoid'
      case 'converge':
        return ko ? '전환' : 'Pivot'
      default:
        return ''
    }
  }
  // c.ds 와 keyDay.date 둘 다 'MM-DD' (예: '06-06') — 그대로 키로 쓴다.
  const markByDs = new Map<string, ExtendedMark | null>(
    (month.calendar ?? []).map((c) => [c.ds, c.mark as ExtendedMark | null])
  )
  // 큰 날 리스트 — 의미의 *톤*을 달력 셀 판정(색)과 같은 소스로 맞춘다.
  // 예전엔 의미=수렴 톤, 색=일진 등급이라 "결실이 보이는 날(좋음)"인데 셀은 주의로
  // 떠 모순. 이제 셀이 좋음/주의/피함이면 그 톤의 문구를 뽑아 색과 글이 항상 일치.
  const verdictPrefix = (m: ExtendedMark | null | undefined): string | null => {
    if (m === 'best' || m === 'good') return ko ? '좋은 날' : 'Good day'
    if (m === 'caution') return ko ? '주의할 날' : 'Caution'
    if (m === 'avoid') return ko ? '피할 날' : 'Avoid'
    return null
  }
  const markToTone = (m: ExtendedMark | null | undefined): MeaningTone | null => {
    if (m === 'best' || m === 'good') return 'positive'
    if (m === 'caution' || m === 'avoid') return 'negative'
    if (m === 'converge') return 'neutral'
    return null
  }
  const keyDayItems = [...(month.keyDays ?? [])].map((k) => {
    const mark = markByDs.get(k.date)
    const tone = markToTone(mark)
    const dayNum = parseInt(k.date.slice(-2), 10)
    // 셀에 판정이 있으면 그 톤으로 문구를 뽑아 색과 일치(모순 제거). 무표시(중립)
    // 날만 엔진 수렴 의미를 그대로 쓴다.
    const meaning = tone
      ? toneMeaningFor(tone, dayNum, ko ? 'ko' : 'en')
      : k.meaning || (k.bothSystems ? (ko ? '신호가 겹치는 날' : 'signals overlap') : '')
    const vp = verdictPrefix(mark)
    const title =
      vp && meaning ? `${vp} · ${meaning}` : meaning || vp || (ko ? '주목할 날' : 'Notable day')
    return {
      when: k.date,
      title,
      detail: k.bothSystems
        ? ko
          ? '사주·점성이 함께 강한 날'
          : 'Saju & astrology both strong'
        : undefined,
    }
  })
  // best(✦) 날은 수렴(keyDays)과 다른 기준이라 빠질 수 있다 — 달력이 최고날로
  // 강조하는데 큰 날 목록에 없으면 이상하니, 없으면 채워 넣는다.
  if (month.bestDay?.date && !keyDayItems.some((i) => i.when === month.bestDay!.date)) {
    const dn = parseInt(month.bestDay.date.slice(-2), 10)
    keyDayItems.push({
      when: month.bestDay.date,
      title: `${ko ? '최고의 날' : 'Best day'} · ${toneMeaningFor('positive', dn, ko ? 'ko' : 'en')}`,
      detail: ko ? '이달 가장 좋은 날' : 'Best day of the month',
    })
  }
  const monthCrossItems = keyDayItems.sort((a, b) => a.when.localeCompare(b.when))
  const goodN = month.goodDays?.length ?? 0
  const cautionN = month.cautionDays?.length ?? 0

  return (
    <div className={styles.tier} data-screen-label={`1달 ${month.ym}`}>
      <button className={styles.rise} onClick={onRise} type="button">
        ↑ {ko ? '올해로 줌아웃' : 'Zoom out to year'}
      </button>

      {/* ===== cal head ===== */}
      <div className={styles.calHead}>
        <div>
          <div className={styles.eyebrow}>
            {ko ? '1달' : 'MONTH'} · MONTHLY · {month.ym}
          </div>
          <h1 className={[styles.display, styles.calHeadTitle].join(' ')}>{flowTitle}</h1>
        </div>
        <div className={styles.calHeadRight}>
          <span className={[styles.layerTag, styles.layerTagSaju].join(' ')}>
            <span className="pip" /> {ko ? '사주 · SAJU' : 'Saju · 四柱'}
          </span>
          <div style={{ textAlign: 'center' }}>
            <Ganji data={month.woolun} size={30} />
          </div>
          <div className={styles.woolunMeta}>
            <span className={styles.tiny}>{woolunCap}</span>
            {woolunSibTag && <span className={styles.woolunSibsin}>{woolunSibTag}</span>}
          </div>
        </div>
      </div>

      <p className={styles.tiny} style={{ margin: '2px 2px 0' }}>
        {ko
          ? `좋은 날 ${goodN}개 · 주의 ${cautionN}개`
          : `${goodN} good ${goodN === 1 ? 'day' : 'days'} · ${cautionN} to watch`}
      </p>
      <CrossingList
        heading={ko ? '이달의 큰 날 · 사주 × 점성' : 'Key days this month · Saju × Astrology'}
        items={monthCrossItems}
      />

      {/* ===== calendar heatmap — 메인. 한눈에 좋은 날/주의 날 색으로. ===== */}
      <div className={styles.calGrid}>
        {DOWS.map((d) => (
          <div className={styles.calDow} key={d}>
            {d}
          </div>
        ))}
        {Array.from({ length: firstDow }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {calendar.map((c) => {
          const intensity = cellIntensity(c)
          const g = cellGlow(intensity, c.mark)
          const mark = c.mark as ExtendedMark | null
          const isVoc = voc.has(c.ds)
          const isLunar = lunarDs === c.ds
          // mark resolution: 백엔드 mark 우선, 없으면 보강 mark 추론
          const renderedMark: ExtendedMark | null = mark ?? (isLunar ? 'return' : null)
          const cellCls = [
            styles.cell,
            c.focus && styles.cellFocus,
            renderedMark === 'best' && styles.cellBest,
            renderedMark === 'good' && styles.cellGood,
            renderedMark === 'avoid' && styles.cellAvoid,
            renderedMark === 'converge' && styles.cellConverge,
            renderedMark === 'caution' && styles.cellCaution,
            renderedMark === 'phase' && styles.cellPhase,
            renderedMark === 'return' && styles.cellReturn,
            renderedMark === 'lifecycle' && styles.cellLifecycle,
          ]
            .filter(Boolean)
            .join(' ')

          const cellStyle: CSSProperties = { background: g.bg }
          const titleParts = [c.ds]
          if (renderedMark) titleParts.push(renderedMark)
          if (isVoc) titleParts.push('void-of-course')
          const title = titleParts.join(' · ')

          return (
            <div
              key={c.d}
              className={cellCls}
              onClick={c.focus ? () => onDive(focusDay) : undefined}
              title={title}
              style={cellStyle}
              role={c.focus ? 'button' : undefined}
              tabIndex={c.focus ? 0 : undefined}
              onKeyDown={
                c.focus
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onDive(focusDay)
                      }
                    }
                  : undefined
              }
            >
              <div className={styles.cellGlow} style={{ background: g.glow }} />
              <span className={styles.cellDnum}>{c.d}</span>
              {c.focus && <span className={styles.cellFtag}>{ko ? '오늘' : 'Today'}</span>}
              {renderedMark && renderedMark !== 'focus' && STAR_GLYPH[renderedMark] && (
                <span className={styles.cellStar}>{STAR_GLYPH[renderedMark]}</span>
              )}
              {cellVerdictLabel(renderedMark) && (
                <span className={styles.cellVerdict}>{cellVerdictLabel(renderedMark)}</span>
              )}
              {isVoc && <span className={styles.cellVocBand} />}
            </div>
          )
        })}
      </div>

      {/* ===== legend ===== */}
      <div className={styles.calLegend}>
        <span className={styles.leg}>
          <span className="sw" style={{ background: 'rgba(79,93,150,0.7)' }} />
          {ko ? '좋음' : 'Good'}
        </span>
        <span className={styles.leg}>
          <span className="sw" style={{ background: 'rgba(224,148,58,0.75)' }} />
          {ko ? '주의' : 'Caution'}
        </span>
        <span className={styles.leg}>
          <span className="sw" style={{ background: 'rgba(176,58,34,0.8)' }} />
          {ko ? '지킴' : 'Avoid'}
        </span>
        {month.bestDay && (
          <span className={[styles.leg, styles.legPos].join(' ')}>✦ best {month.bestDay.date}</span>
        )}
        {month.avoidDays.length > 0 && (
          <span className={[styles.leg, styles.legNeg].join(' ')}>
            ✕ avoid {month.avoidDays.join(' · ')}
          </span>
        )}
        {month.converge?.date && (
          <span className={[styles.leg, styles.legEarth].join(' ')}>
            ✶ {ko ? '수렴' : 'converge'} {month.converge.date.slice(5)}
          </span>
        )}
        <span className={[styles.leg, styles.legAccent].join(' ')}>
          ◎ {ko ? '오늘' : 'today'} {month.ym.slice(5)}-{String(focusDay).padStart(2, '0')}
        </span>
        {lunarDs && (
          <span className={[styles.leg, styles.legAccent].join(' ')}>○ Lunar Return {lunarDs}</span>
        )}
        {voc.size > 0 && (
          <span className={[styles.leg, styles.legMute].join(' ')}>
            ░ void-of-course · {voc.size}
            {ko ? '일' : ' days'}
          </span>
        )}
      </div>

      {/* ── 전문가용 상세 — 테마·신호·근거 전부 접어 둠 ── */}
      <details className={summaryStyles.details}>
        <summary className={summaryStyles.detailsSummary}>
          {ko ? '자세히 보기 · 근거와 신호' : 'Details · evidence & signals'}
        </summary>

        {/* ===== 이달의 큰 날 (convergence keyDays) ===== */}
        {month.keyDays &&
          month.keyDays.length > 0 &&
          (() => {
            // 느린 점성 배경(토성회귀·식 등 lifecycle)은 큰 날마다 동일해 비차별적 —
            // 한 줄 backdrop 으로 한 번만 보여주고, 날별 칩은 *날마다 변하는* 사주만.
            const astroBackdrop = Array.from(new Set(month.keyDays!.flatMap((k) => k.astro))).slice(
              0,
              2
            )
            return (
              <div className={styles.bigDays}>
                <div className={styles.eyebrow}>
                  이달의 큰 날 · 사주×점성 수렴
                  {(() => {
                    const both = month.keyDays!.filter((k) => k.bothSystems).length
                    return both > 0 ? ` · 동·서 합치 ${both}일` : ''
                  })()}
                </div>
                {astroBackdrop.length > 0 && (
                  <div className={styles.bigDayBackdrop}>
                    이달 점성 배경 · {astroBackdrop.join(' · ')}
                  </div>
                )}
                {month.keyDays!.map((k, i) => (
                  <div className={styles.bigDay} key={`kd-${i}`}>
                    <div className={styles.bigDayHead}>
                      <span className={styles.bigDayDate}>{k.date}</span>
                      {k.window && k.window.start.slice(0, 10) !== k.window.end.slice(0, 10) && (
                        <span className={styles.bigDayWindow}>
                          {k.window.start.slice(5, 10)} ~ {k.window.end.slice(5, 10)} · 정점{' '}
                          {k.window.peak.slice(5, 10)}
                        </span>
                      )}
                      {k.bothSystems && <span className={styles.bigDayBoth}>사주×점성</span>}
                    </div>
                    {k.meaning && <div className={styles.bigDayMeaning}>{k.meaning}</div>}
                    {k.saju.length > 0 && (
                      <div className={styles.bigDayChips}>
                        {k.saju.map((s, j) => (
                          <span className={[styles.chip, styles.chipSaju].join(' ')} key={`s-${j}`}>
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          })()}

        {/* ===== theme scores + key events 50:50 row ===== */}
        <div className={styles.split} style={{ marginTop: 30 }}>
          <div className={[styles.panel, styles.panelSaju].join(' ')}>
            {/* 보강 #3 — 응용패턴 daily count chip strip */}
            {pattern.length > 0 && (
              <div className={styles.patternStrip}>
                {pattern.map((p) => (
                  <span className={styles.patternChip} key={`${p.label}-${p.count}`}>
                    {p.label} <b>{p.count}일</b>
                  </span>
                ))}
              </div>
            )}
            {/* 보강 #5 — 조후 강조 박스 */}
            {joho && (
              <div className={styles.johoBox}>
                <span className={styles.johoLabel}>조후 · {joho.branchLabel}</span>
                <span className={styles.johoBody}>{joho.body}</span>
              </div>
            )}
          </div>

          <div
            className={[styles.panel, styles.panelAstro].join(' ')}
            style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
          >
            <div className={styles.eyebrow} style={{ marginBottom: 2 }}>
              핵심 이벤트
            </div>
            <div className={styles.eventsCol}>
              {month.bestDay && (
                <div className={styles.eventRow}>
                  <span className={[styles.pol, styles.polP].join(' ')} style={{ fontSize: 11 }}>
                    BEST
                  </span>
                  <span className={styles.eventDate}>{month.bestDay.date}</span>
                </div>
              )}
              {month.avoidDays.length > 0 && (
                <div className={styles.eventRow}>
                  <span className={[styles.pol, styles.polN].join(' ')} style={{ fontSize: 11 }}>
                    AVOID
                  </span>
                  <span className={styles.eventDate}>{month.avoidDays.join(' · ')}</span>
                </div>
              )}
              {month.cautionDays.length > 0 && (
                <div className={styles.eventRow}>
                  <span className={[styles.pol, styles.polZ].join(' ')} style={{ fontSize: 11 }}>
                    주의
                  </span>
                  <span className={styles.eventDateDim}>{month.cautionDays.join(' · ')}</span>
                </div>
              )}
              {month.goodDays.length > 0 && (
                <div className={styles.eventRow}>
                  <span className={[styles.pol, styles.polGood].join(' ')} style={{ fontSize: 11 }}>
                    길일
                  </span>
                  <span className={styles.eventDateDim}>{month.goodDays.join(' · ')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===== ZR L2 progress bar (보강 #8) ===== */}
        {zr && (
          <div className={styles.zrProgress}>
            <div className={styles.zrLabelRow}>
              <span className={styles.zrLabel}>{zr.label}</span>
              <span className={styles.zrChapter}>{zr.chapter}</span>
            </div>
            <div className={styles.zrTrack}>
              <div className={styles.zrFill} style={{ width: `${zr.pct}%` }} />
            </div>
            <span className={styles.zrMeta}>
              {zr.meta} · {zr.pct}%
            </span>
          </div>
        )}

        {/* ===== narrative grid ===== */}
        <div className={styles.blockSm}>
          <div className={styles.secHead}>
            <h2 className={styles.secTitle}>이 달의 이야기</h2>
            <span className={styles.tiny}>사주 + 점성 narrative</span>
          </div>
          <div className={styles.narr}>
            {narrative.map((n, i) => {
              const src = narrativeSource(n)
              return (
                <div className={styles.narrCard} key={`${n.tag}-${i}`}>
                  <span className={styles.narrTag}>{n.tag}</span>
                  <div className={styles.narrBody}>{n.body}</div>
                  {src && <span className={styles.narrSource}>· source: {src}</span>}
                </div>
              )
            })}
          </div>
        </div>

        {/* ===== converge day ===== */}
        {month.converge && (
          <div className={styles.converge}>
            <div className={styles.convergeHead}>
              <div className={[styles.eyebrow, styles.eyebrowEmber].join(' ')}>
                수렴 일 · 두 시스템이 함께 강한 날
              </div>
            </div>
            <div className={styles.convergeDateRow}>
              <span className={styles.convergeDate}>
                {month.converge.date.slice(5).replace('-', '·')}
              </span>
              <span className={styles.convergeMeaning}>{month.converge.meaning}</span>
            </div>
            {/* 보강 #6 — cross-activation 매핑 한 줄 */}
            {crossMap && (
              <div className={styles.convergeCrossMap}>
                <b>↔</b> {crossMap}
              </div>
            )}
            <div className={styles.convSys}>
              <div>
                <span className={[styles.layerTag, styles.layerTagAstro].join(' ')}>
                  <span className="pip" /> 점성 · ASTRO
                </span>
                <ul>
                  {month.converge.astro.map((a, i) => (
                    <li key={`a-${i}`}>{a}</li>
                  ))}
                </ul>
              </div>
              <div>
                <span className={[styles.layerTag, styles.layerTagSaju].join(' ')}>
                  <span className="pip" /> 사주 · SAJU
                </span>
                <ul>
                  {month.converge.saju.map((s, i) => (
                    <li key={`s-${i}`}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </details>

      {/* ===== dive ===== */}
      <div className={styles.diveWrap} style={{ marginTop: 40 }}>
        <button className={styles.dive} onClick={() => onDive(focusDay)} type="button">
          {ko
            ? `오늘 ${month.ym.slice(5)}월 ${focusDay}일로 줌인`
            : `Zoom in to ${MONTH_EN[(ymM ?? 1) - 1] ?? ''} ${focusDay}`}{' '}
          <span className={styles.diveArrow}>↓</span>
        </button>
      </div>
    </div>
  )
}

export default MonthTier
