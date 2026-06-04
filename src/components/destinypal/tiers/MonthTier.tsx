// src/components/destinypal/tiers/MonthTier.tsx
//
// destinypal MonthTier — 1달 (30일 캘린더) 카드.
//
// 포팅 원본: destinypal-extracted/js/tiers/month.jsx (142줄)
//
// Phase B 보강:
//   1. 30일 calendar heatmap — cell.intensity 는 실데이터 (백엔드
//      CalendarCell.derivedScore × 0.01); 의사난수 dayIntensity() 제거됨.
//   2. mark 9종 — 기존 best/avoid/converge/caution/good/focus +
//      신규 phase(◐ 달 위상) / voc(회색 띠 VoC) / return(○ Lunar Return) /
//      lifecycle(◇ 외행성 exact).
//   3. 응용 격국 patterns daily count 블록 — 핵심 이벤트 패널 아래.
//   4. narrative cards 각 source 메타.
//   5. 조후 강조 박스 — split 위 신설 (월령 지지 기반).
//   6. converge — cross-activation A등급 매핑 의미 추가 노출.
//   7. 월운 sibsin 라벨 — Ganji 옆 한 줄 ('甲(정재) / 午(편관) — 재생관 흐름').
//   8. ZR L2 progress 바 — narrative 위 1줄.
//
// atoms: Ganji / ThemeBars / LayerTag 는 destinypal-extracted/js/util.jsx 의
// 동형 React 컴포넌트. Agent A 의 atoms 배럴이 도착하기 전까지 이 파일에
// 동일 시그니처 로컬 컴포넌트를 inline 으로 둔다. 배럴이 만들어지면
// import { Ganji, ThemeBars, LayerTag } from '@/components/destinypal/atoms'
// 한 줄로 교체.

'use client'

import type { CSSProperties, ReactNode } from 'react'
import type {
  DestinyMonth,
  DestinyCalendarCell,
  DestinyDayMark,
  Ganji as GanjiType,
  DestinyMonthTheme,
  TaggedNarrative,
  DestinyMonthAppliedPattern,
  DestinyMonthJohu,
  DestinyMonthZRProgress,
  DestinyMonthNarrativeCard,
} from '@/types/destinypal'

import styles from './MonthTier.module.css'

// ============================================================================
// Props
// ============================================================================

export interface MonthTierProps {
  /** 30 cells + themes + narrative + converge — Phase A adapter 결과. */
  month: DestinyMonth
  /** focusDay (1..30) 로 줌인. */
  onDive: (focusDay: number) => void
  /** YearTier 로 줌아웃. */
  onRise: () => void
}

// ============================================================================
// 로컬 atoms (Agent A 의 atoms 배럴이 도착하면 교체될 placeholders).
// destinypal-extracted/js/util.jsx 와 동형.
// ============================================================================

interface LocalGanjiProps {
  data: GanjiType
  size?: number
  en?: boolean
  accent?: 'ember' | 'astro'
}
function Ganji({ data, size = 30, en = true, accent = 'ember' }: LocalGanjiProps) {
  if (!data) return null
  const col = accent === 'ember' ? 'var(--ember-2, #f0c873)' : 'var(--accent-2, #8fb6ff)'
  return (
    <span
      style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 1 }}
    >
      <span
        style={{
          fontFamily: 'var(--serif, "Cormorant Garamond", serif)',
          letterSpacing: '0.02em',
          fontSize: size,
          color: col,
        }}
      >
        {data.hanja}
      </span>
      <span
        style={{
          fontFamily: 'var(--mono, monospace)',
          color: 'var(--ink-mute, #717aa3)',
          letterSpacing: '0.04em',
          fontSize: Math.max(10, size * 0.32),
          marginTop: 5,
        }}
      >
        {data.kr}
      </span>
      {en && (
        <span
          style={{
            fontFamily: 'var(--mono, monospace)',
            color: 'var(--ink-faint, #454c72)',
            fontStyle: 'italic',
            letterSpacing: '0.02em',
            fontSize: Math.max(9, size * 0.28),
            marginTop: 2,
          }}
        >
          {data.en}
        </span>
      )}
    </span>
  )
}

