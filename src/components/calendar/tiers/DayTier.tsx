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
import type { DestinyDay, Polarity } from '@/types/calendar'
import {
  sibsinArea,
  sibsinAreaEn,
  planetPlain,
  plainReason,
} from '@/lib/calendar-engine/derivers/plainLanguage'
import { deriveDayDomains } from '@/lib/calendar-engine/derivers/dayDomains'
import { reconcileDayTone, type DayVerdict } from '@/lib/calendar-engine/derivers/reconcile'
import styles from './DayTier.module.css'
import { useI18n } from '@/i18n/I18nProvider'
import { CrossingList } from '@/components/calendar/atoms/CrossingList'
import { localizeLabel } from '@/components/calendar/adapters/localizeLabel'
import { shinsalEn } from '@/components/calendar/adapters/dayTierEnMaps'
import { ShareDayButton } from '@/components/calendar/share/ShareDayButton'
import type { DayShareData } from '@/components/calendar/share/DayShareCard'

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

// 점성 어스펙트 EN → KO (EvidenceDetails 트랜짓 행 표시용).
const ASPECT_KO: Record<string, string> = {
  conjunction: '합',
  sextile: '육각',
  square: '사각',
  trine: '삼각',
  opposition: '대립',
}

// localizeLabel(+SIGN_KO/행성맵)은 MonthTier 와 공유 — adapters/localizeLabel 로 분리.

// ============================================================================
// Polarity chip (util.jsx Polarity 포팅).
// ============================================================================

function PolChip({ v }: { v: Polarity | number }) {
  const cls = v > 0 ? styles.polPos : v < 0 ? styles.polNeg : styles.polNeu
  const txt = v > 0 ? `+${v}` : v < 0 ? String(v) : '0'
  return <span className={`${styles.pol} ${cls}`}>{txt}</span>
}

// ============================================================================
// ToneDial — 단일 verdict 톤만 반영하는 다이얼. (옇 ScoreDial: raw 점수 60/35로
// 색·글자를 *따로* 계산해 헤드라인/톤과 어긋났다. 점수 숫자는 노출하지 않으며,
// 호(arc)는 톤별 고정 비율의 장식일 뿐 — 점수 누출 없음. 단일 출처 = verdict.tone.)
// ============================================================================

function ToneDial({ tone, label }: { tone: DayVerdict['tone']; label?: string }) {
  const { locale } = useI18n()
  const ko = locale === 'ko'
  const dialLabel = label ?? (ko ? '오늘' : 'Today')
  const frac = tone === 'positive' ? 1 : tone === 'mixed' ? 0.55 : 0.3
  const col =
    tone === 'positive'
      ? 'var(--dp-pos)'
      : tone === 'caution'
        ? 'var(--dp-neg)'
        : 'var(--dp-tone-mixed)'
  const word = ko
    ? tone === 'positive'
      ? '순풍'
      : tone === 'caution'
        ? '역풍'
        : '평이'
    : tone === 'positive'
      ? 'Tailwind'
      : tone === 'caution'
        ? 'Headwind'
        : 'Steady'
  // 반원 게이지 — 시안과 동일. 점수 숫자 비노출(톤 단어만), 호는 톤별 고정 비율.
  const W = 150,
    H = 88,
    cx = 75,
    cy = 78,
    R = 58
  const pt = (a: number) => `${cx + R * Math.cos(a)},${cy - R * Math.sin(a)}`
  const arc = (s: number, e: number, c2: string, w: number) => (
    <path
      d={`M ${pt(s)} A ${R} ${R} 0 0 1 ${pt(e)}`}
      fill="none"
      stroke={c2}
      strokeWidth={w}
      strokeLinecap="round"
    />
  )
  return (
    <div className={styles.scoreDial}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {arc(Math.PI, 0, 'rgba(58,46,28,0.12)', 8)}
        {arc(Math.PI, Math.PI * (1 - frac), col, 8)}
        <text
          x={cx}
          y={cy - 16}
          textAnchor="middle"
          style={{ font: '700 30px var(--dp-serif-ko)', fill: 'var(--dp-ink)' }}
        >
          {word}
        </text>
        <text
          x={cx}
          y={cy + 2}
          textAnchor="middle"
          style={{ font: '11px var(--dp-sans)', fill: 'var(--dp-ink-mute)' }}
        >
          {dialLabel}
        </text>
      </svg>
    </div>
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
            ? `타고난 [${gongmang.natalBranches.join(' · ')}] 자리가 비는 날 — 힘이 덜 실려요`
            : `Your natal [${gongmang.natalBranches.join(' · ')}] runs hollow today — less force behind things`)}
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
      <span className="vocLabel">{ko ? '달의 빈 시간' : 'Quiet Moon window'}</span>
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

