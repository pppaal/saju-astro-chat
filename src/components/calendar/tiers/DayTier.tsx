'use client'

/* ============================================================
   DayTier (1일 24시) — "마음의 날씨" 쉬운말 재설계.

   시안 원칙: 표면엔 용어(한자·십신·격국·극성·강/중/약·상승궁) 0개.
   일반인이 "오늘 마음의 날씨"를 읽듯 술술 읽히게:
     1. Hero — 날씨 글리프 + 쉬운 무드 한 줄 + 톤 단어 + 세기 막대.
        (일진/일간 한자·십신 용어 줄은 hero 에서 빼 fold 로.)
     2. 지금 일어나는 일 — topReasons + 가장 센 교차 의미(쉬운말).
     3. 이렇게 해보세요 — DO 칩 + 살살/주의 칩.
     4. 분야별 오늘 — deriveDayDomains 그리드(근거 마커 행은 제거).
     5. 자세한 신호 보기 — 흩어진 모든 용어를 담은 단 하나의 <details>:
        일진/일간 한자, 신호 근거(어스펙트·극성·강도), 본명 풀이
        (격국·지장간·12운성), 시간대 점성(상승궁/지배성).

   props:
     day:     DestinyDay  (adapter toDay() output)
     voc:     Void-of-Course 띠 (옵션, astro/void-of-course 신호)
     onRise:  zoom-out callback (→ 이번 달로)
   ============================================================ */

import * as React from 'react'
import type { DestinyDay, Polarity } from '@/types/calendar'
import {
  sibsinArea,
  sibsinAreaEn,
  planetPlain,
  plainReason,
  twelveStagePlain,
} from '@/lib/calendar-engine/derivers/plainLanguage'
import { deriveDayDomains } from '@/lib/calendar-engine/derivers/dayDomains'
import { deriveDayDeepRead } from '@/lib/calendar-engine/derivers/dayDeepRead'
import { dayStrength } from '@/lib/calendar-engine/derivers/dayStrength'
import { reconcileDayTone, type DayVerdict } from '@/lib/calendar-engine/derivers/reconcile'
import styles from './DayTier.module.css'
import { useI18n } from '@/i18n/I18nProvider'
import { CrossingList } from '@/components/calendar/atoms/CrossingList'
import { localizeLabel } from '@/components/calendar/adapters/localizeLabel'
import {
  shinsalEn,
  elementEn,
  jijangganLayerEn,
  twelveStageEn,
  appliedPatternEn,
} from '@/components/calendar/adapters/dayTierEnMaps'
import { ShareDayButton } from '@/components/calendar/share/ShareDayButton'
import type { DayShareData } from '@/components/calendar/share/DayShareCard'

// ============================================================================
// HourSlot — 24시진. (HourRhythm 막대는 day.hourCrossings 를 직접 쓰지만, 외부
// 호출자가 시진별 score 를 넘길 수 있어 prop 형태는 유지한다.)
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

// 점성 어스펙트 EN → KO (fold 안 신호 근거 행 표시용).
const ASPECT_KO: Record<string, string> = {
  conjunction: '합',
  sextile: '육각',
  square: '사각',
  trine: '삼각',
  opposition: '대립',
}

// ============================================================================
// Polarity chip (fold 전용 — 표면엔 ± 노출 금지).
// ============================================================================

function PolChip({ v }: { v: Polarity | number }) {
  const cls = v > 0 ? styles.polPos : v < 0 ? styles.polNeg : styles.polNeu
  const txt = v > 0 ? `+${v}` : v < 0 ? String(v) : '0'
  return <span className={`${styles.pol} ${cls}`}>{txt}</span>
}

// ============================================================================
// Head 보강 — GongmangBanner (쉬운말, 한자 글리프 제거).
// ============================================================================

