'use client'

/* ============================================================
   destinypal · MonthTier — 1달(月運) MONTHLY 카드 · "정갈" 만세력
   ────────────────────────────────────────────────────────────
   재설계 원칙(시안 A · Editorial Letterpress):
     · 한 셀에 신호 하나 — 날짜 숫자 + 상태 밑줄(bar) 하나.
       (옛 버전은 글로우 + 점수배지 + 별표 + 판정어 + VoC띠 + 링을
        한 셀에 욱여넣어 모바일에서 뭉갰다.)
     · 색은 *판정(favorability)* 만 — 좋음=쪽빛 / 주의=호박 / 피함=주사 밑줄.
     · "오늘"은 먹선 링(별개 채널). "큰 날(수렴)"은 주사 도장 점(또 다른 채널).
       세 축(점수·오늘·큰날)을 색이 아니라 *형태*로 분리해 서로 안 싸우게.
     · 죽은 필드(woolunSibsin · voidOfCourseDates · lunarReturnIso · per-cell
       score · converge)는 쓰지 않는다 — 런타임에 항상 비어 있어 옛 UI가
       빈 배지/띠를 그렸다.

   살아있는 데이터만 사용:
     month.{ym,label,woolun,calendar[].{d,ds,mark,focus},focusDay,
            goodDays,cautionDays,avoidDays,bestDay,keyDays,narrative}
   ============================================================ */

import type { DestinyMonth, DestinyDayMark } from '@/types/calendar'
import styles from './MonthTier.module.css'
import { useI18n } from '@/i18n/I18nProvider'
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

const DOWS = ['일', '월', '화', '수', '목', '금', '토'] as const
const DOWS_EN = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const

// ============================================================================
// Props (계약 불변 — 셸 줌 네비게이션이 onDive/onRise/showRise 를 호출)
// ============================================================================

export interface MonthTierProps {
  month: DestinyMonth
  onDive: (focusDay: number) => void
  onRise: () => void
  /** 위 티어가 있을 때만 줌아웃 버튼 노출 (월이 최상단이면 숨김). 기본 true. */
  showRise?: boolean
}

// ============================================================================
// helpers
// ============================================================================

/** ym = "YYYY-MM" → 1일의 요일 (0=일 .. 6=토). */
function firstDowOfMonth(ym: string): number {
  const yyyy = parseInt(ym.slice(0, 4), 10)
  const mm = parseInt(ym.slice(5, 7), 10)
  if (!Number.isFinite(yyyy) || !Number.isFinite(mm)) return 0
  return new Date(Date.UTC(yyyy, mm - 1, 1)).getUTCDay()
}

