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

import type { CSSProperties } from 'react'
import type { DestinyMonth, DestinyCalendarCell, DestinyDayMark } from '@/types/calendar'
import { Ganji } from '../atoms/Ganji'
import styles from './MonthTier.module.css'
import { CrossingList } from '@/components/calendar/atoms/CrossingList'
import { useI18n } from '@/i18n/I18nProvider'
import { SIBSIN_EN } from '@/lib/saju/sibsinLabels'
import { localizeLabel } from '@/components/calendar/adapters/localizeLabel'
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
  /** 위 티어가 있을 때만 줌아웃 버튼 노출 (월이 최상단이면 숨김). 기본 true. */
  showRise?: boolean
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
const DOWS_EN = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const

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

export function MonthTier({ month, onDive, onRise, showRise = true }: MonthTierProps) {
  const { locale } = useI18n()
  const ko = locale === 'ko'
  const firstDow = firstDowOfMonth(month.ym)
  const calendar = month.calendar ?? []
  const focusDay = month.focusDay
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
    // 제목이 이미 그날 고유의 의미(셀 판정 톤 또는 엔진 의미)를 담고 있으면 generic
    // "두 체계 겹침" 줄을 덧붙이지 않는다 — 매일 같은 줄 반복 + 톤 모순(피할 날인데
    // "강한 날") 제거. 고유 의미가 없을 때만 중립 generic 한 줄.
    const detail =
      k.bothSystems && !meaning
        ? ko
          ? '사주·점성 신호가 겹치는 날'
          : 'Saju & Astrology signals overlap'
        : undefined
    return {
      when: k.date,
      title,
      detail,
    }
  })
  // best(✦) 날은 수렴(keyDays)과 다른 기준이라 빠질 수 있다 — 달력이 최고날로
  // 강조하는데 큰 날 목록에 없으면 이상하니, 없으면 채워 넣는다.
  if (month.bestDay?.date && !keyDayItems.some((i) => i.when === month.bestDay!.date)) {
    const dn = parseInt(month.bestDay.date.slice(-2), 10)
    keyDayItems.push({
      when: month.bestDay.date,
      title: `${ko ? '최고의 날' : 'Best day'} · ${toneMeaningFor('positive', dn, ko ? 'ko' : 'en')}`,
      detail: ko ? '이달 점수가 가장 높은 날' : 'The month’s highest-scoring day',
    })
  }
  const monthCrossItems = keyDayItems.sort((a, b) => a.when.localeCompare(b.when))
  const goodN = month.goodDays?.length ?? 0
  const cautionN = month.cautionDays?.length ?? 0
  const avoidN = month.avoidDays?.length ?? 0

  // 큰 날(keyDays) 날짜 집합 — 달력 셀에 '주목' 링(자초)을 그릴 때 쓴다.
  // score(우호도)와 직교: 점수 좋은 날이 곧 큰 날은 아니고, 일식 같은 전환점은
  // 점수 중립이어도 큰 날이다.
  const keyDates = new Set(monthCrossItems.map((i) => i.when))

  return (
    <div className={styles.tier} data-screen-label={`1달 ${month.ym}`}>
      {showRise && (
        <button className={styles.rise} onClick={onRise} type="button">
          ↑ {ko ? '올해로 줌아웃' : 'Zoom out to year'}
        </button>
      )}

      {/* ===== cal head ===== */}
      <div className={styles.calHead}>
        <div>
          <div className={styles.eyebrow}>
            {ko ? '1달' : '1 MONTH'} · MONTHLY · {month.ym}
          </div>
          <h1 className={[styles.display, styles.calHeadTitle].join(' ')}>{flowTitle}</h1>
        </div>
        <div className={styles.calHeadRight}>
          <span className={[styles.layerTag, styles.layerTagSaju].join(' ')}>
            <span className="pip" /> {ko ? '사주 · SAJU' : 'Saju · 四柱'}
          </span>
          <div style={{ textAlign: 'center' }}>
            <Ganji data={month.woolun} size={30} en={false} />
          </div>
          <div className={styles.woolunMeta}>
            <span className={styles.tiny}>{woolunCap}</span>
            {woolunSibTag && <span className={styles.woolunSibsin}>{woolunSibTag}</span>}
          </div>
        </div>
      </div>

      <p className={styles.tiny} style={{ margin: '2px 2px 0' }}>
        {ko
          ? `좋은 날 ${goodN}개 · 주의 ${cautionN}개 · 피하기 ${avoidN}개`
          : `${goodN} good ${goodN === 1 ? 'day' : 'days'} · ${cautionN} caution · ${avoidN} avoid`}
      </p>

      {/* ===== calendar heatmap — 메인. 맨 위. 한눈에 좋은 날/주의 날 색으로. ===== */}
      <div className={styles.secHead} style={{ marginTop: 18 }}>
        <h2 className={styles.secTitle}>{ko ? '시간 흐름 보기' : 'Time flow'}</h2>
        <span className={styles.tiny}>
          {ko ? '흐름표 달력 · 날짜별 길흉' : 'flow calendar · day by day'}
        </span>
      </div>
      <div className={styles.calGrid}>
        {(ko ? DOWS : DOWS_EN).map((d, i) => (
          <div className={styles.calDow} key={`dow-${i}`}>
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
          // 큰 날(주목) — 사주×점성 수렴일. 셀에 보라 링으로 표시(점수 색과 직교).
          const isKeyDay = keyDates.has(c.ds)
          // mark resolution: 백엔드 mark 우선, 없으면 보강 mark 추론
          const renderedMark: ExtendedMark | null = mark ?? (isLunar ? 'return' : null)
          const cellCls = [
            styles.cell,
            c.focus && styles.cellFocus,
            isKeyDay && styles.cellKeyDay,
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
              {isKeyDay && <span className={styles.cellKeyRing} aria-hidden />}
              <span className={styles.cellDnum}>{c.d}</span>
              {typeof c.score === 'number' && (
                <span className={styles.cellScore}>{Math.round(c.score)}</span>
              )}
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
          {ko ? '피함' : 'Avoid'}
        </span>
        {month.bestDay && (
          <span className={[styles.leg, styles.legPos].join(' ')}>
            ✦ {ko ? '최고' : 'best'} {month.bestDay.date}
          </span>
        )}
        {month.avoidDays.length > 0 && (
          <span className={[styles.leg, styles.legNeg].join(' ')}>
            ✕ {ko ? '피함' : 'avoid'} {month.avoidDays.join(' · ')}
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

      {/* ── 달력 아래: 이달의 큰 날(주목) — 사주·점성이 수렴한 날. ── */}
      <CrossingList
        heading={
          ko ? '이달의 큰 날 · 주목 (사주 × 점성 수렴)' : 'Key days · notable (Saju × Astrology)'
        }
        items={monthCrossItems}
      />

      {/* ── 이달 총평 — 한 문단(자세히 보기 밖에 노출). ── */}
      {(() => {
        const summaryTag = ko ? '이달 총평' : 'This month'
        const s = (month.narrative ?? []).find((n) => n.tag === summaryTag)
        return s ? (
          <div className={styles.blockSm} style={{ marginTop: 22 }}>
            <div className={styles.narrCard}>
              <span className={styles.narrTag}>{s.tag}</span>
              <div className={styles.narrBody}>{localizeLabel(s.body, ko)}</div>
            </div>
          </div>
        ) : null
      })()}

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