interface LocalThemeBarsProps {
  items: DestinyMonthTheme[]
  warm?: boolean
}
function ThemeBars({ items, warm = false }: LocalThemeBarsProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {items.map((t) => (
        <div
          key={t.key}
          style={{
            display: 'grid',
            gridTemplateColumns: '64px 1fr 30px',
            alignItems: 'center',
            gap: 11,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--mono, monospace)',
              fontSize: 11,
              color: 'var(--ink-dim, #aab2d6)',
              letterSpacing: '0.03em',
            }}
          >
            {t.ko}
          </span>
          <span
            style={{
              height: 6,
              borderRadius: 6,
              background: 'rgba(255,255,255,0.07)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <span
              style={{
                display: 'block',
                height: '100%',
                width: `${Math.max(0, Math.min(100, t.v))}%`,
                borderRadius: 6,
                background: warm
                  ? 'linear-gradient(90deg, rgba(217,168,74,0.5), var(--ember, #d9a84a))'
                  : 'linear-gradient(90deg, var(--accent-deep, #2f5bc4), var(--accent, #5b8def))',
                boxShadow: warm
                  ? '0 0 10px var(--ember-glow, rgba(217,168,74,0.42))'
                  : '0 0 10px var(--accent-glow, rgba(91,141,239,0.55))',
              }}
            />
          </span>
          <span
            style={{
              fontFamily: 'var(--mono, monospace)',
              fontSize: 11,
              color: 'var(--ink-mute, #717aa3)',
              textAlign: 'right',
            }}
          >
            {t.v}
          </span>
        </div>
      ))}
    </div>
  )
}

interface LocalLayerTagProps {
  kind: 'saju' | 'astro'
}
function LayerTag({ kind }: LocalLayerTagProps) {
  const isSaju = kind === 'saju'
  const pipBg = isSaju ? 'var(--ember, #d9a84a)' : 'var(--accent, #5b8def)'
  const pipShadow = isSaju
    ? '0 0 8px var(--ember-glow, rgba(217,168,74,0.42))'
    : '0 0 8px var(--accent-glow, rgba(91,141,239,0.55))'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        fontFamily: 'var(--mono, monospace)',
        fontSize: 10,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: 'var(--ink-mute, #717aa3)',
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: pipBg,
          boxShadow: pipShadow,
        }}
      />
      {isSaju ? '사주 · SAJU' : '점성 · ASTRO'}
    </span>
  )
}

// ============================================================================
// 헬퍼
// ============================================================================

/** mark → 별표 글리프. month.jsx 의 star map + Phase B 4종. */
const STAR_GLYPH: Record<DestinyDayMark, string> = {
  best: '✦',
  avoid: '✕',
  converge: '✶',
  caution: '△',
  good: '·',
  focus: '◎',
  phase: '◐',
  voc: '~',
  return: '○',
  lifecycle: '◇',
}

/**
 * intensity → glow 색상.
 * 원본 month.jsx cellGlow() 와 동형. 단,
 *   - intensity 는 cell.derivedScore × 0.01 (백엔드 실데이터, 의사난수 제거).
 *   - avoid 셀은 빨강 톤; 나머지는 파랑 starlight.
 */
function cellGlow(intensity: number, mark: DestinyDayMark | null): {
  bg: string
  glow: string
} {
  if (mark === 'avoid') {
    return {
      bg: 'rgba(224,115,95,0.10)',
      glow: `rgba(224,115,95,${0.1 + intensity * 0.2})`,
    }
  }
  const op = 0.06 + intensity * 0.5
  return {
    bg: `rgba(91,141,239,${intensity * 0.14})`,
    glow: `radial-gradient(circle at 60% 40%, rgba(143,182,255,${op}), transparent 70%)`,
  }
}

/** ISO 'YYYY-MM-DD' → Date 0..6 dow (Sun=0). */
function firstDowOfMonth(ym: string): number {
  // ym = "YYYY-MM"
  const [y, m] = ym.split('-').map((s) => parseInt(s, 10))
  if (!Number.isFinite(y) || !Number.isFinite(m)) return 0
  // Use local Date.UTC then read getUTCDay to avoid TZ drift.
  const d = new Date(Date.UTC(y, m - 1, 1))
  return d.getUTCDay()
}

const DOW_KO = ['일', '월', '화', '수', '목', '금', '토'] as const