function GongmangBanner({ gongmang }: { gongmang: DestinyDay['gongmang'] | undefined }) {
  const { locale } = useI18n()
  const ko = locale === 'ko'
  if (!gongmang || gongmang.activeBranches.length === 0) return null
  return (
    <div className={styles.gongmangBanner}>
      <span className="gmHead">{ko ? '비는 자리' : 'Hollow spot'}</span>
      <span className="gmNote">
        {gongmang.note ??
          (ko
            ? '타고난 한 자리가 비는 날 — 힘이 덜 실려요'
            : 'A natal spot runs hollow today — less force behind things')}
      </span>
    </div>
  )
}

// ============================================================================
// Head 보강 — VocBanner (Void-of-Course, 쉬운말).
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
// SecHead — 전 섹션 공통 헤더 1패턴.
// ============================================================================
function SecHead({ title, note }: { title: string; note?: string }) {
  return (
    <div className={styles.secHead}>
      <h2 className={styles.secTitle}>{title}</h2>
      {note ? <span className={styles.secNote}>{note}</span> : null}
    </div>
  )
}

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
      <SecHead
        title={label}
        note={ko ? '좋음 ↑ 쪽빛 · 주의 ↓ 주황' : 'good ↑ indigo · caution ↓ amber'}
      />
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
                    background: up ? 'var(--dp-accent-2)' : 'var(--dp-tone-mixed)',
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
// CrossActivationCard — 사주 × 별자리 교차. 쉬운말(분야×행성)로 풀어 카드 노출.
// ============================================================================
function CrossActivationCard({
  items,
  ko,
}: {
  items: DestinyDay['crossActivations']
  ko: boolean
}) {
  const rows = [...items].sort((a, b) => Math.abs(b.polarity) - Math.abs(a.polarity)).slice(0, 4)
  if (rows.length === 0) return null
  return (
    <div className={styles.crossCard}>
      <SecHead
        title={ko ? '사주 × 별자리 교차' : 'Saju × Astrology'}
        note={ko ? '둘 다 가리키는 신호만' : 'only where both point the same way'}
      />
      {rows.map((c, i) => {
        const sajuPlain = ko
          ? sibsinArea(c.sajuKo ?? c.sajuSide)
          : sibsinAreaEn(c.sajuKo ?? c.sajuSide)
        const astroPlain = planetPlain(c.astroKo ?? c.astroSide, ko)
        const good = c.polarity >= 0
        const meaning = ko ? c.meaning : (c.meaningEn ?? c.meaning)
        return (
          <div key={c.id ?? i} className={styles.crossRow}>
            <div className={styles.crossPair}>
              <span className={styles.crossSaju}>{sajuPlain}</span>
              <span className={good ? styles.crossArrowPos : styles.crossArrowNeg}>⇄</span>
              <span className={styles.crossAstro}>{astroPlain}</span>
            </div>
            {meaning && <div className={styles.crossMeaning}>{meaning}</div>}
          </div>
        )
      })}
      <div className={styles.crossFoot}>
        {ko ? '내 사주와 그날 별이 실제로 겹칠 때만 떠요' : 'shown only when both actually overlap'}
      </div>
    </div>
  )
}

