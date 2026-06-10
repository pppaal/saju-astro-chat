'use client'

/* ============================================================
   DayTier (1일 24시) — destinypal 5-tier 최하단 카드
   Port of js/tiers/day.jsx (88 lines) + Phase 3 신호 5종 시각화
   + HourBreakdown (24시 子~亥) + 외행성 transit 보강.

   props:
     day:     DestinyDay  (adapter toDay() output)
     hours24: 24개 HourSlot (옵션) — 시진별 score
     voc:     Void-of-Course 띠 (옵션, astro/void-of-course 신호)
     onRise:  zoom-out callback (→ 이번 달로)

   Phase 3 신규 컴포넌트 (file-local):
     CrossActivationCard   — day.crossActivations 그리드
     AppliedPatternBadge   — day.appliedPatterns (8종)
     JijangganChips        — day.jijanggan 3층
     TwelveStageMatrix     — 본명 4기둥 × 일진 지지 (12운성)
     FixedStarRow          — signal stream filter
     ArabicLotRow          — signal stream filter
     HourBreakdown         — 24h grid
   ============================================================ */

import * as React from 'react'
import type {
  DestinyDay,
  DestinyAppliedPattern,
  DestinyCrossActivation,
  DestinyJijangganLayer,
  AstroSignal,
  DestinySignal,
  Polarity,
} from '@/types/calendar'
import { sibsinArea } from '@/lib/calendar-engine/derivers/plainLanguage'
import { PLANET_KO } from '@/lib/calendar-engine/data/planetNames'
import styles from './DayTier.module.css'
import { TierSummary } from '@/components/calendar/atoms/TierSummary'
import summaryStyles from '@/components/calendar/atoms/TierSummary.module.css'
import { CrossingList } from '@/components/calendar/atoms/CrossingList'

// ============================================================================
// HourSlot — 24시진 (子=0,1 / 丑=2,3 / ... / 亥=22,23 식의 시간 매핑).
// `hour` 는 0..23 시.
// ============================================================================

export interface HourSlot {
  hour: number
  branch: string
  score: number
}

export interface DayVoc {
  active: boolean
  from?: string
  to?: string
}

export interface DayTierProps {
  day: DestinyDay
  hours24?: HourSlot[]
  voc?: DayVoc
  onRise: () => void
}

// ============================================================================
// 정렬 / 필터 helpers.
// ============================================================================

const LAYER_PRIORITY: Record<string, number> = {
  instant: 6,
  hourly: 5,
  daily: 4,
  monthly: 3,
  yearly: 2,
  decadal: 1,
}

function layerWeight(layer: string | undefined): number {
  if (!layer) return 0
  return LAYER_PRIORITY[layer] ?? 0
}

/**
 * signal stream 정렬 — (layer priority desc, |polarity| desc, weight desc).
 */
function sortSignals<T extends { layer?: string; polarity: number; weight: number }>(
  signals: T[]
): T[] {
  return [...signals].sort((a, b) => {
    const lp = layerWeight(b.layer) - layerWeight(a.layer)
    if (lp !== 0) return lp
    const pp = Math.abs(b.polarity) - Math.abs(a.polarity)
    if (pp !== 0) return pp
    return b.weight - a.weight
  })
}

function catTone(cat: string): string {
  if (cat.startsWith('saju/')) return styles.catSaju
  if (cat.startsWith('astro/')) return styles.catAstro
  if (cat.startsWith('cross/')) return styles.catCross
  return styles.catNeutral
}

function catLabel(cat: string): string {
  const second = cat.split('/')[1]
  return (second ?? cat).replace(/-/g, ' ')
}

const OUTER_PLANETS = new Set(['Saturn', 'Uranus', 'Neptune', 'Pluto'])

const ASPECT_EN: Record<string, string> = {
  합: 'conjunction',
  사각: 'square',
  삼각: 'trine',
  대립: 'opposition',
  섹스타일: 'sextile',
  퀸컹스: 'quincunx',
  반섹스타일: 'semisextile',
}

