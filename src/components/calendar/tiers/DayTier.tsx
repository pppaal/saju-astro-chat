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
import { sibsinArea, sibsinAreaEn } from '@/lib/calendar-engine/derivers/plainLanguage'
import { deriveDayDomains } from '@/lib/calendar-engine/derivers/dayDomains'
import { reconcileDayTone, type DayVerdict } from '@/lib/calendar-engine/derivers/reconcile'
import styles from './DayTier.module.css'
import { TierSummary } from '@/components/calendar/atoms/TierSummary'
import summaryStyles from '@/components/calendar/atoms/TierSummary.module.css'
import { useI18n } from '@/i18n/I18nProvider'
import { CrossingList } from '@/components/calendar/atoms/CrossingList'
import { localizeLabel } from '@/components/calendar/adapters/localizeLabel'
import {
  geokgukStatusEn,
  shinsalEn,
  twelveStageEn,
} from '@/components/calendar/adapters/dayTierEnMaps'

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
  /** 분야별 연애 조언 성별 분기용 (남=재성, 여=관성이 배우자성). 기본 '남'. */
  sex?: string
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

// 점성 어스펙트 EN → KO (트랜짓 행 표시용).
const ASPECT_KO: Record<string, string> = {
  conjunction: '합',
  sextile: '육각',
  square: '사각',
  trine: '삼각',
  opposition: '대립',
}

// localizeLabel(+SIGN_KO/행성맵)은 MonthTier 와 공유 — adapters/localizeLabel 로 분리.

// 지장간 EN — 위계(정/중/여기)·오행 KO 칩이 EN 화면에 새지 않게.
const JJ_LAYER_EN: Record<string, string> = { 정기: 'primary', 중기: 'mid', 여기: 'residual' }
const JJ_ELEMENT_EN: Record<string, string> = {
  목: 'Wood',
  화: 'Fire',
  토: 'Earth',
  금: 'Metal',
  수: 'Water',
}

/**
 * 트랜짓 1행 렌더 — KO 는 행성/대상/어스펙트를 한글로, EN 은 영문 유지.
 * 어스펙트나 대상이 없는(디그니티 전용) 행은 건너뛴다 → null.
 */
function renderTransit(
  t: AstroSignal | DestinyDay['transits'][number],
  key: string,
  ko: boolean,
  outer: boolean
): React.ReactElement | null {
  const body = (t as { body?: string }).body ?? ''
  const aspect = (t as { aspect?: string }).aspect ?? ''
  const target = (t as { target?: string }).target ?? ''
  const glyph = (t as { glyph?: string }).glyph ?? '✦'
  // 어스펙트·대상 둘 다 있어야 본명 파트너가 있는 진짜 행 — 아니면 스킵.
  if (!aspect || !target) return null
  // target 은 "본명 Mars" 처럼 접두가 이미 붙어 옴 → 접두 떼고 행성만 KO 치환 후
  // 접두를 한 번만 다시 붙인다(예전엔 "본명 본명 Mars" 중복 + 영문 잔존).
  const rawTarget = target.replace(/^(본명|natal)\s+/i, '')
  // localizeLabel 의 풀 행성맵(카이런·릴리스·북교점 포함) 사용 — PLANET_KO 엔 일부 없음.
  const bodyTxt = localizeLabel(body, ko)
  const targetTxt = localizeLabel(rawTarget, ko)
  const aspectTxt = ko ? (ASPECT_KO[aspect] ?? aspect) : aspect
  const natalPrefix = ko ? '본명 ' : 'natal '
  return (
    <div className={`${styles.transit} ${outer ? styles.outer : ''}`.trim()} key={key}>
      <span className="g">{glyph}</span>
      <div className="tt">
        <div className="a">
          {bodyTxt} {aspectTxt}{' '}
          <span className="aTarget">
            → {natalPrefix}
            {targetTxt}
          </span>
        </div>
        {!ko && <div className="s">{ASPECT_EN[aspect] ?? aspect}</div>}
      </div>
      <PolChip v={t.polarity} />
    </div>
  )
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

function ScoreDial({ score, label }: { score: number; label?: string }) {
  const { locale } = useI18n()
  const ko = locale === 'ko'
  const dialLabel = label ?? (ko ? '오늘' : 'Today')
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
        <b>
          {score >= 60
            ? ko
              ? '순풍'
              : 'Tailwind'
            : score >= 35
              ? ko
                ? '평이'
                : 'Steady'
              : ko
                ? '역풍'
                : 'Headwind'}
        </b>
        <span>{dialLabel}</span>
      </div>
    </div>
  )
}