// ============================================================================
// TimingCard — 이달 흐름(추이, 오늘=쪽빛 점) + 다가오는 며칠 (한 카드).
// ============================================================================
function TimingCard({
  scores,
  days,
  ko,
}: {
  scores: DestinyDay['monthScores']
  days: DestinyDay['upcoming']
  ko: boolean
}) {
  const hasFlow = !!scores && scores.length >= 3
  const hasUp = !!days && days.length > 0
  if (!hasFlow && !hasUp) return null

  let flow: React.ReactNode = null
  let dayLabel = ''
  if (hasFlow && scores) {
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
    dayLabel = ko
      ? `${scores.length}일 중 ${ti >= 0 ? ti + 1 : '?'}일째`
      : `day ${ti >= 0 ? ti + 1 : '?'}`
    flow = (
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        <path d={area} fill="rgba(47,125,91,0.16)" />
        <path d={d} fill="none" stroke="var(--dp-pos)" strokeWidth={2} />
        {ti >= 0 && (
          <>
            {/* 오늘 = 쪽빛(now) — 朱는 사주 신호 전용으로 비운다. */}
            <circle cx={X(ti)} cy={Y(scores[ti].score)} r={4.5} fill="var(--dp-accent)" />
            <text
              x={X(ti)}
              y={Y(scores[ti].score) - 7}
              textAnchor="middle"
              style={{ font: '600 9px var(--dp-sans)', fill: 'var(--dp-accent)' }}
            >
              {ko ? '오늘' : 'today'}
            </text>
          </>
        )}
      </svg>
    )
  }

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
      <SecHead title={ko ? '타이밍' : 'Timing'} note={hasFlow ? dayLabel : undefined} />
      {hasFlow && (
        <>
          <div className={styles.flowSubHead}>
            <span>{ko ? '이달 흐름 속 오늘' : 'Today within the month'}</span>
          </div>
          {flow}
        </>
      )}
      {hasFlow && hasUp && <hr className={styles.flowDivider} />}
      {hasUp && days && (
        <>
          <div className={styles.flowSubHead}>
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
        </>
      )}
    </div>
  )
}

// ============================================================================
// EvidenceBlock — 신호 근거(사주 십신/점성 트랜짓/교차) · 어스펙트→본명점 ·
// 극성(±)·강도(강/중/약). 표면이 아니라 "자세한 신호 보기" fold 안에서만 노출.
// 지어내지 않고 allSignals 그대로.
// ============================================================================
function EvidenceBlock({ day, ko }: { day: DestinyDay; ko: boolean }) {
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
    <div className={styles.foldBlock}>
      <div className={styles.foldLabel}>{ko ? '신호와 강도' : 'Signals & strength'}</div>
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
    </div>
  )
}

// ============================================================================
// NatalBlock — 본명 풀이: 응용격국(동적)·지장간(일지 3층)·일진 12운성. fold 전용.
// EN 은 dayTierEnMaps 고정 치환(한글 누출 방지).
// ============================================================================
const ELEM_PLAIN_KO: Record<string, string> = {
  목: '나무(木)',
  화: '불(火)',
  토: '흙(土)',
  금: '쇠(金)',
  수: '물(水)',
}
const LAYER_PLAIN_KO: Record<string, string> = {
  정기: '주된 기운',
  중기: '중간 기운',
  여기: '남은 기운',
}
const PILLAR_PLAIN: Record<string, { ko: string; en: string }> = {
  年: { ko: '태어난 해', en: 'birth year' },
  月: { ko: '태어난 달', en: 'birth month' },
  日: { ko: '나 자신', en: 'self (day)' },
  時: { ko: '태어난 시', en: 'birth hour' },
}