// ============================================================================
// CrossActivationCard — 사주 × 별자리 교차. 우리 핵심 신호인데 직전엔 분야 근거로만
// 쓰고 화면엔 안 보였다. 양쪽(십신·행성)을 *쉬운말*로 풀어 카드로 노출.
// 사주측 朱(ember) · 별측 藍(accent) 색으로 구분, polarity 로 ⇄ 색(길/주의).
// ============================================================================
function CrossActivationCard({
  items,
  ko,
}: {
  items: DestinyDay['crossActivations']
  ko: boolean
}) {
  // |polarity| 큰 순으로 최대 4개 — 카드가 길어지지 않게.
  const rows = [...items].sort((a, b) => Math.abs(b.polarity) - Math.abs(a.polarity)).slice(0, 4)
  if (rows.length === 0) return null
  return (
    <div
      style={{
        marginTop: 14,
        padding: 15,
        border: '1.5px solid var(--dp-accent)',
        borderRadius: 10,
        background: 'var(--dp-panel)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--dp-mono)',
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.04em',
          color: 'var(--dp-accent)',
          marginBottom: 3,
        }}
      >
        {ko ? '사주 × 별자리 교차' : 'Saju × Astrology'}
      </div>
      <div style={{ fontSize: 11, color: 'var(--dp-ink-mute)', marginBottom: 6 }}>
        {ko ? '둘 다 가리키는 신호만' : 'only where both point the same way'}
      </div>
      {rows.map((c, i) => {
        const sajuPlain = ko
          ? sibsinArea(c.sajuKo ?? c.sajuSide)
          : sibsinAreaEn(c.sajuKo ?? c.sajuSide)
        const astroPlain = planetPlain(c.astroKo ?? c.astroSide, ko)
        const good = c.polarity >= 0
        const arrowCol = good ? 'var(--dp-pos)' : 'var(--dp-ember)'
        return (
          <div
            key={c.id ?? i}
            style={{ borderTop: '1px solid var(--dp-line)', paddingTop: 10, marginTop: 10 }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 5,
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  color: 'var(--dp-ember-2)',
                  background: 'rgba(176,58,34,0.09)',
                  borderRadius: 5,
                  padding: '3px 9px',
                }}
              >
                {sajuPlain}
              </span>
              <span style={{ color: arrowCol, fontWeight: 700 }}>⇄</span>
              <span
                style={{
                  fontSize: 13,
                  color: 'var(--dp-accent)',
                  background: 'rgba(52,64,111,0.09)',
                  borderRadius: 5,
                  padding: '3px 9px',
                }}
              >
                {astroPlain}
              </span>
            </div>
            {c.meaning && (
              <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--dp-ink-dim)' }}>
                {c.meaning}
              </div>
            )}
          </div>
        )
      })}
      <div style={{ fontSize: 11, color: 'var(--dp-ink-faint)', marginTop: 11 }}>
        {ko ? '내 사주와 그날 별이 실제로 겹칠 때만 떠요' : 'shown only when both actually overlap'}
      </div>
    </div>
  )
}