// ============================================================================
// Head 보강 — GeokgukStatusFrame chip.
// ============================================================================

function GeokgukStatusFrame({ status }: { status: DestinyDay['geokgukStatus'] | undefined }) {
  const { locale } = useI18n()
  const ko = locale === 'ko'
  if (!status) return null
  const klass =
    status.status === '성격'
      ? styles.kStatusOk
      : status.status === '파격'
        ? styles.kStatusBad
        : styles.kStatusMid
  const nameTxt = ko ? status.name : (status.nameEn ?? localizeLabel(status.name, false))
  const statusTxt = ko ? status.status : geokgukStatusEn(status.status)
  return (
    <span className={styles.statusChip}>
      <span className="kHan">{nameTxt}</span>
      <span className={`${styles.kStatus} ${klass}`}>{statusTxt}</span>
      {/* description 은 KO 산문이라 KO 로케일에서만 노출. */}
      {ko && <span style={{ color: 'var(--dp-ink-dim)' }}>{status.description}</span>}
    </span>
  )
}

// ============================================================================
// Head 보강 — GongmangBanner.
// ============================================================================

function GongmangBanner({ gongmang }: { gongmang: DestinyDay['gongmang'] | undefined }) {
  const { locale } = useI18n()
  const ko = locale === 'ko'
  if (!gongmang || gongmang.activeBranches.length === 0) return null
  return (
    <div className={styles.gongmangBanner}>
      <span className="gmHead">{ko ? '공망 · 空亡' : 'Void · 空亡'}</span>
      {gongmang.activeBranches.map((b, i) => (
        <span className="gmBranch" key={i}>
          {b}
        </span>
      ))}
      <span className="gmNote">
        {gongmang.note ??
          (ko
            ? `본명 일주 공망 [${gongmang.natalBranches.join(' · ')}] 활성`
            : `Natal day-pillar void [${gongmang.natalBranches.join(' · ')}] active`)}
      </span>
    </div>
  )
}

// ============================================================================
// Head 보강 — VocBanner (Void-of-Course).
// ============================================================================

function VocBanner({ voc }: { voc: DayVoc | undefined }) {
  const { locale } = useI18n()
  const ko = locale === 'ko'
  if (!voc?.active) return null
  return (
    <div className={styles.vocBanner}>
      <span className="vocLabel">{ko ? 'Moon VOC · 무경로' : 'Moon VOC · no path'}</span>
      {(voc.from || voc.to) && (
        <span className="vocTime">
          {voc.from ?? '—'} → {voc.to ?? '—'}
        </span>
      )}
      <span>
        {ko
          ? '새 일은 보류, 정리·결산에 적합.'
          : 'Hold new starts — good for wrapping up & settling.'}
      </span>
    </div>
  )
}

// ============================================================================
// Phase 3 — CrossActivationCard
//   day.crossActivations 그리드 — ◆ 사주 × ✦ 점성 → meaning.
// ============================================================================