// 12지지 순환 (子 → 亥). 시진/공망/12운성 모두 동일 순서.
const BRANCHES_12 = [
  '子',
  '丑',
  '寅',
  '卯',
  '辰',
  '巳',
  '午',
  '未',
  '申',
  '酉',
  '戌',
  '亥',
] as const

// hour(0..23) → 지지 index (子=23~01h, 丑=01~03h, …)
function hourToBranchIndex(h: number): number {
  // 23시 ~ 01시 = 子 (idx 0)
  // 표준: ((h + 1) % 24) >> 1
  return Math.floor(((h + 1) % 24) / 2)
}

function hourLabelKo(h: number): string {
  const start = (h * 100).toString().padStart(4, '0')
  return `${start.slice(0, 2)}:${start.slice(2)}`
}

// ============================================================================
// Polarity chip (util.jsx Polarity 포팅).
// ============================================================================

function PolChip({ v }: { v: Polarity | number }) {
  const cls = v > 0 ? styles.polPos : v < 0 ? styles.polNeg : styles.polNeu
  const txt = v > 0 ? `+${v}` : v < 0 ? String(v) : '0'
  return <span className={`${styles.pol} ${cls}`}>{txt}</span>
}

// ============================================================================
// ScoreDial (util.jsx 포팅).
// ============================================================================

function ScoreDial({ score, label = '오늘' }: { score: number; label?: string }) {
  const r = 40
  const c = 2 * Math.PI * r
  const frac = Math.max(0, Math.min(1, score / 100))
  const col = score >= 60 ? 'var(--dp-pos)' : score >= 35 ? 'var(--dp-ember)' : 'var(--dp-neg)'
  return (
    <div className={styles.scoreDial}>
      <svg width={96} height={96} viewBox="0 0 96 96">
        <circle cx={48} cy={48} r={r} fill="none" stroke="rgba(58,46,28,0.12)" strokeWidth={5} />
        <circle
          cx={48}
          cy={48}
          r={r}
          fill="none"
          stroke={col}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          transform="rotate(-90 48 48)"
          style={{ filter: `drop-shadow(0 0 6px ${col})` }}
        />
      </svg>
      <div className={styles.sdNum}>
        <b>{score >= 60 ? '순풍' : score >= 35 ? '평이' : '역풍'}</b>
        <span>{label}</span>
      </div>
    </div>
  )
}

// ============================================================================
// Head 보강 — GeokgukStatusFrame chip.
// ============================================================================

function GeokgukStatusFrame({ status }: { status: DestinyDay['geokgukStatus'] | undefined }) {
  if (!status) return null
  const klass =
    status.status === '성격'
      ? styles.kStatusOk
      : status.status === '파격'
        ? styles.kStatusBad
        : styles.kStatusMid
  return (
    <span className={styles.statusChip}>
      <span className="kHan">{status.name}</span>
      <span className={`${styles.kStatus} ${klass}`}>{status.status}</span>
      <span style={{ color: 'var(--dp-ink-dim)' }}>{status.description}</span>
    </span>
  )
}

// ============================================================================
// Head 보강 — GongmangBanner.
// ============================================================================

function GongmangBanner({ gongmang }: { gongmang: DestinyDay['gongmang'] | undefined }) {
  if (!gongmang || gongmang.activeBranches.length === 0) return null
  return (
    <div className={styles.gongmangBanner}>
      <span className="gmHead">공망 · 空亡</span>
      {gongmang.activeBranches.map((b, i) => (
        <span className="gmBranch" key={i}>
          {b}
        </span>
      ))}
      <span className="gmNote">
        {gongmang.note ?? `본명 일주 공망 [${gongmang.natalBranches.join(' · ')}] 활성`}
      </span>
    </div>
  )
}

// ============================================================================
// Head 보강 — VocBanner (Void-of-Course).
// ============================================================================

function VocBanner({ voc }: { voc: DayVoc | undefined }) {
  if (!voc?.active) return null
  return (
    <div className={styles.vocBanner}>
      <span className="vocLabel">Moon VOC · 무경로</span>
      {(voc.from || voc.to) && (
        <span className="vocTime">
          {voc.from ?? '—'} → {voc.to ?? '—'}
        </span>
      )}
      <span>새 일은 보류, 정리·결산에 적합.</span>
    </div>
  )
}