// ============================================================================
// MonthFlow — 이달 흐름 속 오늘. day.monthScores(이달 일별 점수)를 먹선 추이로,
// 오늘을 朱 점으로 표시. "지금 이달 어디쯤" 캘린더 맥락.
// ============================================================================
function MonthFlow({
  scores,
  ko,
}: {
  scores: NonNullable<DestinyDay['monthScores']>
  ko: boolean
}) {
  if (!scores || scores.length < 3) return null
  const W = 320,
    H = 60,
    pad = 6
  const n = scores.length
  const X = (i: number) => pad + (i / (n - 1)) * (W - 2 * pad)
  const Y = (v: number) => H - 8 - (Math.max(0, Math.min(100, v)) / 100) * (H - 18)
  let d = `M ${X(0)} ${Y(scores[0].score)}`
  for (let i = 1; i < n; i++) {
    const xc = (X(i - 1) + X(i)) / 2
    d += ` C ${xc} ${Y(scores[i - 1].score)} ${xc} ${Y(scores[i].score)} ${X(i)} ${Y(scores[i].score)}`
  }
  const area = `${d} L ${X(n - 1)} ${H - 6} L ${X(0)} ${H - 6} Z`
  const ti = scores.findIndex((s) => s.today)
  return (
    <div className={styles.flowWrap}>
      <div className={styles.flowHead}>
        <span>{ko ? '이달 흐름 속 오늘' : 'Today within the month'}</span>
        <span className={styles.flowSub}>
          {ko
            ? `${scores.length}일 중 ${ti >= 0 ? ti + 1 : '?'}일째`
            : `day ${ti >= 0 ? ti + 1 : '?'}`}
        </span>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        <path d={area} fill="rgba(47,125,91,0.16)" />
        <path d={d} fill="none" stroke="var(--dp-pos)" strokeWidth={2} />
        {ti >= 0 && (
          <>
            <circle cx={X(ti)} cy={Y(scores[ti].score)} r={4.5} fill="var(--dp-ember)" />
            <text
              x={X(ti)}
              y={Y(scores[ti].score) - 7}
              textAnchor="middle"
              style={{ font: '600 9px var(--dp-sans)', fill: 'var(--dp-ember)' }}
            >
              {ko ? '오늘' : 'today'}
            </text>
          </>
        )}
      </svg>
    </div>
  )
}

