'use client'

/* ============================================================
   DayTier (1일 24시) — destinypal 5-tier 최하단 카드
   Port of js/tiers/day.jsx (88 lines) + Phase 3 신호 5종 시각화
   + HourBreakdown (24시 子~亥) + 외행성 transit 보강.

   props:
     day:     DestinyDay  (adapter toDay() output)
     hours24: 24개 HourSlot (옵션) — 시진별 score / topDomain
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
} from '@/types/destinypal'
import styles from './DayTier.module.css'

// ============================================================================
// HourSlot — 24시진 (子=0,1 / 丑=2,3 / ... / 亥=22,23 식의 시간 매핑).
// `hour` 는 0..23 시.
// ============================================================================

export interface HourSlot {
  hour: number
  branch: string
  score: number
  topDomain?: string
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
  signals: T[],
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
const PLANET_KO: Record<string, string> = {
  Sun: '태양', Moon: '달', Mercury: '수성', Venus: '금성', Mars: '화성',
  Jupiter: '목성', Saturn: '토성', Uranus: '천왕성', Neptune: '해왕성', Pluto: '명왕성',
}

const ASPECT_EN: Record<string, string> = {
  '합': 'conjunction',
  '사각': 'square',
  '삼각': 'trine',
  '대립': 'opposition',
  '섹스타일': 'sextile',
  '퀸컹스': 'quincunx',
  '반섹스타일': 'semisextile',
}

// 12지지 순환 (子 → 亥). 시진/공망/12운성 모두 동일 순서.
const BRANCHES_12 = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const

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
// ThemeBars (util.jsx 포팅, warm 톤).
// ============================================================================

function ThemeBars({
  items,
  warm = false,
}: {
  items: Array<{ key: string; ko: string; v: number }>
  warm?: boolean
}) {
  return (
    <div className={styles.themebars}>
      {items.map((t) => (
        <div className={styles.tbRow} key={t.key}>
          <span className={styles.tbLbl}>{t.ko}</span>
          <span className={styles.tbTrack}>
            <span
              className={`${styles.tbFill} ${warm ? styles.tbFillWarm : styles.tbFillCool}`}
              style={{ width: `${Math.max(0, Math.min(100, t.v))}%` }}
            />
          </span>
          <span className={styles.tbVal}>{t.v}</span>
        </div>
      ))}
    </div>
  )
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
        <b>{score}</b>
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
        <span className="gmBranch" key={i}>{b}</span>
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
          const tone =
            p.polarity > 0
              ? styles.polPosBg
              : p.polarity < 0
                ? styles.polNegBg
                : ''
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
          <div
            className={`${styles.jjChip} ${main ? styles.jjMain : ''}`}
            key={key}
          >
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
//   본명 4기둥 (年月日時) × 일진 지지 → 12운성 mini 4×1.
//
// 입력 데이터가 day prop 에 직접 없어 — 본명 컨텍스트 없이 일진 지지 1개에 대한
// "4기둥별 12운성" 을 계산해야 함. day.iljin 의 지지 + 시뮬레이션 4기둥은
// 데이터가 없으므로 placeholder: day.iljin.hanja[1] 만 보여주는 1×4 표시
// (실제 컨텍스트는 useNatalContext 와 합쳐서 채우는 것은 상위 페이지의 책임).
// ============================================================================

const STAGES_12 = [
  '長生', '沐浴', '冠帶', '臨官', '帝旺', '衰',
  '病', '死', '墓', '絕', '胎', '養',
] as const

const PILLARS_KO = ['年', '月', '日', '時'] as const

function TwelveStageMatrix({ day }: { day: DestinyDay }) {
  const ilbranch = day.iljin.hanja?.[1] ?? ''
  if (!ilbranch) return null
  // 표시용: 4기둥 모두 일진 지지의 단일 stage (placeholder — 실제 값은 본명 4지지
  // 와 각각의 12운성 매핑이 필요. UI 골자는 디자인 의도대로 4 슬롯을 보장).
  const idx = BRANCHES_12.indexOf(ilbranch as (typeof BRANCHES_12)[number])
  const stage = idx >= 0 ? STAGES_12[idx] : '—'
  return (
    <div className={styles.blockSm}>
      <div className={styles.secHead}>
        <h2 className={styles.secTitle}>본명 4기둥 × 일진 12운성</h2>
        <span className={styles.tiny}>twelve stages · 일진 지지 [{ilbranch}] 기준</span>
      </div>
      <div className={styles.tsMatrix}>
        {PILLARS_KO.map((p) => (
          <div className={styles.tsCell} key={p}>
            <span className={styles.tsPillar}>{p}</span>
            <span className={styles.tsStage}>{stage}</span>
            <span className={styles.tsBranch}>{ilbranch}</span>
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
// HourBreakdown — 24시 (子~亥) score grid + topDomain.
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
        <span className={styles.tiny}>
          hour breakdown · 子(23h) → 亥(21h) · score 0..100
        </span>
      </div>
      <div className={styles.hourGrid}>
        {slots.map((s) => {
          const tone =
            s.score >= 60
              ? styles.hourBest
              : s.score <= 35
                ? styles.hourAvoid
                : styles.hourMid
          return (
            <div className={`${styles.hourCell} ${tone}`} key={s.hour}>
              <span className={styles.hourGlow} />
              <span className={styles.hourBranch}>{s.branch}</span>
              <span className={styles.hourLabel}>{hourLabelKo(s.hour)}</span>
              <span className={styles.hourScore}>{s.score}</span>
              {s.topDomain && <span className={styles.hourDomain}>{s.topDomain}</span>}
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
  const streamSignals = sortedSignals.filter(
    (s) => !isFixedStar(s) && !isArabicLot(s),
  )

  return (
    <div className={styles.tierInner} data-screen-label={`1일 ${day.date}`}>
      <button className={styles.rise} onClick={onRise}>
        ↑ 이번 달로 줌아웃
      </button>

      <div className={styles.eyebrow}>
        1일 · DAILY · {day.date}
        {day.dateKo && <span style={{ marginLeft: 8 }}>{day.dateKo}</span>}
      </div>

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
            <div className="ss">일진 · 일간 기준 {String(day.iljinSibsin)}</div>
          </div>
        </div>
        <div className={styles.dayScore}>
          <ScoreDial score={day.score} label="종합" />
          <p className={styles.oneline}>{day.oneLine}</p>
        </div>
      </div>

      {/* theme bars + transits 50:50 (day.jsx 원본) */}
      <div className={styles.split}>
        <div className={`${styles.panel} ${styles.saju}`}>
          <div className={`${styles.eyebrow} ${styles.eyebrowEmber}`}>오늘 테마 점수</div>
          <ThemeBars items={day.themes} warm />
        </div>
        <div className={`${styles.panel} ${styles.astro}`}>
          <div className={styles.eyebrow}>점성 트랜짓 · 본명과의 각도</div>
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
          </div>

          {outerTransits.length > 0 && (
            <>
              <hr className={styles.hr} />
              <div className={`${styles.layerTag} ${styles.eyebrowViolet}`}>
                <span style={{ color: 'var(--dp-violet-2)' }}>✦</span> 외행성 트랜짓
              </div>
              <div className={styles.transitRow}>
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
            </>
          )}

          <hr className={styles.hr} />
          <div className={styles.layerTag} style={{ marginBottom: 8 }}>
            <span style={{ color: 'var(--dp-violet-2)' }}>✦</span> 일진 신살 활성
          </div>
          <div className={styles.shinsalRow}>
            {day.shinsalActive.map((s, i) => (
              <span className={styles.ssPill} key={i}>{s}</span>
            ))}
          </div>
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
              … 외 {day.totalSignals - streamSignals.length}개 (transit aspects · 시진별 십신 · 외행성)
            </div>
          )}
        </div>
      </div>

      {/* HourBreakdown 24h — footer 위 */}
      <HourBreakdown hours24={hours24} />

      <div className={styles.riseCenter}>
        <button
          className={`${styles.rise} ${styles.riseSmall}`}
          onClick={onRise}
        >
          ↑ 다시 위로 — 줌아웃
        </button>
      </div>
    </div>
  )
}

export default DayTier