// ============================================================================
// Phase 3 — CrossActivationCard
//   day.crossActivations 그리드 — ◆ 사주 × ✦ 점성 → meaning.
// ============================================================================

function CrossActivationCard({ items }: { items: DestinyCrossActivation[] }) {
  if (!items.length) return null
  return (
    <div className={styles.blockSm}>
      <div className={styles.secHead}>
        <h2 className={styles.secTitle}>사주·점성 동시 활성</h2>
        <span className={styles.tiny}>cross-activation · {items.length} 페어</span>
      </div>
      <div className={styles.crossGrid}>
        {items.map((c) => (
          <div className={styles.crossCard} key={c.id}>
            <div className={styles.crossPair}>
              <span className="pSaju">{c.sajuSide}</span>
              <span className="pArrow">↔</span>
              <span className="pAstro">{c.astroSide}</span>
            </div>
            <div className={styles.crossMeaning}>{c.meaning}</div>
            <div className={styles.crossFoot}>
              <span className={styles.crossWeight}>weight {(c.weight * 100).toFixed(0)} / 100</span>
              <PolChip v={c.polarity} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Phase 3 — AppliedPatternBadge
//   8종 응용격국 (상관견관·식신제살 …) — hanja + ko + polarity.
// ============================================================================

function AppliedPatternBadge({ items }: { items: DestinyAppliedPattern[] }) {
  if (!items.length) return null
  return (
    <div className={styles.blockSm}>
      <div className={styles.secHead}>
        <h2 className={styles.secTitle}>응용 격국</h2>
        <span className={styles.tiny}>applied pattern · {items.length}종 발동</span>
      </div>
      <div className={styles.appliedRow}>
        {items.map((p) => {
          const tone = p.polarity > 0 ? styles.polPosBg : p.polarity < 0 ? styles.polNegBg : ''
          return (
            <div className={`${styles.appliedBadge} ${tone}`} key={p.id}>
              <span className={styles.appliedHan}>{p.name}</span>
              <div className={styles.appliedBody}>
                <span className={styles.appliedKo}>{p.korean}</span>
                <span className={styles.tiny}>{p.rule}</span>
              </div>
              <PolChip v={p.polarity} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// Phase 3 — JijangganChips
//   본명 일주 지장간 3층 (정기 강조 + 중기 + 여기).
// ============================================================================

function JijangganChips({ jijanggan }: { jijanggan: DestinyDay['jijanggan'] | undefined }) {
  if (!jijanggan) return null
  const layers: Array<{ key: string; layer: DestinyJijangganLayer; main: boolean }> = []
  layers.push({ key: 'jeonggi', layer: jijanggan.jeonggi, main: true })
  if (jijanggan.junggi) layers.push({ key: 'junggi', layer: jijanggan.junggi, main: false })
  if (jijanggan.yeogi) layers.push({ key: 'yeogi', layer: jijanggan.yeogi, main: false })
  return (
    <div className={styles.blockSm}>
      <div className={styles.secHead}>
        <h2 className={styles.secTitle}>본명 일주 지장간</h2>
        <span className={styles.tiny}>jijanggan · 3층 (정기 · 중기 · 여기)</span>
      </div>
      <div className={styles.jijangganRow}>
        {layers.map(({ key, layer, main }) => (
          <div className={`${styles.jjChip} ${main ? styles.jjMain : ''}`} key={key}>
            <span className={styles.jjLayer}>{layer.layer}</span>
            <span className={styles.jjStem}>{layer.stem}</span>
            <span className={styles.jjMeta}>
              <span className={styles.jjSibsin}>{String(layer.sibsin)}</span>
              <span className={styles.jjEl}>{layer.element}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Phase 3 — TwelveStageMatrix
//   본명 4기둥 (年月日時) 천간 × 일진 지지 → 기둥별 12운성 4×1.
//   값은 day.twelveStageMatrix (toDay 어댑터가 getTwelveStage 로 정통 계산).
//   기둥마다 실제로 다른 운성이 나온다 (placeholder 제거됨).
// ============================================================================

function TwelveStageMatrix({ day }: { day: DestinyDay }) {
  const cells = day.twelveStageMatrix ?? []
  if (cells.length === 0) return null
  const ilbranch = cells[0]?.branch ?? ''
  return (
    <div className={styles.blockSm}>
      <div className={styles.secHead}>
        <h2 className={styles.secTitle}>본명 4기둥 × 일진 12운성</h2>
        <span className={styles.tiny}>twelve stages · 일진 지지 [{ilbranch}] 기준</span>
      </div>
      <div className={styles.tsMatrix}>
        {cells.map((c) => (
          <div className={styles.tsCell} key={c.pillar}>
            <span className={styles.tsPillar}>{c.pillar}</span>
            <span className={styles.tsStage}>{c.stage}</span>
            <span className={styles.tsBranch}>{c.stem}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Phase 3 — FixedStarRow + ArabicLotRow
//   signal stream 에서 fixed-star / arabic-part 카테고리만 추출해 별도 표시.
// ============================================================================

function isFixedStar(s: DestinySignal): boolean {
  return s.cat === 'astro/fixed-star' || s.kind === 'fixed-star'
}
function isArabicLot(s: DestinySignal): boolean {
  return s.cat === 'astro/arabic-part' || s.kind === 'arabic-part'
}

function FixedStarRow({ signals }: { signals: DestinySignal[] }) {
  const stars = signals.filter(isFixedStar)
  if (!stars.length) return null
  return (
    <div className={styles.blockSm}>
      <div className={styles.secHead}>
        <h2 className={styles.secTitle}>붙박이별 활성</h2>
        <span className={styles.tiny}>fixed-star · {stars.length}개</span>
      </div>
      <div className={styles.starRow}>
        {stars.map((s) => (
          <span className={`${styles.starChip} ${styles.fixed}`} key={s.id}>
            <span className={styles.starGlyph}>★</span>
            <span>{s.label}</span>
            <PolChip v={s.polarity} />
          </span>
        ))}
      </div>
    </div>
  )
}

function ArabicLotRow({ signals }: { signals: DestinySignal[] }) {
  const lots = signals.filter(isArabicLot)
  if (!lots.length) return null
  return (
    <div className={styles.blockSm}>
      <div className={styles.secHead}>
        <h2 className={styles.secTitle}>아라비아 부분 (Lot)</h2>
        <span className={styles.tiny}>arabic-part · {lots.length}개</span>
      </div>
      <div className={styles.starRow}>
        {lots.map((s) => (
          <span className={`${styles.starChip} ${styles.lot}`} key={s.id}>
            <span className={styles.starGlyph}>◈</span>
            <span>{s.label}</span>
            <PolChip v={s.polarity} />
          </span>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// HourBreakdown — 24시 (子~亥) score grid.
// 입력 hours24 가 비어있으면 BRANCHES_12 12 슬롯만 표시 (score 0).
// ============================================================================

function HourBreakdown({ hours24 }: { hours24: HourSlot[] | undefined }) {
  // 24슬롯 채우기 (없으면 빈 slot).
  const slots: HourSlot[] = Array.from({ length: 24 }, (_, h) => {
    const found = hours24?.find((s) => s.hour === h)
    if (found) return found
    return {
      hour: h,
      branch: BRANCHES_12[hourToBranchIndex(h)],
      score: 50,
    }
  })

  return (
    <div className={styles.block}>
      <div className={styles.secHead}>
        <h2 className={styles.secTitle}>시진별 24시 흐름</h2>
        <span className={styles.tiny}>hour breakdown · 子(23h) → 亥(21h) · score 0..100</span>
      </div>
      <div className={styles.hourGrid}>
        {slots.map((s) => {
          const tone =
            s.score >= 60 ? styles.hourBest : s.score <= 35 ? styles.hourAvoid : styles.hourMid
          return (
            <div className={`${styles.hourCell} ${tone}`} key={s.hour}>
              <span className={styles.hourGlow} />
              <span className={styles.hourBranch}>{s.branch}</span>
              <span className={styles.hourLabel}>{hourLabelKo(s.hour)}</span>
              <span className={styles.hourScore}>
                {s.score >= 60 ? '▲' : s.score <= 35 ? '▽' : '·'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// DayTier (main).
// ============================================================================

export function DayTier({ day, hours24, voc, onRise }: DayTierProps) {
  // ── transit 분리: 일반 (Sun~Mars) + 외행성 (Saturn/Uranus/Neptune/Pluto). ──
  const allTransitSignals = day.transits
  // 외행성 — day.transits 중 body 가 OUTER_PLANETS 에 들어가면 outer 로 분리.
  // adapter 의 DestinypalDayTransit 은 source 가 없으므로 AstroSignal 형태로
  // 다루기 위한 정규화.
  type T = AstroSignal | (typeof day.transits)[number]
  const isOuter = (t: T): boolean => OUTER_PLANETS.has((t as { body?: string }).body ?? '')
  const innerTransits = allTransitSignals.filter((t) => !isOuter(t))
  const outerTransits = allTransitSignals.filter((t) => isOuter(t))

  // ── signal stream 정렬 ──
  // day.signals (SajuSignal[]) + day.transits (AstroSignal[]) + day.crossSignals
  // 를 합친 allSignals 가 있다면 그것을, 아니면 day.signals 만 사용.
  const allSignals: DestinySignal[] = day.allSignals?.length
    ? day.allSignals
    : (day.signals as DestinySignal[])
  const sortedSignals = sortSignals(allSignals)

  // signal stream 에서 fixed-star / arabic-part 는 별도 row 로 빼므로 stream 에서 제외.
  const streamSignals = sortedSignals.filter((s) => !isFixedStar(s) && !isArabicLot(s))

  // ── 쉬운 요약 — 점수 구간으로 "오늘 어때" 한 줄 + 좋은것/조심 카드 ──
  const dayBand = day.score >= 60 ? 'good' : day.score >= 35 ? 'mid' : 'low'
  const dayHeadline =
    dayBand === 'good'
      ? '오늘은 순풍 — 흐름이 우호적인 날'
      : dayBand === 'mid'
        ? '오늘은 무난한 흐름이에요'
        : '오늘은 조심하는 게 좋은 날'
  const daySub =
    dayBand === 'good'
      ? '하고 싶던 일을 밀어붙이기 좋아요. 연락·제안·중요한 결정에 우호적인 날.'
      : dayBand === 'mid'
        ? '큰일을 새로 벌이기보다 정리·마무리에 좋은 날. 무리만 안 하면 무난해요.'
        : '새 일을 벌이기보다 점검·휴식에 좋은 날. 중요한 결정은 가능하면 미루세요.'
  const cleanReason = (s: string) => {
    const c = s
      .replace(/^[↑↓·\s]+/, '')
      .replace(/^\[[^\]]*\]\s*/, '')
      .replace(/^(이달|오늘)\s·\s/, '')
      .split('—')[0] // "A — B(설명)" 이면 핵심 A 만
      .trim()
    return c.length > 48 ? c.slice(0, 47).trim() + '…' : c
  }
  const dayGood = (day.topReasons ?? []).map(cleanReason).filter(Boolean)[0]
  const dayCaution = (day.cautions ?? []).map(cleanReason).filter(Boolean)[0]
  const dayCards = [
    dayGood ? { icon: '💚', label: '좋은 것', body: dayGood } : null,
    dayCaution ? { icon: '⚠️', label: '조심할 것', body: dayCaution } : null,
  ].filter((c): c is { icon: string; label: string; body: string } => c !== null)

  // ── 시간별 사주 × 점성 교차 — 켜지는 시진(십신) × 그 시각 상승궁. ──
  const hourCrossItems = (day.hourCrossings ?? []).map((h) => {
    const branch = h.when.match(/\((.*?)\)/)?.[1] ?? ''
    const timeShort = h.when.replace(/\s*\(.*\)/, '').trim()
    const tone = h.tone === 'good' ? '길' : '주의'
    const rising = h.risingSignKo ? ` × ${h.risingSignKo} 상승` : ''
    return {
      when: timeShort,
      title: `${branch ? `${branch} · ` : ''}${h.sibsin} ${tone}${rising}`,
      detail: [h.narrative, h.ruler ? `상승궁 룰러 ${h.ruler}` : ''].filter(Boolean).join(' · '),
    }
  })

  return (
    <div className={styles.tierInner} data-screen-label={`1일 ${day.date}`}>
      <button className={styles.rise} onClick={onRise}>
        ↑ 이번 달로 줌아웃
      </button>

      <div className={styles.eyebrow}>
        1일 · DAILY · {day.date}
        {day.dateKo && <span style={{ marginLeft: 8 }}>{day.dateKo}</span>}
      </div>

      {/* ── 쉬운 요약 (오늘 어때 한눈에). 일진·12운성·신호는 아래 자세히로. ── */}
      <TierSummary headline={dayHeadline} sub={daySub} cards={dayCards} />

      {/* ── 시간별 사주 × 점성 교차 — 켜지는 시진 × 그 시각 상승궁. ── */}
      {hourCrossItems.length > 0 && (
        <CrossingList heading="시간별 사주 × 점성 교차 · 오늘" items={hourCrossItems} />
      )}

      {/* ── 전문가용 상세 — 일진·격국·공망·신호·12운성·시진 일체 접어 둠 ── */}
      <details className={summaryStyles.details}>
        <summary className={summaryStyles.detailsSummary}>자세히 보기 · 일진과 근거</summary>

        {/* head 보강 — 격국 status / 공망 / VOC */}
        <div className={styles.headChips}>
          <GeokgukStatusFrame status={day.geokgukStatus} />
        </div>
        <GongmangBanner gongmang={day.gongmang} />
        <VocBanner voc={voc} />

        {/* head: 일진 + score + one line (day.jsx 원본) */}
        <div className={styles.dayHead}>
          <div className={styles.iljinBig}>
            <span className="han">{day.iljin.hanja}</span>
            <div className="meta">
              <div className="kr">{day.iljin.kr}</div>
              <div className="en">{day.iljin.en}</div>
              <div className="ss">
                일진 · 일간 기준 {String(day.iljinSibsin)}
                {sibsinArea(String(day.iljinSibsin)) !== String(day.iljinSibsin)
                  ? ` (${sibsinArea(String(day.iljinSibsin))})`
                  : ''}
              </div>
            </div>
          </div>
          <div className={styles.dayScore}>
            <ScoreDial score={day.score} label="종합" />
            <p className={styles.oneline}>{day.oneLine}</p>
          </div>
        </div>

        {/* 이렇게 읽은 이유 (흐름·교차 신호) — 풀폭 */}
        <div>
          <div className={`${styles.panel} ${styles.astro}`}>
            {/* 합치기: 날것 트랜짓 덤프 → "이렇게 읽은 이유"(사람 말). 엔진이 만든
              topReasons/cautions 를 우선 노출하고, 원자료(점성 트랜짓)는 접어둔다.
              (premium DayWhyCard 패턴 + destinypal 만세력 스킨) */}
            <div className={styles.eyebrow}>왜 이런 하루? · 근거</div>
            {(day.topReasons ?? []).length === 0 && (day.cautions ?? []).length === 0 ? (
              <p className={styles.whyMuted}>오늘은 두드러진 신호 없이 무난한 흐름이에요.</p>
            ) : (
              <ul className={styles.whyList}>
                {(day.topReasons ?? []).map((r, i) => (
                  <li className={styles.whyPos} key={`wp-${i}`}>
                    <span className={styles.whyArrow}>↑</span> {r.replace(/^[↑↓·]\s*/, '')}
                  </li>
                ))}
                {(day.cautions ?? []).map((c, i) => (
                  <li className={styles.whyNeg} key={`wn-${i}`}>
                    <span className={styles.whyArrow}>↓</span> {c.replace(/^[↑↓·]\s*/, '')}
                  </li>
                ))}
              </ul>
            )}

            {day.shinsalActive.length > 0 && (
              <div className={styles.shinsalRow}>
                {day.shinsalActive.map((s, i) => (
                  <span className={styles.ssPill} key={i}>
                    {s}
                  </span>
                ))}
              </div>
            )}

            {/* 근거 신호 (점성 트랜짓 원자료) — 기본 접힘. 원하는 사람만 펼침. */}
            <details className={styles.evidence}>
              <summary className={styles.evidenceSummary}>근거 신호 보기 · 점성 트랜짓</summary>
              <div className={styles.transitRow}>
                {innerTransits.map((t, i) => {
                  const body = (t as { body?: string }).body ?? ''
                  const aspect = (t as { aspect?: string }).aspect ?? ''
                  const target = (t as { target?: string }).target ?? ''
                  const glyph = (t as { glyph?: string }).glyph ?? '✦'
                  return (
                    <div className={styles.transit} key={`it-${i}`}>
                      <span className="g">{glyph}</span>
                      <div className="tt">
                        <div className="a">
                          {body} {aspect} <span className="aTarget">→ {target}</span>
                        </div>
                        <div className="s">{ASPECT_EN[aspect] ?? aspect}</div>
                      </div>
                      <PolChip v={t.polarity} />
                    </div>
                  )
                })}
                {outerTransits.map((t, i) => {
                  const body = (t as { body?: string }).body ?? ''
                  const aspect = (t as { aspect?: string }).aspect ?? ''
                  const target = (t as { target?: string }).target ?? ''
                  const glyph = (t as { glyph?: string }).glyph ?? '✦'
                  return (
                    <div className={`${styles.transit} ${styles.outer}`} key={`ot-${i}`}>
                      <span className="g">{glyph}</span>
                      <div className="tt">
                        <div className="a">
                          {body}({PLANET_KO[body] ?? ''}) {aspect}{' '}
                          <span className="aTarget">→ {target}</span>
                        </div>
                        <div className="s">{ASPECT_EN[aspect] ?? aspect}</div>
                      </div>
                      <PolChip v={t.polarity} />
                    </div>
                  )
                })}
              </div>
            </details>
          </div>
        </div>

        {/* Phase 3 — Cross Activation */}
        <CrossActivationCard items={day.crossActivations} />

        {/* Phase 3 — Applied Pattern */}
        <AppliedPatternBadge items={day.appliedPatterns} />

        {/* Phase 3 — Jijanggan 3층 */}
        <JijangganChips jijanggan={day.jijanggan} />

        {/* Phase 3 — TwelveStageMatrix */}
        <TwelveStageMatrix day={day} />

        {/* Phase 3 — FixedStar / ArabicLot rows */}
        <FixedStarRow signals={sortedSignals} />
        <ArabicLotRow signals={sortedSignals} />

        {/* signal stream (day.jsx 원본) */}
        <div className={styles.block}>
          <div className={styles.secHead}>
            <h2 className={styles.secTitle}>오늘의 신호</h2>
            <span className={styles.tiny}>
              총 {day.totalSignals}개 중 핵심 발췌 · polarity −3 ~ +3
            </span>
          </div>
          <div className={styles.signalStream}>
            {streamSignals.map((s) => (
              <div className={styles.sig} key={s.id}>
                <span className={`${styles.cat ?? ''} cat ${catTone(s.cat)}`}>
                  {catLabel(s.cat)}
                </span>
                <div className="body">
                  <span className="lb">{s.label}</span>
                  {s.romaji && <span className="rm"> · {s.romaji}</span>}
                </div>
                <PolChip v={s.polarity} />
              </div>
            ))}
            {day.totalSignals > streamSignals.length && (
              <div className={styles.sigMore}>
                … 외 {day.totalSignals - streamSignals.length}개 (transit aspects · 시진별 십신 ·
                외행성)
              </div>
            )}
          </div>
        </div>

        {/* HourBreakdown 24h — footer 위 */}
        <HourBreakdown hours24={hours24} />
      </details>

      <div className={styles.riseCenter}>
        <button className={`${styles.rise} ${styles.riseSmall}`} onClick={onRise}>
          ↑ 다시 위로 — 줌아웃
        </button>
      </div>
    </div>
  )
}

export default DayTier