/** mark → CSS module class. */
function markClass(mark: DestinyDayMark | null): string {
  if (!mark) return ''
  switch (mark) {
    case 'best': return styles.markBest
    case 'avoid': return styles.markAvoid
    case 'converge': return styles.markConverge
    case 'caution': return styles.markCaution
    case 'good': return styles.markGood
    case 'phase': return styles.markPhase
    case 'voc': return styles.markVoc
    case 'return': return styles.markReturn
    case 'lifecycle': return styles.markLifecycle
    case 'focus': return ''
  }
}

// ============================================================================
// MonthTier
// ============================================================================

export function MonthTier({ month, onDive, onRise }: MonthTierProps): ReactNode {
  const firstDow = firstDowOfMonth(month.ym)

  // narrative 가 source 메타 있는 버전이면 그걸 쓰고, 아니면 일반 TaggedNarrative.
  const narrativeCards: DestinyMonthNarrativeCard[] =
    month.narrativeWithSource && month.narrativeWithSource.length > 0
      ? month.narrativeWithSource
      : (month.narrative as TaggedNarrative[]).map((n) => ({ ...n }))

  return (
    <div className={styles.tierInner} data-screen-label={`1달 ${month.ym}`}>
      <button type="button" className={styles.rise} onClick={onRise}>
        ↑ 올해로 줌아웃
      </button>

      {/* head: 라벨 + 월운 Ganji */}
      <div className={styles.calHead}>
        <div>
          <div
            className={styles.eyebrow}
            style={{ marginBottom: 0 }}
          >
            1달 · MONTHLY · {month.ym}
          </div>
          <h1 className={styles.headTitle}>{month.label}의 흐름</h1>
          {/* 월운 sibsin 라벨 (Phase B 신규) */}
          {(month.woolunStemSibsin ||
            month.woolunBranchSibsin ||
            month.woolunPatternLabel) && (
            <div className={styles.woolunLine}>
              {month.woolunStemSibsin && (
                <>
                  <span>{month.woolun.hanja.slice(0, 1)}</span>
                  <span className={styles.sibsinChip}>{month.woolunStemSibsin}</span>
                </>
              )}
              {month.woolunBranchSibsin && (
                <>
                  <span style={{ marginLeft: 10 }}>/ {month.woolun.hanja.slice(1, 2)}</span>
                  <span className={styles.sibsinChip}>{month.woolunBranchSibsin}</span>
                </>
              )}
              {month.woolunPatternLabel && (
                <span className={styles.patternChip}>— {month.woolunPatternLabel}</span>
              )}
            </div>
          )}
        </div>
        <div className={styles.headSide}>
          <LayerTag kind="saju" />
          <div style={{ textAlign: 'center' }}>
            <Ganji data={month.woolun} size={30} />
          </div>
          <span className={styles.tiny}>
            월운{month.woolunSibsin ? ` · ${month.woolunSibsin}` : ''}
          </span>
        </div>
      </div>

      {/* 조후 강조 박스 (Phase B 신규) */}
      {month.johu && <JohuBox johu={month.johu} />}

      {/* 30일 calendar heatmap */}
      <div className={styles.calGrid}>
        {DOW_KO.map((d) => (
          <div className={styles.calDow} key={d}>
            {d}
          </div>
        ))}
        {Array.from({ length: firstDow }).map((_, i) => (
          <div key={`e${i}`} />
        ))}
        {month.calendar.map((c) => (
          <CalendarCell
            key={c.d}
            cell={c}
            onClick={c.focus ? () => onDive(c.d) : undefined}
          />
        ))}
      </div>

      {/* legend */}
      <CalendarLegend month={month} />

      {/* theme scores + key events 50:50 */}
      <div className={styles.split}>
        <div className={`${styles.panel} ${styles.panelSaju}`}>
          <div className={`${styles.eyebrow} ${styles.eyebrowEmber}`}>테마 점수</div>
          <ThemeBars items={month.themes} warm />
        </div>

        <div className={`${styles.panel} ${styles.panelAstro}`}>
          <div className={styles.eyebrow}>핵심 이벤트</div>
          <div className={styles.eventRow}>
            <span className={`${styles.pol} ${styles.polP}`}>BEST</span>
            <span className={styles.eventDate}>{month.bestDay.date}</span>
            <span className={styles.tiny}>score {month.bestDay.score}</span>
          </div>
          <div className={styles.eventRow}>
            <span className={`${styles.pol} ${styles.polN}`}>AVOID</span>
            <span className={styles.eventDate}>
              {month.avoidDays.length > 0 ? month.avoidDays.join(' · ') : '—'}
            </span>
          </div>
          <div className={styles.eventRow}>
            <span className={`${styles.pol} ${styles.polZ}`}>주의</span>
            <span className={styles.eventDateDim}>
              {month.cautionDays.length > 0 ? month.cautionDays.join(' · ') : '—'}
            </span>
          </div>
          <div className={styles.eventRow}>
            <span className={`${styles.pol} ${styles.polGood}`}>길일</span>
            <span className={styles.eventDateDim}>
              {month.goodDays.length > 0 ? month.goodDays.join(' · ') : '—'}
            </span>
          </div>

          {/* 응용 격국 패턴 daily count (Phase B 신규) */}
          {month.appliedPatterns && month.appliedPatterns.length > 0 && (
            <AppliedPatternsBlock patterns={month.appliedPatterns} />
          )}
        </div>
      </div>

      {/* ZR L2 progress (Phase B 신규) */}
      {month.zrL2Progress && <ZRProgressBar progress={month.zrL2Progress} />}

      {/* narrative */}
      <div className={styles.blockSm}>
        <div className={styles.secHead}>
          <h2 className={styles.secTitle}>이 달의 이야기</h2>
          <span className={styles.tiny}>사주 + 점성 narrative</span>
        </div>
        <div className={styles.narr}>
          {narrativeCards.map((n, i) => (
            <div className={styles.narrCard} key={`${n.tag}-${i}`}>
              <span className={styles.narrTag}>{n.tag}</span>
              <div className={styles.narrBody}>{n.body}</div>
              {n.source && <div className={styles.narrSource}>via {n.source}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* converge */}
      <ConvergeCard converge={month.converge} />

      {/* dive */}
      <div className={styles.diveWrap}>
        <button
          type="button"
          className={styles.dive}
          onClick={() => onDive(month.focusDay)}
        >
          {month.focusDay}일로 줌인
          <span className={styles.diveArrow}>↓</span>
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// 서브 컴포넌트
// ============================================================================

interface CalendarCellProps {
  cell: DestinyCalendarCell
  onClick?: () => void
}

function CalendarCell({ cell, onClick }: CalendarCellProps): ReactNode {
  const g = cellGlow(cell.intensity, cell.mark)
  const cls = [
    styles.cell,
    cell.focus ? styles.cellFocus : '',
    cell.focus && onClick ? styles.cellClickable : '',
    markClass(cell.mark),
  ]
    .filter(Boolean)
    .join(' ')
  const cellStyle: CSSProperties = { background: g.bg }
  const glowStyle: CSSProperties = { background: g.glow }
  return (
    <div
      className={cls}
      onClick={onClick}
      title={`${cell.ds}${cell.mark ? ` · ${cell.mark}` : ''}${
        cell.score !== undefined ? ` · score ${cell.score}` : ''
      }`}
      style={cellStyle}
    >
      <div className={styles.glow} style={glowStyle} />
      <span className={styles.dnum}>{cell.d}</span>
      {cell.focus && <span className={styles.ftag}>오늘</span>}
      {cell.mark && cell.mark !== 'focus' && STAR_GLYPH[cell.mark] && (
        <span className={styles.star}>{STAR_GLYPH[cell.mark]}</span>
      )}
    </div>
  )
}

interface CalendarLegendProps {
  month: DestinyMonth
}

function CalendarLegend({ month }: CalendarLegendProps): ReactNode {
  return (
    <div className={styles.calLegend}>
      <span className={styles.leg}>
        <span
          className={styles.sw}
          style={{ background: 'var(--accent, #5b8def)' }}
        />
        신호 강함
      </span>
      <span className={styles.leg}>
        <span
          className={styles.sw}
          style={{ background: 'rgba(91,141,239,0.25)' }}
        />
        약함
      </span>
      <span
        className={styles.leg}
        style={{ color: 'var(--pos, #57d6a6)' }}
      >
        ✦ best {month.bestDay.date}
      </span>
      {month.avoidDays.length > 0 && (
        <span
          className={styles.leg}
          style={{ color: 'var(--neg, #e0735f)' }}
        >
          ✕ avoid {month.avoidDays.join(' · ')}
        </span>
      )}
      <span
        className={styles.leg}
        style={{ color: 'var(--ember-2, #f0c873)' }}
      >
        ✶ 수렴 {month.converge.date.slice(5)}
      </span>
      <span
        className={styles.leg}
        style={{ color: 'var(--accent-2, #8fb6ff)' }}
      >
        ◎ 오늘 (day {month.focusDay})
      </span>
      {/* Phase B 신규 4종 legend */}
      <span
        className={styles.leg}
        style={{ color: 'var(--violet-2, #c5a3f5)' }}
      >
        ◐ 위상 변환
      </span>
      <span
        className={styles.leg}
        style={{ color: 'var(--ink-mute, #717aa3)' }}
      >
        ▤ VoC (회색 띠)
      </span>
      {month.lunarReturnIso && (
        <span
          className={styles.leg}
          style={{ color: 'var(--accent-2, #8fb6ff)' }}
        >
          ○ Lunar Return
        </span>
      )}
      <span
        className={styles.leg}
        style={{ color: 'var(--ember, #d9a84a)' }}
      >
        ◇ 외행성 exact
      </span>
    </div>
  )
}

interface JohuBoxProps {
  johu: DestinyMonthJohu
}

function JohuBox({ johu }: JohuBoxProps): ReactNode {
  return (
    <div className={styles.johuBox}>
      <div className={styles.johuBadge}>{johu.monthBranch}</div>
      <div className={styles.johuBody}>
        <div className={styles.johuLead}>{johu.oneLine}</div>
        {johu.source && <div className={styles.johuSrc}>via {johu.source}</div>}
      </div>
    </div>
  )
}

interface AppliedPatternsBlockProps {
  patterns: DestinyMonthAppliedPattern[]
}

function AppliedPatternsBlock({ patterns }: AppliedPatternsBlockProps): ReactNode {
  return (
    <div className={styles.appliedBlock}>
      <div className={styles.appliedHead}>응용 패턴 · 30일 활성</div>
      <div className={styles.appliedRow}>
        {patterns.map((p) => (
          <span className={styles.appliedChip} key={p.name}>
            <span className={styles.appliedName}>{p.name}</span>
            <span className={styles.appliedCount}>{p.activeDays}일</span>
          </span>
        ))}
      </div>
    </div>
  )
}

interface ZRProgressBarProps {
  progress: DestinyMonthZRProgress
}

function ZRProgressBar({ progress }: ZRProgressBarProps): ReactNode {
  const pct = Math.round(Math.max(0, Math.min(1, progress.progress)) * 100)
  return (
    <div className={styles.zrBar}>
      <span className={styles.zrLbl}>
        ZR · {progress.kind === 'fortune' ? '운명' : '정신'} L2 · {progress.sign} ({progress.ruler})
      </span>
      <span className={styles.zrTrack}>
        <span className={styles.zrFill} style={{ width: `${pct}%` }} />
      </span>
      <span className={styles.zrPct}>{pct}%</span>
    </div>
  )
}

interface ConvergeCardProps {
  converge: DestinyMonth['converge']
}

function ConvergeCard({ converge }: ConvergeCardProps): ReactNode {
  // 'YYYY-MM-DD'.slice(5) → 'MM-DD'; replace dash with mid-dot for display.
  const display = converge.date.slice(5).replace('-', '·')
  return (
    <div className={styles.converge}>
      <div className={styles.convergeHead}>
        <div className={`${styles.eyebrow} ${styles.eyebrowEmber}`}>
          수렴 일 · 두 시스템이 함께 강한 날
        </div>
        <span className={styles.tiny}>score {converge.score}</span>
      </div>

      <div className={styles.convergeMid}>
        <span className={styles.convergeDate}>{display}</span>
        <span className={styles.convergeOneline}>{converge.meaning}</span>
      </div>

      {/* cross-activation A등급 매핑 의미 (Phase B 보강) */}
      {converge.bothSystems && (
        <div className={styles.convergeCrossMeaning}>
          <b>A-grade</b>
          사주·점성 cross-activation 동시 발화 — 두 시스템의 같은 테마가 같은 날
          함께 켜진다. 합의된 주제는 평소보다 약 1.5× 강하게 체감.
        </div>
      )}

      <div className={styles.convSys}>
        <div>
          <LayerTag kind="astro" />
          <ul className={styles.convList}>
            {converge.astro.map((a, i) => (
              <li className={styles.convItem} key={`a${i}`}>
                {a}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <LayerTag kind="saju" />
          <ul className={styles.convList}>
            {converge.saju.map((s, i) => (
              <li className={styles.convItem} key={`s${i}`}>
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default MonthTier