function CrossActivationCard({ items }: { items: DestinyCrossActivation[] }) {
  const { locale } = useI18n()
  const ko = locale === 'ko'
  if (!items.length) return null
  return (
    <div className={styles.blockSm}>
      <div className={styles.secHead}>
        <h2 className={styles.secTitle}>
          {ko ? '사주·점성 동시 활성' : 'Saju × Astrology co-activation'}
        </h2>
        <span className={styles.tiny}>
          cross-activation · {items.length} {ko ? '페어' : 'pairs'}
        </span>
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
  const { locale } = useI18n()
  const ko = locale === 'ko'
  if (!items.length) return null
  return (
    <div className={styles.blockSm}>
      <div className={styles.secHead}>
        <h2 className={styles.secTitle}>{ko ? '응용 격국' : 'Applied structures'}</h2>
        <span className={styles.tiny}>
          applied pattern · {ko ? `${items.length}종 발동` : `${items.length} active`}
        </span>
      </div>
      <div className={styles.appliedRow}>
        {items.map((p) => {
          const tone = p.polarity > 0 ? styles.polPosBg : p.polarity < 0 ? styles.polNegBg : ''
          return (
            <div className={`${styles.appliedBadge} ${tone}`} key={p.id}>
              <span className={styles.appliedHan}>{p.name}</span>
              <div className={styles.appliedBody}>
                {/* korean·rule 은 KO 산문/내부코드라 KO 로케일에서만 노출. */}
                {ko && <span className={styles.appliedKo}>{p.korean}</span>}
                {ko && <span className={styles.tiny}>{p.rule}</span>}
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
  const { locale } = useI18n()
  const ko = locale === 'ko'
  if (!jijanggan) return null
  const layers: Array<{ key: string; layer: DestinyJijangganLayer; main: boolean }> = []
  layers.push({ key: 'jeonggi', layer: jijanggan.jeonggi, main: true })
  if (jijanggan.junggi) layers.push({ key: 'junggi', layer: jijanggan.junggi, main: false })
  if (jijanggan.yeogi) layers.push({ key: 'yeogi', layer: jijanggan.yeogi, main: false })
  return (
    <div className={styles.blockSm}>
      <div className={styles.secHead}>
        <h2 className={styles.secTitle}>
          {ko ? '본명 일주 지장간' : 'Natal day-pillar hidden stems'}
        </h2>
        <span className={styles.tiny}>
          {ko
            ? 'jijanggan · 3층 (정기 · 중기 · 여기)'
            : 'jijanggan · 3 layers (primary · mid · residual)'}
        </span>
      </div>
      <div className={styles.jijangganRow}>
        {layers.map(({ key, layer, main }) => (
          <div className={`${styles.jjChip} ${main ? styles.jjMain : ''}`} key={key}>
            <span className={styles.jjLayer}>
              {ko ? layer.layer : (JJ_LAYER_EN[layer.layer] ?? layer.layer)}
            </span>
            <span className={styles.jjStem}>{layer.stem}</span>
            <span className={styles.jjMeta}>
              <span className={styles.jjSibsin}>
                {ko ? String(layer.sibsin) : sibsinAreaEn(String(layer.sibsin))}
              </span>
              <span className={styles.jjEl}>
                {ko ? layer.element : (JJ_ELEMENT_EN[layer.element] ?? layer.element)}
              </span>
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
  const { locale } = useI18n()
  const ko = locale === 'ko'
  const cells = day.twelveStageMatrix ?? []
  if (cells.length === 0) return null
  const ilbranch = cells[0]?.branch ?? ''
  return (
    <div className={styles.blockSm}>
      <div className={styles.secHead}>
        <h2 className={styles.secTitle}>
          {ko ? '본명 4기둥 × 일진 12운성' : 'Natal four pillars × daily twelve stages'}
        </h2>
        <span className={styles.tiny}>
          {ko
            ? `twelve stages · 일진 지지 [${ilbranch}] 기준`
            : `twelve stages · vs daily branch [${ilbranch}]`}
        </span>
      </div>
      <div className={styles.tsMatrix}>
        {cells.map((c) => (
          <div className={styles.tsCell} key={c.pillar}>
            <span className={styles.tsPillar}>{c.pillar}</span>
            <span className={styles.tsStage}>{ko ? c.stage : twelveStageEn(c.stage)}</span>
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

// 붙박이별 칩 라벨 — KO 는 한글 별명(name_ko), EN 은 한글이 새지 않게
// english 문장에서 "<행성> conjunct the fixed star <별> — …" 의 핵심만 뽑아
// "<행성> ☌ <별>" 컴팩트 형으로. (예전엔 EN 도 name_ko 를 그대로 출력 → 별
// 이름·괄호 글로스가 전부 한글로 샜다.)
function fixedStarChipLabel(s: DestinySignal, ko: boolean): string {
  if (ko) return localizeLabel(s.label, true)
  const en = s.english ?? ''
  const m = en.match(/^(.+?)\s+conjunct the fixed star\s+(.+?)\s+—/)
  if (m) return `${m[1]} ☌ ${m[2]}`
  return localizeLabel(s.label, false)
}

function FixedStarRow({ signals }: { signals: DestinySignal[] }) {
  const { locale } = useI18n()
  const ko = locale === 'ko'
  const stars = signals.filter(isFixedStar)
  if (!stars.length) return null
  return (
    <div className={styles.blockSm}>
      <div className={styles.secHead}>
        <h2 className={styles.secTitle}>{ko ? '붙박이별 활성' : 'Fixed stars active'}</h2>
        <span className={styles.tiny}>
          fixed-star · {stars.length}
          {ko ? '개' : ''}
        </span>
      </div>
      <div className={styles.starRow}>
        {stars.map((s) => (
          <span className={`${styles.starChip} ${styles.fixed}`} key={s.id}>
            <span className={styles.starGlyph}>★</span>
            <span>{fixedStarChipLabel(s, ko)}</span>
            <PolChip v={s.polarity} />
          </span>
        ))}
      </div>
    </div>
  )
}

function ArabicLotRow({ signals }: { signals: DestinySignal[] }) {
  const { locale } = useI18n()
  const ko = locale === 'ko'
  const lots = signals.filter(isArabicLot)
  if (!lots.length) return null
  return (
    <div className={styles.blockSm}>
      <div className={styles.secHead}>
        <h2 className={styles.secTitle}>{ko ? '아라비아 부분 (Lot)' : 'Arabic Parts (Lots)'}</h2>
        <span className={styles.tiny}>
          arabic-part · {lots.length}
          {ko ? '개' : ''}
        </span>
      </div>
      <div className={styles.starRow}>
        {lots.map((s) => (
          <span className={`${styles.starChip} ${styles.lot}`} key={s.id}>
            <span className={styles.starGlyph}>◈</span>
            <span>{localizeLabel(s.label, ko)}</span>
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
  const { locale } = useI18n()
  const ko = locale === 'ko'
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
        <h2 className={styles.secTitle}>
          {ko ? '시진별 24시 흐름' : '24-hour rhythm by hour-pillar'}
        </h2>
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

// ============================================================================
// HourRhythm — 켜지는 시진의 길/주의 리듬 막대 (좋음=위·쪽빛 / 주의=아래·주황).
// ============================================================================
function HourRhythm({
  hours,
  ko,
  label,
}: {
  hours: NonNullable<DestinyDay['hourCrossings']>
  ko: boolean
  label: string
}) {
  const rows = [...hours].sort((a, b) => {
    const ah = parseInt((a.when.match(/\d+/) ?? ['0'])[0], 10)
    const bh = parseInt((b.when.match(/\d+/) ?? ['0'])[0], 10)
    return ah - bh
  })
  return (
    <div className={styles.rhythmWrap}>
      <div className={styles.rhythmLabel}>{label}</div>
      <div className={styles.rhythmRow}>
        {rows.map((h, i) => {
          const up = h.tone === 'good'
          const mag = Math.max(0.4, Math.min(1, h.strength / 2)) // 0.4~1
          const label = ko ? h.when : h.whenEn
          const time = label.replace(/\s*\(.*\)/, '').trim()
          return (
            <div className={styles.rhythmCol} key={i} title={label}>
              <div className={styles.rhythmTrack}>
                <span className={styles.rhythmMid} />
                <span
                  className={styles.rhythmBar}
                  style={{
                    height: `${mag * 50}%`,
                    [up ? 'bottom' : 'top']: '50%',
                    background: up ? '#4f5d96' : '#c0741f',
                  }}
                />
              </div>
              <span className={styles.rhythmTime}>{time}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function DayTier({ day, hours24, voc, onRise, sex = '남' }: DayTierProps) {
  const { locale } = useI18n()
  const ko = locale === 'ko'
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

  // ── 쉬운 요약 — 화해된 verdict 로 "오늘 어때" 한 줄 + 좋은것/조심 카드 ──
  // adapter(toDay)가 점수 밴드 ↔ 신호/사유 톤을 묶은 단일 권위 verdict 를 준다.
  // 옛 코드는 mid 밴드만 '기복 큰 날'로 보정했는데, 화해 단계가 모든 밴드로 일반화
  // — 좋은날인데 강한 흉신이 끼면(tense) 헤드라인을 정직하게, 조심날인데 살릴
  // 구석이 있으면(bright) 한 단계 올린다. 점수는 그대로(서술 톤만 화해).
  // adapter(toDay)가 항상 day.dayTone 을 채운다. fallback 은 타입 안전용 — reasonNet
  // 은 adapter 만 정확히 계산하므로 0(중립)으로 두고 밴드 톤을 그대로 따른다.
  const verdict: DayVerdict =
    day.dayTone ??
    reconcileDayTone({
      score: day.score,
      reasonNet: 0,
      hasGoodReason: (day.topReasons ?? []).length > 0,
      hasCautionReason: (day.cautions ?? []).length > 0,
    })
  const dayBand = verdict.band
  const goodButTense = verdict.band === 'good' && verdict.tense
  const midButTense = verdict.band === 'mid' && verdict.tense
  const lowButBright = verdict.band === 'low' && verdict.bright
  const dayHeadline =
    dayBand === 'good'
      ? goodButTense
        ? ko
          ? '대체로 순풍이지만 한 곳은 주의'
          : 'Mostly a tailwind — but one spot needs care'
        : ko
          ? '오늘은 순풍 — 흐름이 우호적인 날'
          : 'Tailwind today — the flow favors you'
      : dayBand === 'mid'
        ? midButTense
          ? ko
            ? '기복이 큰 날 — 좋고 나쁨이 갈려요'
            : 'A day of swings — highs and lows split'
          : ko
            ? '오늘은 무난한 흐름이에요'
            : 'A steady, easygoing day'
        : lowButBright
          ? ko
            ? '대체로 조심이지만 살릴 구석은 있어요'
            : 'Mostly careful — but one spot worth using'
          : ko
            ? '오늘은 조심하는 게 좋은 날'
            : 'A day to tread carefully'
  const daySub =
    dayBand === 'good'
      ? goodButTense
        ? ko
          ? '잘 풀리는 흐름은 살리되, 조심 신호가 있는 한 곳은 무리하지 마세요.'
          : 'Ride the flow that works, but don’t force the one spot flagged for care.'
        : ko
          ? '하고 싶던 일을 밀어붙이기 좋아요. 연락·제안·중요한 결정에 우호적인 날.'
          : 'Good day to push what you want forward — outreach, proposals, big calls.'
      : dayBand === 'mid'
        ? midButTense
          ? ko
            ? '큰 결정·충돌·이동은 한 박자 늦추고, 잘 풀리는 분야 위주로 가세요.'
            : 'Postpone big calls, clashes and travel; lean on the areas that flow.'
          : ko
            ? '큰일을 새로 벌이기보다 정리·마무리에 좋은 날. 무리만 안 하면 무난해요.'
            : 'Better for wrapping up than starting big. Fine as long as you don’t overreach.'
        : lowButBright
          ? ko
            ? '전반적으로 무리는 피하되, 잘 맞는 한 곳은 활용해도 좋아요.'
            : 'Avoid overreaching overall, but the one spot that fits is worth using.'
          : ko
            ? '새 일을 벌이기보다 점검·휴식에 좋은 날. 중요한 결정은 가능하면 미루세요.'
            : 'Better for review and rest than new ventures. Postpone big decisions if you can.'
  const cleanReason = (s: string) => {
    const c = s
      .replace(/^[↑↓·\s]+/, '')
      .replace(/^\[[^\]]*\]\s*/, '')
      .replace(/^(이달|오늘)\s·\s/, '')
      .replace(/^(month|day|year|decade|hour|peak)\s·\s/i, '')
      .split('—')[0] // "A — B(설명)" 이면 핵심 A 만
      .trim()
    return c.length > 48 ? c.slice(0, 47).trim() + '…' : c
  }
  const dayGood = (day.topReasons ?? []).map(cleanReason).filter(Boolean)[0]
  const dayCaution = (day.cautions ?? []).map(cleanReason).filter(Boolean)[0]
  const dayCards = [
    dayGood ? { icon: '💚', label: ko ? '좋은 것' : 'Good', body: dayGood } : null,
    dayCaution ? { icon: '⚠️', label: ko ? '조심할 것' : 'Watch', body: dayCaution } : null,
  ].filter((c): c is { icon: string; label: string; body: string } => c !== null)

  // ── 시간별 사주 × 점성 교차 — 켜지는 시진(십신) × 그 시각 상승궁. ──
  // 메인엔 가장 센 시진 3개만(사전 매칭된 진짜 교차 우선), 나머진 '자세히 보기'.
  // matched(의미사전 매칭)일 때만 제목에 '× 상승'을 올려 교차로 표기, 아니면
  // 상승궁은 detail 로 내려 같은 시각의 하늘 정보로만 — 교차 과장 금지.
  const toHourItem = (h: NonNullable<DestinyDay['hourCrossings']>[number]) => {
    const label = ko ? h.when : h.whenEn
    const branch = label.match(/\((.*?)\)/)?.[1] ?? ''
    const timeShort = label.replace(/\s*\(.*\)/, '').trim()
    const tone = h.tone === 'good' ? (ko ? '길' : 'good') : ko ? '주의' : 'caution'
    const sib = ko ? `${sibsinArea(h.sibsin)}(${h.sibsin})` : sibsinAreaEn(h.sibsin)
    const rise = ko ? '상승' : 'rising'
    const sign = ko ? h.risingSignKo : h.risingSignEn
    const ruler = ko ? h.ruler : h.rulerEn
    const narr = ko ? h.narrative : h.narrativeEn
    const meaning = ko ? h.crossMeaning : h.crossMeaningEn
    const skyLine = sign
      ? ko
        ? `이 시각 하늘: ${sign} 상승${ruler ? ` (지배성 ${ruler})` : ''}`
        : `Sky now: ${sign} rising${ruler ? ` (ruler ${ruler})` : ''}`
      : ''
    return h.matched
      ? {
          when: timeShort,
          title: `${branch ? `${branch} · ` : ''}${sib} ${tone} × ${sign} ${rise}`,
          detail: [meaning, narr].filter(Boolean).join(' · '),
        }
      : {
          when: timeShort,
          title: `${branch ? `${branch} · ` : ''}${sib} ${tone}`,
          detail: [narr, skyLine].filter(Boolean).join(' · '),
        }
  }
  const hourAll = day.hourCrossings ?? []
  const hourTop = [...hourAll]
    .sort((a, b) => Number(b.matched) - Number(a.matched) || b.strength - a.strength)
    .slice(0, 3)
  const hourTopKeys = new Set(hourTop.map((h) => h.when))
  const hourCrossItems = hourAll.filter((h) => hourTopKeys.has(h.when)).map(toHourItem)
  const hourRestItems = hourAll.filter((h) => !hourTopKeys.has(h.when)).map(toHourItem)
  // 실제 매칭된 교차가 하나도 없으면 heading 도 '×' 주장을 하지 않는다.
  const hourHeading = hourTop.some((h) => h.matched)
    ? ko
      ? '오늘 가장 센 시간 · 사주 × 점성 교차'
      : 'Strongest hours · Saju × Astrology'
    : ko
      ? '오늘 가장 센 시간'
      : 'Strongest hours'

  // 분야별 오늘 조언 — 그날 일진 십신 → 6분야 (성별·점수 반영). evidence 로 그날
  // 실제 신호(트랜짓·신살·교차·달)를 넘겨 분야별 근거까지 붙인다 (1인 1결과).
  const dayDomains = deriveDayDomains({
    iljinSibsin: String(day.iljinSibsin),
    sex,
    scoreBand: dayBand,
    ko,
    evidence: {
      transits: day.transits.map((t) => ({
        body: (t as { body?: string }).body,
        aspect: (t as { aspect?: string }).aspect,
        polarity: t.polarity,
      })),
      shinsal: day.shinsalActive ?? [],
      crossActivations: (day.crossActivations ?? []).map((c) => ({
        sajuSide: c.sajuSide,
        astroSide: c.astroSide,
        // 라우팅은 raw KO 로 — EN 로케일에서도 분야 분류가 동일하게(톤 역전 방지).
        route: `${c.sajuKo ?? c.sajuSide} ${c.astroKo ?? c.astroSide}`,
        meaning: c.meaning,
        polarity: c.polarity,
      })),
      moon: (day.hourMoon ?? []).map((m) => ({
        body: m.body,
        aspectKo: m.aspectKo,
        aspectEn: m.aspectEn,
        when: m.when,
        whenEn: m.whenEn,
        polarity: m.polarity,
      })),
    },
  })

  return (
    <div className={styles.tierInner} data-screen-label={`1일 ${day.date}`}>
      <button className={styles.rise} onClick={onRise}>
        ↑ {ko ? '이번 달로 줌아웃' : 'Zoom out to month'}
      </button>

      <div className={styles.eyebrow}>
        {ko ? '1일' : '1 DAY'} · DAILY · {day.date}
        {ko && day.dateKo && <span style={{ marginLeft: 8 }}>{day.dateKo}</span>}
      </div>

      {/* ── 쉬운 요약 (오늘 어때 한눈에). 일진·12운성·신호는 아래 자세히로. ── */}
      <TierSummary headline={dayHeadline} sub={daySub} cards={dayCards} />

      {/* ── 분야별 오늘 조언 — 연애·돈·직업·관계·공부·건강 (그날 십신 기반). ── */}
      {dayDomains && (
        <div className={styles.domainBlock}>
          <div className={styles.secHead}>
            <h2 className={styles.secTitle}>{ko ? '분야별 오늘 조언' : 'Today by area'}</h2>
            <span className={styles.tiny}>{ko ? dayDomains.bandNote : dayDomains.bandNoteEn}</span>
          </div>
          <div className={styles.domainGrid}>
            {dayDomains.domains.map((d) => (
              <div
                className={`${styles.domainRow} ${d.active ? styles.domainActive : ''}`}
                key={d.key}
              >
                <span className={styles.domainIcon}>{d.icon}</span>
                <div className={styles.domainText}>
                  <span className={styles.domainLabel}>
                    {ko ? d.label : d.labelEn}
                    {d.active && (
                      <span className={styles.domainOn}>{ko ? '오늘 주목' : 'in focus'}</span>
                    )}
                  </span>
                  <span className={styles.domainBody}>{ko ? d.body : d.bodyEn}</span>
                  {d.evidence.length > 0 && (
                    <span className={styles.domainEvidence}>
                      <span className={styles.domainEvLabel}>{ko ? '근거' : 'Why'}</span>
                      {d.evidence.map((e, i) => {
                        const tone =
                          e.polarity > 0
                            ? styles.evPos
                            : e.polarity < 0
                              ? styles.evNeg
                              : styles.evNeu
                        const mark =
                          e.kind === 'astro'
                            ? e.polarity < 0
                              ? '△'
                              : '✦'
                            : e.kind === 'cross'
                              ? '⇄'
                              : e.kind === 'moon'
                                ? '🌙'
                                : '◆'
                        return (
                          <span className={`${styles.evChip} ${tone}`} key={`${e.text}-${i}`}>
                            <span className={styles.evMark}>{mark}</span>
                            {e.text}
                          </span>
                        )
                      })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 시간별 사주 × 점성 교차 — 가장 센 시진 3개만 메인에. ── */}
      {hourCrossItems.length > 0 && <CrossingList heading={hourHeading} items={hourCrossItems} />}

      {hourAll.length > 0 && (
        <HourRhythm hours={hourAll} ko={ko} label={ko ? '하루 시간 리듬' : 'The day’s rhythm'} />
      )}

      {/* ── 시(時)별 달 정밀 — 12 시진 달 재계산으로 뽑은 달×본명 절정 시각. ── */}
      {(day.hourMoon ?? []).length > 0 && (
        <div className={styles.moonBlock}>
          <div className={styles.secHead}>
            <h2 className={styles.secTitle}>{ko ? '시(時)별 달 흐름' : 'Moon by hour'}</h2>
            <span className={styles.tiny}>
              {ko ? '달 시각별 정밀 재계산 · 절정 시각' : 'Moon recomputed per hour · peak times'}
            </span>
          </div>
          <div className={styles.moonList}>
            {(day.hourMoon ?? []).map((m, i) => {
              const tone = m.tone === 'good' ? styles.moonGood : styles.moonCaution
              return (
                <div className={`${styles.moonRow} ${tone}`} key={`${m.hour}-${i}`}>
                  <div className={styles.moonHead}>
                    <span className={styles.moonWhen}>{ko ? m.when : m.whenEn}</span>
                    <span className={styles.moonBody}>
                      {ko
                        ? `달 ${m.aspectKo} → ${m.natalPointKo} · ${m.moonSignKo}`
                        : `Moon ${m.aspectEn} → ${m.natalPointEn} · ${m.moonSignEn}`}
                    </span>
                    <span className={styles.moonTone}>
                      {m.tone === 'good' ? (ko ? '좋은 시각' : 'good') : ko ? '주의 시각' : 'watch'}
                    </span>
                  </div>
                  <span className={styles.moonMeaning}>{ko ? m.meaning : m.meaningEn}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── 전문가용 상세 — 일진·격국·공망·신호·12운성·시진 일체 접어 둠 ── */}
      <details className={summaryStyles.details}>
        <summary className={summaryStyles.detailsSummary}>
          {ko ? '자세히 보기 · 일진과 근거' : 'Details · day pillar & evidence'}
        </summary>

        {/* 나머지 시진 전체 — 메인엔 안 띄운 시간들. */}
        {hourRestItems.length > 0 && (
          <CrossingList heading={ko ? '그 밖의 시간대' : 'Other hours'} items={hourRestItems} />
        )}

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
              <div className="ss">
                {ko ? (
                  <>
                    {'일진 · 일간 기준'} {String(day.iljinSibsin)}
                    {sibsinArea(String(day.iljinSibsin)) !== String(day.iljinSibsin)
                      ? ` (${sibsinArea(String(day.iljinSibsin))})`
                      : ''}
                  </>
                ) : (
                  `daily pillar · vs day master ${sibsinAreaEn(String(day.iljinSibsin))}`
                )}
              </div>
            </div>
          </div>
          <div className={styles.dayScore}>
            <ScoreDial score={day.score} label={ko ? '종합' : 'Overall'} />
            <p className={styles.oneline}>{localizeLabel(day.oneLine, ko)}</p>
          </div>
        </div>

        {/* 이렇게 읽은 이유 (흐름·교차 신호) — 풀폭 */}
        <div>
          <div className={`${styles.panel} ${styles.astro}`}>
            {/* 합치기: 날것 트랜짓 덤프 → "이렇게 읽은 이유"(사람 말). 엔진이 만든
              topReasons/cautions 를 우선 노출하고, 원자료(점성 트랜짓)는 접어둔다.
              (premium DayWhyCard 패턴 + destinypal 만세력 스킨) */}
            <div className={styles.eyebrow}>
              {ko ? '왜 이런 하루? · 근거' : 'Why this day? · evidence'}
            </div>
            {(day.topReasons ?? []).length === 0 && (day.cautions ?? []).length === 0 ? (
              <p className={styles.whyMuted}>
                {ko
                  ? '오늘은 두드러진 신호 없이 무난한 흐름이에요.'
                  : 'A steady day with no standout signals.'}
              </p>
            ) : (
              <ul className={styles.whyList}>
                {(day.topReasons ?? []).map((r, i) => (
                  <li className={styles.whyPos} key={`wp-${i}`}>
                    <span className={styles.whyArrow}>↑</span>{' '}
                    {localizeLabel(r.replace(/^[↑↓·]\s*/, ''), ko)}
                  </li>
                ))}
                {(day.cautions ?? []).map((c, i) => (
                  <li className={styles.whyNeg} key={`wn-${i}`}>
                    <span className={styles.whyArrow}>↓</span>{' '}
                    {localizeLabel(c.replace(/^[↑↓·]\s*/, ''), ko)}
                  </li>
                ))}
              </ul>
            )}

            {day.shinsalActive.length > 0 && (
              <div className={styles.shinsalRow}>
                {day.shinsalActive.map((s, i) => (
                  <span className={styles.ssPill} key={i}>
                    {ko ? s : shinsalEn(s)}
                  </span>
                ))}
              </div>
            )}

            {/* 근거 신호 (점성 트랜짓 원자료) — 기본 접힘. 원하는 사람만 펼침. */}
            <details className={styles.evidence}>
              <summary className={styles.evidenceSummary}>
                {ko ? '근거 신호 보기 · 점성 트랜짓' : 'View evidence signals · astro transits'}
              </summary>
              <div className={styles.transitRow}>
                {innerTransits.map((t, i) => renderTransit(t, `it-${i}`, ko, false))}
                {outerTransits.map((t, i) => renderTransit(t, `ot-${i}`, ko, true))}
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
            <h2 className={styles.secTitle}>{ko ? '오늘의 신호' : "Today's signals"}</h2>
            <span className={styles.tiny}>
              {ko
                ? `총 ${day.totalSignals}개 중 핵심 발췌 · polarity −3 ~ +3`
                : `Top picks of ${day.totalSignals} · polarity −3 to +3`}
            </span>
          </div>
          <div className={styles.signalStream}>
            {streamSignals.map((s) => (
              <div className={styles.sig} key={s.id}>
                <span className={`${styles.cat ?? ''} cat ${catTone(s.cat)}`}>
                  {catLabel(s.cat)}
                </span>
                <div className="body">
                  {/* EN: 엔진이 방출한 s.english 우선, 없으면 localizeLabel(false). 사주
                      다수 신호(시진·충·통근·암합·일주 문구)는 EN 없어 KO 유지 — 엔진 한계. */}
                  <span className="lb">
                    {ko
                      ? localizeLabel(s.label, true)
                      : (s.english ?? localizeLabel(s.label, false))}
                  </span>
                  {s.romaji && <span className="rm"> · {s.romaji}</span>}
                </div>
                <PolChip v={s.polarity} />
              </div>
            ))}
            {day.totalSignals > streamSignals.length && (
              <div className={styles.sigMore}>
                {ko
                  ? `… 외 ${day.totalSignals - streamSignals.length}개 (transit aspects · 시진별 십신 · 외행성)`
                  : `… +${day.totalSignals - streamSignals.length} more (transit aspects · hourly ten gods · outer planets)`}
              </div>
            )}
          </div>
        </div>

        {/* HourBreakdown 24h — 시각별 점수가 실제로 있을 때만(없으면 24칸 전부 '·'
            로 떠서 무의미하므로 숨김). */}
        {(hours24?.length ?? 0) > 0 && <HourBreakdown hours24={hours24} />}
      </details>

      <div className={styles.riseCenter}>
        <button className={`${styles.rise} ${styles.riseSmall}`} onClick={onRise}>
          ↑ {ko ? '다시 위로 — 줌아웃' : 'Zoom back out'}
        </button>
      </div>
    </div>
  )
}

export default DayTier