function NatalBlock({ day, ko }: { day: DestinyDay; ko: boolean }) {
  const patterns = day.appliedPatterns ?? []
  const jj = day.jijanggan
  const jjLayers = [jj?.jeonggi, jj?.junggi, jj?.yeogi].filter(
    (l): l is NonNullable<typeof l> => !!l
  )
  const stages = day.twelveStageMatrix ?? []
  if (patterns.length === 0 && jjLayers.length === 0 && stages.length === 0) return null
  return (
    <div className={styles.natalBody}>
      {patterns.length > 0 && (
        <div className={styles.natalBlock}>
          <div className={styles.foldLabel}>
            {ko ? '오늘 만들어진 기운 조합' : 'Combinations forming today'}
          </div>
          {patterns.map((p, i) => {
            const en = appliedPatternEn(String(p.id))
            const good = p.polarity >= 0
            return (
              <div className={styles.natalRow} key={p.id ?? i}>
                <span className={good ? styles.natalPos : styles.natalNeg}>
                  {ko ? p.rule : (en?.gloss ?? '')}
                </span>
                <span className={styles.natalDesc}>
                  {ko ? p.korean : (en?.name ?? p.korean)}{' '}
                  <span className={styles.natalHan}>{p.name}</span>
                </span>
              </div>
            )
          })}
        </div>
      )}
      {jjLayers.length > 0 && (
        <div className={styles.natalBlock}>
          <div className={styles.foldLabel}>
            {ko ? '내 안에 숨은 기운 (일지 속)' : 'Hidden energies within'}
          </div>
          <div className={styles.natalChips}>
            {jjLayers.map((L, i) => (
              <span className={styles.natalChip} key={i}>
                {ko
                  ? `${ELEM_PLAIN_KO[L.element] ?? L.element} · ${sibsinArea(String(L.sibsin))} · ${LAYER_PLAIN_KO[L.layer] ?? L.layer}`
                  : `${elementEn(L.element)} · ${sibsinAreaEn(String(L.sibsin))} · ${jijangganLayerEn(L.layer)}`}{' '}
                <span className={styles.natalHan}>{L.stem}</span>
              </span>
            ))}
          </div>
        </div>
      )}
      {stages.length > 0 && (
        <div className={styles.natalBlock}>
          <div className={styles.foldLabel}>
            {ko ? '기둥별 기운의 세기' : 'Energy strength by pillar'}
          </div>
          <div className={styles.natalChips}>
            {stages.map((s, i) => (
              <span className={styles.natalChip} key={i}>
                {ko
                  ? `${PILLAR_PLAIN[s.pillar]?.ko ?? s.pillar} · ${twelveStagePlain(s.stage)}`
                  : `${PILLAR_PLAIN[s.pillar]?.en ?? s.pillar} · ${twelveStageEn(s.stage)}`}{' '}
                <span className={styles.natalHan}>{s.stage}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// ChartBlock — 일진/일간 한자 + 십신 용어. hero 에서 빼 fold 안으로 옮긴 원자료.
// ============================================================================
function ChartBlock({ day, ko }: { day: DestinyDay; ko: boolean }) {
  return (
    <div className={styles.foldBlock}>
      <div className={styles.foldLabel}>{ko ? '오늘의 기둥' : "Today's pillar"}</div>
      <div className={styles.chartRow}>
        <span className={styles.chartHan}>{day.iljin.hanja}</span>
        <span className={styles.chartDesc}>
          {ko
            ? `오늘의 기운 ${day.iljin.kr}(${day.iljin.hanja}) · 십신 ${String(day.iljinSibsin)}`
            : `today's pillar ${day.iljin.en} · ${day.iljin.hanja} · ${String(day.iljinSibsin)}`}
        </span>
      </div>
      {day.dayMaster && (
        <div className={styles.chartRow}>
          <span className={styles.chartHan}>{day.dayMaster.hanja}</span>
          <span className={styles.chartDesc}>
            {ko
              ? `나의 타고난 기운 · ${day.dayMaster.kr}`
              : `your core nature · ${day.dayMaster.en}`}
          </span>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// HourSkyBlock — 시간대 점성(상승궁/지배성) 원자료. fold 전용 (표면엔 용어 없이).
// ============================================================================
function HourSkyBlock({
  rows,
  ko,
}: {
  rows: NonNullable<DestinyDay['hourCrossings']>
  ko: boolean
}) {
  if (rows.length === 0) return null
  return (
    <div className={styles.foldBlock}>
      <div className={styles.foldLabel}>{ko ? '시간대 하늘' : 'Sky by hour'}</div>
      <div className={styles.skyList}>
        {rows.map((h, i) => {
          const label = ko ? h.when : h.whenEn
          const time = label.replace(/\s*\(.*\)/, '').trim()
          const sign = ko ? h.risingSignKo : h.risingSignEn
          const ruler = ko ? h.ruler : h.rulerEn
          const rise = ko ? '상승' : 'rising'
          if (!sign) return null
          return (
            <div className={styles.skyRow} key={i}>
              <span className={styles.skyWhen}>{time}</span>
              <span className={styles.skyBody}>
                {sign} {rise}
                {ruler ? (ko ? ` · 지배성 ${ruler}` : ` · ruler ${ruler}`) : ''}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// SignalFold — 단 하나의 "자세한 신호 보기" 펼침. 표면에서 걷어낸 모든 용어를
// 여기 한 곳에 모은다: 오늘의 기둥(한자) · 신호와 강도 · 본명 풀이 · 시간대 하늘.
// ============================================================================
function SignalFold({
  day,
  ko,
  hourRows,
}: {
  day: DestinyDay
  ko: boolean
  hourRows: NonNullable<DestinyDay['hourCrossings']>
}) {
  return (
    <details className={styles.fold}>
      <summary className={styles.foldSummary}>
        {ko ? '자세한 신호 보기' : 'See the raw signals'}
      </summary>
      <div className={styles.foldBody}>
        <ChartBlock day={day} ko={ko} />
        <EvidenceBlock day={day} ko={ko} />
        <NatalBlock day={day} ko={ko} />
        <HourSkyBlock rows={hourRows} ko={ko} />
      </div>
    </details>
  )
}

// ============================================================================
// DayTier (main).
// ============================================================================
export function DayTier({ day, voc, onRise, sex = '남' }: DayTierProps) {
  const { locale } = useI18n()
  const ko = locale === 'ko'

  const verdict: DayVerdict =
    day.dayTone ??
    reconcileDayTone({
      score: day.score,
      reasonNet: 0,
      hasGoodReason: (day.topReasons ?? []).length > 0,
      hasCautionReason: (day.cautions ?? []).length > 0,
    })
  const dayBand: DayVerdict['band'] =
    verdict.tone === 'positive' ? 'good' : verdict.tone === 'caution' ? 'low' : 'mid'

  const dayOneLine = ko ? day.oneLine : (day.oneLineEn ?? day.oneLine)
  const dayReasons = ko ? (day.topReasons ?? []) : (day.topReasonsEn ?? day.topReasons ?? [])
  const dayCautions = ko ? (day.cautions ?? []) : (day.cautionsEn ?? day.cautions ?? [])

  // hero 톤 단어 — 단일 verdict.tone 출처 (순풍/평이/역풍).
  const heroToneWord = ko
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

  // 점수 → 세기(막대+단어). 숫자 점수는 화면에 안 쓴다(시안).
  const strength = dayStrength(day.score)
  // 마음의 날씨 글리프 — 순풍=맑음, 역풍=비, 평이=구름.
  const heroGlyph = verdict.tone === 'positive' ? '🌤️' : verdict.tone === 'caution' ? '🌧️' : '⛅'

  // ── 오늘 깊이 읽기 — 합성 해석 문단. ──
  const peakHourSrc = [...(day.hourCrossings ?? [])].sort(
    (a, b) => Number(b.matched) - Number(a.matched) || b.strength - a.strength
  )[0]
  const deepRead = deriveDayDeepRead({
    iljinKr: day.iljin.kr,
    iljinSibsin: String(day.iljinSibsin),
    tone: verdict.tone,
    crosses: (day.crossActivations ?? [])
      .filter((c) => c.sajuKo && c.astroKo)
      .map((c) => ({
        sajuKo: c.sajuKo as string,
        astroKo: c.astroKo as string,
        polarity: c.polarity,
      })),
    shinsal: (day.shinsalActive ?? []).slice(0, 2).map((s) => ({ ko: s, en: shinsalEn(s) })),
    peakHour: peakHourSrc
      ? {
          whenKo: peakHourSrc.when.replace(/\s*\(.*\)/, '').trim(),
          whenEn: peakHourSrc.whenEn.replace(/\s*\(.*\)/, '').trim(),
          tone: peakHourSrc.tone === 'good' ? 'good' : 'caution',
        }
      : null,
    seed: day.seed ?? 0,
  })

  // ── 지금 일어나는 일 — topReasons(쉬운말) + 가장 센 교차 의미를 모은 표면 줄. ──
  // 용어 0개. 삶의 분야로 시작하게(plainReason 은 이미 쉬운말).
  const strongestCross = [...(day.crossActivations ?? [])]
    .filter((c) => (ko ? c.meaning : (c.meaningEn ?? c.meaning)))
    .sort((a, b) => Math.abs(b.polarity) - Math.abs(a.polarity))[0]
  const strongestCrossMeaning = strongestCross
    ? ko
      ? strongestCross.meaning
      : (strongestCross.meaningEn ?? strongestCross.meaning)
    : ''
  const happeningLines = [
    ...dayReasons.slice(0, 2).map((r) => localizeLabel(plainReason(r, ko), ko)),
    ...(strongestCrossMeaning ? [strongestCrossMeaning] : []),
  ].slice(0, 3)

  // ── 시간별 — HourRhythm 막대(표면) + 가장 센 시간(쉬운말, 점성 용어 제거). ──
  // 상승궁/지배성은 '자세한 신호 보기' fold 의 시간대 하늘로 내린다.
  const toHourItem = (h: NonNullable<DestinyDay['hourCrossings']>[number]) => {
    const label = ko ? h.when : h.whenEn
    const timeShort = label.replace(/\s*\(.*\)/, '').trim()
    const tone = h.tone === 'good' ? (ko ? '좋은 흐름' : 'good flow') : ko ? '살살' : 'go gentle'
    const area = ko ? sibsinArea(h.sibsin) : sibsinAreaEn(h.sibsin)
    const narr = ko ? h.narrative : h.narrativeEn
    const meaning = ko ? h.crossMeaning : h.crossMeaningEn
    return {
      when: timeShort,
      title: `${area} · ${tone}`,
      detail: [h.matched ? meaning : '', narr].filter(Boolean).join(' · '),
    }
  }
  const hourAll = day.hourCrossings ?? []
  const hourTop = [...hourAll]
    .sort((a, b) => Number(b.matched) - Number(a.matched) || b.strength - a.strength)
    .slice(0, 3)
  const hourTopKeys = new Set(hourTop.map((h) => h.when))
  const hourCrossItems = hourAll.filter((h) => hourTopKeys.has(h.when)).map(toHourItem)
  const hourHeading = ko ? '오늘 가장 센 시간' : 'Strongest hours'

  // 분야별 오늘 — 그날 일진 십신 → 6분야 (성별·점수 반영). 근거 마커는 표면에서 제거.
  const dayDomains = deriveDayDomains({
    iljinSibsin: String(day.iljinSibsin),
    sex,
    scoreBand: dayBand,
    ko,
    seed: day.seed ?? 0,
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

  // ── 공유 카드 데이터. ──
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
    oneLine: localizeLabel(dayOneLine, ko),
    goods: dayReasons.slice(0, 3).map((r) => localizeLabel(plainReason(r, ko), ko)),
    cautions: dayCautions.slice(0, 3).map((c) => localizeLabel(plainReason(c, ko), ko)),
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

      {/* ── Hero (마음의 날씨): 날씨 글리프 + 쉬운 무드 한 줄 + 톤 단어 + 세기 막대.
          일진/일간 한자·십신 용어 줄은 hero 에서 빼 '자세한 신호 보기' fold 로. ── */}
      <div className={styles.dayHead}>
        <div className={styles.heroRow}>
          <span className={styles.weatherGlyph} aria-hidden>
            {heroGlyph}
          </span>
          <div className={styles.heroMeta}>
            <div className={styles.heroLead}>
              {ko
                ? `오늘은 ‘${sibsinArea(String(day.iljinSibsin))}’의 기운`
                : `today leans toward ${sibsinAreaEn(String(day.iljinSibsin))}`}
            </div>
            <span className={styles.heroTone} data-tone={verdict.tone}>
              {heroToneWord}
            </span>
          </div>
          <div className={styles.strength} aria-label={ko ? strength.ko : strength.en}>
            <div className={styles.strengthBars}>
              {[1, 2, 3, 4, 5].map((i) => (
                <span
                  key={i}
                  className={`${styles.strengthBar} ${i <= strength.level ? styles.strengthOn : ''}`}
                />
              ))}
            </div>
            <div className={styles.strengthWord}>{ko ? strength.ko : strength.en}</div>
          </div>
        </div>
        <p className={styles.oneline}>{localizeLabel(dayOneLine, ko)}</p>
      </div>

      {/* ── 오늘 깊이 읽기 — 합성 해석 문단. ── */}
      <div className={styles.deepRead}>
        <div className={styles.deepReadLabel}>{ko ? '오늘 깊이 읽기' : 'Today in depth'}</div>
        <p className={styles.deepReadBody}>{ko ? deepRead.ko : deepRead.en}</p>
      </div>

      {/* ── 지금 일어나는 일 — topReasons + 가장 센 교차 의미(쉬운말). ── */}
      <div className={styles.happening}>
        <SecHead title={ko ? '지금 일어나는 일' : "What's happening"} />
        {happeningLines.length === 0 ? (
          <p className={styles.whyMuted}>
            {ko
              ? '오늘은 두드러진 신호 없이 무난한 흐름이에요.'
              : 'A steady day with no standout signals.'}
          </p>
        ) : (
          <ul className={styles.happeningList}>
            {happeningLines.map((line, i) => (
              <li className={styles.happeningItem} key={i}>
                {line}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── 이렇게 해보세요 — DO 칩 + 살살/주의 칩. ── */}
      <div className={styles.doSection}>
        <SecHead title={ko ? '이렇게 해보세요' : 'Try this today'} />
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
            {ko ? '살살 · ' : 'EASE · '}
            {dayBand === 'good'
              ? ko
                ? '과욕 부리지 않기'
                : "don't overreach"
              : ko
                ? '크게 벌이지 않기'
                : "don't start big"}
          </span>
        </div>
      </div>

      {/* 비는 자리(공망)·달의 빈 시간 — 쉬운말 배너(한자 제거). 그날 활성이라 유지. */}
      <GongmangBanner gongmang={day.gongmang} />
      <VocBanner voc={voc} />

      {/* ── 타이밍 맥락 — 이달 흐름 속 오늘 + 다가오는 며칠. ── */}
      <TimingCard scores={day.monthScores} days={day.upcoming} ko={ko} />

      {/* ── 오늘의 운세 카드 공유. ── */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 2px' }}>
        <ShareDayButton data={shareData} />
      </div>

      {/* ── 사주 × 별자리 교차 — 핵심 신호, 쉬운말 카드. ── */}
      {day.crossActivations.length > 0 && (
        <CrossActivationCard items={day.crossActivations} ko={ko} />
      )}

      {/* ── 시 그래프 — 시간대별 좋음/주의 리듬. ── */}
      {hourAll.length > 0 && (
        <HourRhythm hours={hourAll} ko={ko} label={ko ? '하루 시간 리듬' : 'The day’s rhythm'} />
      )}

      {/* ── 가장 센 시간 (쉬운말 — 점성 용어 없이). ── */}
      {hourCrossItems.length > 0 && <CrossingList heading={hourHeading} items={hourCrossItems} />}

      {/* ── 분야별 오늘 — deriveDayDomains 그리드(근거 마커 행 제거, 쉬운말만). ── */}
      {dayDomains && (
        <div className={styles.domainBlock}>
          <SecHead
            title={ko ? '분야별 오늘 조언' : 'Today by area'}
            note={ko ? dayDomains.bandNote : dayDomains.bandNoteEn}
          />

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
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 자세한 신호 보기 — 흩어진 모든 용어를 담은 단 하나의 fold. ── */}
      <SignalFold day={day} ko={ko} hourRows={hourAll} />

      <div className={styles.riseCenter}>
        <button className={`${styles.rise} ${styles.riseSmall}`} onClick={onRise}>
          ↑ {ko ? '다시 위로 — 줌아웃' : 'Zoom back out'}
        </button>
      </div>
    </div>
  )
}