// ============================================================================
// UpcomingRow — 다가오는 며칠. day.upcoming 점수를 색 칸으로(좋음/주의/피하기).
// ============================================================================
function UpcomingRow({ days, ko }: { days: NonNullable<DestinyDay['upcoming']>; ko: boolean }) {
  if (!days || days.length === 0) return null
  const bg = (s: number) =>
    s >= 65
      ? 'rgba(47,125,91,0.28)'
      : s <= 35
        ? 'rgba(176,58,34,0.26)'
        : s >= 50
          ? 'rgba(47,125,91,0.12)'
          : 'rgba(179,135,58,0.22)'
  const weekday = (iso: string) => {
    const wd = new Date(`${iso}T00:00:00Z`).getUTCDay()
    return (
      ko ? ['일', '월', '화', '수', '목', '금', '토'] : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
    )[wd]
  }
  return (
    <div className={styles.flowWrap}>
      <div className={styles.flowHead}>
        <span>{ko ? '다가오는 며칠' : 'Next few days'}</span>
      </div>
      <div className={styles.upRow}>
        {days.map((d) => (
          <div key={d.date} className={styles.upCell}>
            <div className={styles.upBox} style={{ background: bg(d.score) }}>
              {Number(d.date.slice(8, 10))}
            </div>
            <span className={styles.upWd}>{weekday(d.date)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// EvidenceDetails — 근거 "자세히" 전문 펼침. 평소엔 쉬운 한 줄(왜 이런 하루),
// 펼치면 실제 신호 데이터: 출처(사주 십신/점성 트랜짓/교차) · 라벨 · 점성은
// aspect→본명점 · 극성(±)·강도(강/중/약). 지어내지 않고 allSignals 그대로.
// ============================================================================
function EvidenceDetails({ day, ko }: { day: DestinyDay; ko: boolean }) {
  const rows = [...day.allSignals]
    .filter((s) => s.polarity !== 0)
    .sort((a, b) => Math.abs(b.polarity * b.weight) - Math.abs(a.polarity * a.weight))
    .slice(0, 12)
  if (rows.length === 0) return null
  const strength = (w: number) =>
    w >= 0.66 ? (ko ? '강' : 'strong') : w >= 0.33 ? (ko ? '중' : 'med') : ko ? '약' : 'weak'
  const srcTag = (s: (typeof rows)[number]) =>
    s.kind === 'cross-activation'
      ? ko
        ? '교차'
        : 'cross'
      : s.source === 'astro'
        ? ko
          ? '점성'
          : 'astro'
        : ko
          ? '사주'
          : 'saju'
  return (
    <details className={styles.evidence}>
      <summary className={styles.evidenceSummary}>
        {ko ? '근거 자세히 · 신호와 강도' : 'Details · signals & strength'}
      </summary>
      <div className={styles.evList}>
        {rows.map((s, i) => {
          const astro = s.source === 'astro' && (s as { aspect?: string }).aspect
          const aspect = (s as { aspect?: string }).aspect ?? ''
          const target = (s as { target?: string }).target ?? ''
          const rawTarget = target.replace(/^(본명|natal)\s+/i, '')
          return (
            <div className={styles.evRow} key={s.id ?? i}>
              <span className={styles.evSrc}>{srcTag(s)}</span>
              <span className={styles.evLabel}>
                {localizeLabel(s.label, ko)}
                {astro && aspect && target && (
                  <span className={styles.evAspect}>
                    {' '}
                    · {ko ? (ASPECT_KO[aspect] ?? aspect) : aspect} → {ko ? '본명 ' : 'natal '}
                    {localizeLabel(rawTarget, ko)}
                  </span>
                )}
              </span>
              <span className={styles.evStrength}>{strength(s.weight)}</span>
              <PolChip v={s.polarity} />
            </div>
          )
        })}
      </div>
    </details>
  )
}

export function DayTier({ day, voc, onRise, sex = '남' }: DayTierProps) {
  const { locale } = useI18n()
  const ko = locale === 'ko'
  // 점성 트랜짓 원자료는 이제 EvidenceDetails(전 신호 통합 펼침)에서 보여준다 —
  // 별도 inner/outer 분리 렌더는 제거.

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

  // ── 공유 카드 데이터 — 이미 로케일 반영된 hero 값들로 구성(1080×1080 PNG). ──
  // 헤더의 십신 라벨과 동일 규칙: 분야 별칭이 십신명과 다르면 괄호로 덧붙인다.
  const shareSibsinRaw = String(day.iljinSibsin)
  const shareSibsinArea = sibsinArea(shareSibsinRaw)
  const shareSibsinLabel = ko
    ? `${shareSibsinRaw}${shareSibsinArea !== shareSibsinRaw ? ` (${shareSibsinArea})` : ''}`
    : sibsinAreaEn(shareSibsinRaw)
  const shareToneWord = ko
    ? verdict.tone === 'positive'
      ? '순풍'
      : verdict.tone === 'caution'
        ? '역풍'
        : '평이'
    : verdict.tone === 'positive'
      ? 'Tailwind'
      : verdict.tone === 'caution'
        ? 'Headwind'
        : 'Steady'
  const shareData: DayShareData = {
    isKo: ko,
    dateLabel: ko ? day.dateKo || day.date : day.date,
    iljinHanja: day.iljin.hanja,
    iljinKr: day.iljin.kr,
    sibsinLabel: shareSibsinLabel,
    toneWord: shareToneWord,
    tone: verdict.tone,
    oneLine: localizeLabel(day.oneLine, ko),
    goods: (day.topReasons ?? []).slice(0, 3).map((r) => localizeLabel(plainReason(r, ko), ko)),
    cautions: (day.cautions ?? []).slice(0, 3).map((c) => localizeLabel(plainReason(c, ko), ko)),
  }

  return (
    <div className={styles.tierInner} data-screen-label={`1일 ${day.date}`}>
      <button className={styles.rise} onClick={onRise}>
        ↑ {ko ? '이번 달로 줌아웃' : 'Zoom out to month'}
      </button>

      <div className={styles.eyebrow}>
        {ko ? '1일' : '1 DAY'} · DAILY · {day.date}
        {ko && day.dateKo && <span style={{ marginLeft: 8 }}>{day.dateKo}</span>}
      </div>

      {/* ── 핵심 hero: 단일 중앙 컬럼 — 톤 게이지 → 일진 인장 → 한 줄 결론.
          (heroSub 는 총평과 중복이라 제거. 결론=oneLine, 풀이=총평, 행동=칩.) ── */}
      <div className={styles.dayHead}>
        {/* 점수 숫자 비노출 — 다이얼은 헤드라인·칩과 같은 단일 verdict 톤만 보여준다. */}
        <ToneDial tone={verdict.tone} label={ko ? '오늘' : 'Today'} />
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
        <p className={styles.oneline}>{localizeLabel(day.oneLine, ko)}</p>
      </div>

      {/* ── 그날 총평 (deriveDaySummary) — 한 문단. ── */}
      {day.totalSummary && <p className={styles.totalSummary}>{day.totalSummary}</p>}

      {/* ── 이렇게 / 조심 — 톤 기반 행동 한 줄(시안). ── */}
      <div className={styles.doRow}>
        <span className={styles.doChip}>
          {ko ? '이렇게 · ' : 'DO · '}
          {dayBand === 'low'
            ? ko
              ? '정리·점검부터'
              : 'start with review & tidying'
            : ko
              ? '잘 풀리는 일 밀어붙이기'
              : 'push what works'}
        </span>
        <span className={styles.dontChip}>
          {ko ? '조심 · ' : 'CAUTION · '}
          {dayBand === 'good'
            ? ko
              ? '과욕 부리지 않기'
              : "don't overreach"
            : ko
              ? '크게 벌이지 않기'
              : "don't start big"}
        </span>
      </div>

      {/* 본명 상태 — 격국 성패는 *정적 본명 분석*(타이밍 아님)이라 일 화면에서 제외
          (전문 상세는 "근거 자세히"에서 신호로 확인). 공망/VOC 는 그날 활성이라 유지. */}
      <GongmangBanner gongmang={day.gongmang} />
      <VocBanner voc={voc} />

      {/* ── 타이밍 맥락 — 이달 흐름 속 오늘 + 다가오는 며칠 (캘린더 정체성) ── */}
      {day.monthScores && <MonthFlow scores={day.monthScores} ko={ko} />}
      {day.upcoming && <UpcomingRow days={day.upcoming} ko={ko} />}

      {/* ── 오늘의 운세 카드 공유 (1080×1080 PNG · Web Share / 저장) ── */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 2px' }}>
        <ShareDayButton data={shareData} />
      </div>

      {/* ── 오늘의 핵심 — 왜 이런 하루 (topReasons/cautions) + 신살. 근거 트랜짓은 접힘. ── */}
      <div>
        <div className={`${styles.panel} ${styles.astro}`}>
          <div className={styles.eyebrow}>
            {ko ? '오늘의 핵심 · 왜 이런 하루?' : "Today's core · why this day?"}
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
                  <span className={styles.whyArrow}>↑</span> {localizeLabel(plainReason(r, ko), ko)}
                </li>
              ))}
              {(day.cautions ?? []).map((c, i) => (
                <li className={styles.whyNeg} key={`wn-${i}`}>
                  <span className={styles.whyArrow}>↓</span> {localizeLabel(plainReason(c, ko), ko)}
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

          {/* 근거 "자세히" — 전 신호(사주·점성·교차) + 극성·강도. 기본 접힘. ── */}
          <EvidenceDetails day={day} ko={ko} />
        </div>
      </div>

      {/* ── 사주 × 별자리 교차 — 핵심 신호. 쉬운말로 풀어 카드 노출. ── */}
      {day.crossActivations.length > 0 && (
        <CrossActivationCard items={day.crossActivations} ko={ko} />
      )}

      {/* ── 시 그래프 — 그날 시간대별 좋음/주의 리듬. 핵심 근거 다음으로 항상 노출. ── */}
      {hourAll.length > 0 && (
        <HourRhythm hours={hourAll} ko={ko} label={ko ? '하루 시간 리듬' : 'The day’s rhythm'} />
      )}

      {/* ── 가장 센 시간 · 시간별 근거 (시 그래프 아래 노출). ── */}
      {hourCrossItems.length > 0 && <CrossingList heading={hourHeading} items={hourCrossItems} />}

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

      <div className={styles.riseCenter}>
        <button className={`${styles.rise} ${styles.riseSmall}`} onClick={onRise}>
          ↑ {ko ? '다시 위로 — 줌아웃' : 'Zoom back out'}
        </button>
      </div>
    </div>
  )
}