/** 셀 mark → 상태 밑줄(bar) 클래스. 좋음/주의/피함만 칠하고 나머진 무표시. */
function barClass(mark: DestinyDayMark | null): string | null {
  switch (mark) {
    case 'best':
      return styles.barBest
    case 'good':
      return styles.barGood
    case 'caution':
      return styles.barCaution
    case 'avoid':
      return styles.barAvoid
    default:
      return null
  }
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

  // 1달 제목 — ko: "2026년 6월의 흐름" / en: "June 2026"
  const [ymY, ymM] = month.ym.split('-').map(Number)
  const flowTitle = ko
    ? `${month.label}의 흐름`
    : `${MONTH_EN[(ymM ?? 1) - 1] ?? ''} ${ymY ?? ''}`.trim()
  // 월운 읽기 줄 — "갑오 · 월운" (woolunSibsin 은 런타임에 항상 빈 값이라 안 씀).
  const woolunRead = ko
    ? `${month.woolun?.kr ?? ''} · 월운`.trim()
    : `${month.woolun?.en ?? month.woolun?.kr ?? ''} · monthly pillar`.trim()

  const goodN = month.goodDays?.length ?? 0
  const cautionN = month.cautionDays?.length ?? 0
  const avoidN = month.avoidDays?.length ?? 0

  // ── 이달의 큰 날 (사주×점성 수렴) — 제목 톤을 달력 셀 판정과 같은 소스로 맞춘다 ──
  // (점수 색과 의미 톤이 어긋나지 않게: 셀이 '주의'면 의미도 '주의할 날'.)
  const markByDs = new Map<string, DestinyDayMark | null>(calendar.map((c) => [c.ds, c.mark]))
  const verdictPrefix = (m: DestinyDayMark | null): string | null => {
    if (m === 'best' || m === 'good') return ko ? '좋은 날' : 'Good day'
    if (m === 'caution') return ko ? '주의할 날' : 'Caution'
    if (m === 'avoid') return ko ? '피할 날' : 'Avoid'
    return null
  }
  const markToTone = (m: DestinyDayMark | null): MeaningTone | null => {
    if (m === 'best' || m === 'good') return 'positive'
    if (m === 'caution' || m === 'avoid') return 'negative'
    if (m === 'converge') return 'neutral'
    return null
  }
  const keyDayItems = [...(month.keyDays ?? [])].map((k) => {
    const mark = markByDs.get(k.date) ?? null
    const tone = markToTone(mark)
    const dayNum = parseInt(k.date.slice(-2), 10)
    const meaning = tone
      ? toneMeaningFor(tone, dayNum, ko ? 'ko' : 'en')
      : k.meaning || (k.bothSystems ? (ko ? '신호가 겹치는 날' : 'signals overlap') : '')
    const vp = verdictPrefix(mark)
    const title =
      vp && meaning ? `${vp} · ${meaning}` : meaning || vp || (ko ? '주목할 날' : 'Notable day')
    return { when: k.date, title }
  })
  // best(최고)일이 큰 날 목록에 빠졌으면 채워 넣는다.
  if (month.bestDay?.date && !keyDayItems.some((i) => i.when === month.bestDay.date)) {
    const dn = parseInt(month.bestDay.date.slice(-2), 10)
    keyDayItems.push({
      when: month.bestDay.date,
      title: `${ko ? '최고의 날' : 'Best day'} · ${toneMeaningFor('positive', dn, ko ? 'ko' : 'en')}`,
    })
  }
  const bigDays = keyDayItems.sort((a, b) => a.when.localeCompare(b.when))
  const keyDates = new Set(bigDays.map((i) => i.when))

  // ── 이달 총평 — narrative 에서 요약 한 문단 ──
  const summaryTag = ko ? '이달 총평' : 'This month'
  const summaryCard = (month.narrative ?? []).find((n) => n.tag === summaryTag)

  // 'MM-DD' → 'M/D' (큰 날 날짜 라벨)
  const mdLabel = (ds: string) => {
    const [, dd] = ds.split('-')
    return `${ymM ?? ''}/${Number(dd)}`
  }

  return (
    <div className={styles.tier} data-screen-label={`1달 ${month.ym}`}>
      {showRise && (
        <button className={styles.rise} onClick={onRise} type="button">
          ↑ {ko ? '올해로 줌아웃' : 'Zoom out to year'}
        </button>
      )}

      {/* ===== header ===== */}
      <div className={styles.eyebrow}>
        {ko ? '1달' : '1 Month'} · Monthly · {month.ym}
      </div>
      <h1 className={styles.secTitle}>{flowTitle}</h1>

      <div className={styles.stampRow}>
        <div className={styles.ganji}>
          <span className={styles.ganjiHanja}>{month.woolun?.hanja ?? '—'}</span>
          <span className={styles.ganjiRead}>{woolunRead}</span>
        </div>
        <span className={styles.tagSaju}>{ko ? '사주 · 四柱' : 'Saju · 四柱'}</span>
      </div>

      <p className={styles.summary}>
        {ko ? (
          <>
            좋은 날 <b>{goodN}개</b> · 주의 <b>{cautionN}개</b> · 피하기 <b>{avoidN}개</b>
          </>
        ) : (
          <>
            <b>{goodN}</b> good · <b>{cautionN}</b> caution · <b>{avoidN}</b> avoid
          </>
        )}
      </p>

      {/* ===== calendar grid ===== */}
      <div className={styles.weekHead}>
        {(ko ? DOWS : DOWS_EN).map((d, i) => (
          <span
            key={`dow-${i}`}
            className={i === 0 ? styles.dowSun : i === 6 ? styles.dowSat : undefined}
          >
            {d}
          </span>
        ))}
      </div>

      <div className={styles.grid}>
        {Array.from({ length: firstDow }).map((_, i) => (
          <div key={`pad-${i}`} className={styles.cellPad} />
        ))}
        {calendar.map((c) => {
          const dow = (firstDow + (c.d - 1)) % 7
          const isSun = dow === 0
          const isKeyDay = keyDates.has(c.ds)
          const bar = barClass(c.mark)
          const cls = [styles.cell, c.focus && styles.cellToday, isSun && styles.cellSun]
            .filter(Boolean)
            .join(' ')
          return (
            <div
              key={c.d}
              className={cls}
              onClick={c.focus ? () => onDive(focusDay) : undefined}
              role={c.focus ? 'button' : undefined}
              tabIndex={c.focus ? 0 : undefined}
              aria-label={
                c.focus ? (ko ? `오늘 ${c.d}일로 줌인` : `Zoom in to day ${c.d}`) : undefined
              }
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
              {c.focus && <span className={styles.todayRing} aria-hidden />}
              {isKeyDay && <span className={styles.keySeal} aria-hidden />}
              <span className={styles.num}>{c.d}</span>
              {bar && <span className={`${styles.bar} ${bar}`} aria-hidden />}
            </div>
          )
        })}
      </div>

      {/* ===== legend ===== */}
      <div className={styles.legend}>
        <span className={styles.legItem}>
          <span className={`${styles.swatch} ${styles.swatchGood}`} />
          {ko ? '좋음' : 'Good'}
        </span>
        <span className={styles.legItem}>
          <span className={`${styles.swatch} ${styles.swatchCaution}`} />
          {ko ? '주의' : 'Caution'}
        </span>
        <span className={styles.legItem}>
          <span className={`${styles.swatch} ${styles.swatchAvoid}`} />
          {ko ? '피함' : 'Avoid'}
        </span>
        <span className={styles.legItem}>
          <span className={`${styles.swatch} ${styles.swatchRing}`} />
          {ko ? '오늘' : 'Today'}
        </span>
        {bigDays.length > 0 && (
          <span className={styles.legItem}>
            <span className={`${styles.swatch} ${styles.swatchSeal}`} />
            {ko ? '큰 날' : 'Key day'}
          </span>
        )}
      </div>

      {/* ===== 이달의 큰 날 (사주 × 점성 수렴) ===== */}
      {bigDays.length > 0 && (
        <>
          <div className={styles.subhead}>{ko ? '이달의 큰 날' : 'Key days this month'}</div>
          <div className={styles.bigDays}>
            {bigDays.map((b) => (
              <div className={styles.bigDay} key={b.when}>
                <span className={styles.bigDayDate}>{mdLabel(b.when)}</span>
                <span className={styles.bigDayTxt}>{b.title}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ===== 이달 총평 ===== */}
      {summaryCard && (
        <div className={styles.card}>
          <div className={styles.cardLabel}>{summaryCard.tag}</div>
          <p className={styles.cardBody}>{localizeLabel(summaryCard.body, ko)}</p>
        </div>
      )}

      {/* ===== dive (줌인) ===== */}
      <button className={styles.dive} onClick={() => onDive(focusDay)} type="button">
        {ko
          ? `오늘 ${ymM ?? ''}월 ${focusDay}일로 줌인`
          : `Zoom in to ${MONTH_EN[(ymM ?? 1) - 1] ?? ''} ${focusDay}`}
        <span className={styles.diveArrow}>↓</span>
      </button>
    </div>
  )
}
