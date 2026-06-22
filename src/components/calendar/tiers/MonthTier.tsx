'use client'

/* ============================================================
   destinypal · MonthTier — 1달(月運) "이 달의 모양" · LIGHT 만세력
   ────────────────────────────────────────────────────────────
   디자인 방향(시안 · LIGHT):
     · 앱 셸은 다크 — 이 티어는 .monthRoot 가 라이트 팔레트를 직접 들고
       독립 레이아웃을 쓴다(TierFrame 미사용).
     · 간지(甲午)·월운 읽기·raw 사주/점성 용어(편재·화성…)를 *표면에* 드러낸다.
       → 옛 "자세한 신호 보기" jargon 폴드 + WhyList 제거.
     · 색 달력 그리드(좋음/조심/피함/큰날/오늘) + 클릭으로 셀 선택 → 리드아웃.
     · 큰 날 리스트 · 한 줄 총평(verdict + term-tag) · 겹치는 흐름 카드.

   PRESENTATION ONLY — 엔진/derivers/스코어링 미변경. 살아있는 데이터만 사용:
     month.{ym,label,woolun,calendar[].{d,ds,mark,focus},focusDay,
            goodDays,cautionDays,avoidDays,bestDay,keyDays,narrative,
            woolunSibsin,crossActivations,seed}
   ============================================================ */

import { useState } from 'react'
import type { DestinyMonth, DestinyDayMark } from '@/types/calendar'
import styles from './MonthTier.module.css'
import { useI18n } from '@/i18n/I18nProvider'
import { toneMeaningFor, type MeaningTone } from '@/lib/calendar-engine/derivers/toneMeaning'
import { sibsinArea, sibsinAreaEn, planetPlain } from '@/lib/calendar-engine/derivers/plainLanguage'
import { ShareCalendarButton } from '@/components/calendar/ShareCalendarButton'

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

// ============================================================================
// 컴포넌트
// ============================================================================

export function MonthTier({ month, onDive, onRise, showRise = true }: MonthTierProps) {
  const { locale } = useI18n()
  const ko = locale === 'ko'
  const firstDow = firstDowOfMonth(month.ym)
  const calendar = month.calendar ?? []
  const focusDay = month.focusDay

  // 1달 제목 — ko: "6월의 모양" / en: "The shape of June"
  const ymM = Number(month.ym.split('-')[1])
  const year = month.ym.split('-')[0] ?? ''
  const monthEn = MONTH_EN[(ymM ?? 1) - 1] ?? ''
  const flowTitle = ko ? `${ymM ?? ''}월의 모양` : `The shape of ${monthEn}`.trim()

  const goodN = month.goodDays?.length ?? 0
  const cautionN = month.cautionDays?.length ?? 0
  const avoidN = month.avoidDays?.length ?? 0
  // 개인 시드 — 톤 문구를 사람마다 다르게 회전(같은 날·톤이라도 본명 다르면 다른 줄).
  const seed = month.seed ?? 0

  // ── 셀 mark ↔ 톤 매핑 (색과 의미가 어긋나지 않게 같은 소스). ──
  const markByDs = new Map<string, DestinyDayMark | null>(calendar.map((c) => [c.ds, c.mark]))
  const verdictPrefix = (m: DestinyDayMark | null): string => {
    if (m === 'best' || m === 'good') return ko ? '좋은 날' : 'Good day'
    if (m === 'caution') return ko ? '조심할 날' : 'Caution'
    if (m === 'avoid') return ko ? '피할 날' : 'Avoid'
    return ko ? '잔잔한 날' : 'Calm day'
  }
  const markToTone = (m: DestinyDayMark | null): MeaningTone => {
    if (m === 'best' || m === 'good') return 'positive'
    if (m === 'caution' || m === 'avoid') return 'negative'
    return 'neutral'
  }

  // ── 이달의 큰 날 — 판정 prefix + 톤 문구. 'MM-DD' 기준으로 셀 톤을 끌어온다. ──
  interface BigDay {
    when: string
    title: string
  }
  const keyDayItems: BigDay[] = [...(month.keyDays ?? [])].map((k) => {
    const mark = markByDs.get(k.date) ?? null
    const tone = markToTone(mark)
    const dayNum = parseInt(k.date.slice(-2), 10)
    const meaning =
      k.meaning && k.meaning.trim()
        ? k.meaning
        : toneMeaningFor(tone, dayNum, ko ? 'ko' : 'en', seed)
    const vp = verdictPrefix(mark)
    return { when: k.date, title: `${vp} · ${meaning}` }
  })
  // best(최고)일이 큰 날 목록에 빠졌으면 채워 넣는다.
  if (month.bestDay?.date && !keyDayItems.some((i) => i.when === month.bestDay.date)) {
    const dn = parseInt(month.bestDay.date.slice(-2), 10)
    keyDayItems.push({
      when: month.bestDay.date,
      title: `${ko ? '최고의 날' : 'Best day'} · ${toneMeaningFor('positive', dn, ko ? 'ko' : 'en', seed)}`,
    })
  }
  const bigDays = keyDayItems.sort((a, b) => a.when.localeCompare(b.when))
  const keyDates = new Set(bigDays.map((i) => i.when))
  const goodPrefix = ko ? '좋은 날' : 'Good day'
  const bestPrefix = ko ? '최고의 날' : 'Best day'

  // ── 간지(甲午) — 표면에 노출(시안 의도). ──
  const ganjiHanja = month.woolun?.hanja ?? ''
  const ganjiRead = ko ? (month.woolun?.kr ?? '') : (month.woolun?.en ?? month.woolun?.kr ?? '')

  // ── 월운 십신(raw) — verdict-sub term-tag 에 그대로. ──
  const woolunSibsinRaw = month.woolunSibsin ? String(month.woolunSibsin) : ''
  const woolunArea = woolunSibsinRaw
    ? ko
      ? sibsinArea(woolunSibsinRaw)
      : sibsinAreaEn(woolunSibsinRaw)
    : ''

  // ── 이달의 겹치는 흐름 — 월운 십신 × 그 달 점성 페어. ──
  const monthCross = month.crossActivations ?? []
  // 가장 센(극성 절댓값 최대) 흐름 — hero 강조 + 풀이의 한 축.
  const topCross = [...monthCross].sort((a, b) => Math.abs(b.polarity) - Math.abs(a.polarity))[0]
  const topCrossMeaning = topCross
    ? ko
      ? topCross.meaning
      : (topCross.meaningEn ?? topCross.meaning)
    : ''

  // ── 이달 한 줄 총평 — 월운 분야 + 좋은/조심 날 + 가장 센 흐름 합성(쉬운말 2~3줄). ──
  const monthReading: string = (() => {
    const parts: string[] = []
    if (woolunArea) {
      parts.push(
        ko
          ? `이달은 ‘${woolunArea}’ 쪽으로 결이 기울어요.`
          : `This month leans toward ${woolunArea}.`
      )
    }
    if (goodN > 0 || cautionN > 0) {
      parts.push(
        ko
          ? `흐름이 트이는 날이 ${goodN}개, 한 박자 조심할 날이 ${cautionN + avoidN}개라 전체적으로 ${goodN >= cautionN + avoidN ? '순한 편이에요' : '기복이 있는 달이에요'}.`
          : `${goodN} day${goodN === 1 ? '' : 's'} open up while ${cautionN + avoidN} ask for care, so overall it reads ${goodN >= cautionN + avoidN ? 'fairly smooth' : 'a bit uneven'}.`
      )
    }
    if (topCrossMeaning) {
      parts.push(
        ko
          ? `가장 또렷한 흐름은 ‘${topCrossMeaning}’ — 큰 날의 색을 이 신호가 끌어요.`
          : `The clearest thread is "${topCrossMeaning}" — it sets the color of the key days.`
      )
    }
    return parts.join(' ')
  })()
  const verdictText =
    monthReading ||
    (ko
      ? `좋은 날 ${goodN}개, 조심할 날 ${cautionN + avoidN}개 — ${goodN >= cautionN + avoidN ? '순한 편의 달이에요.' : '기복이 있는 달이에요.'}`
      : `${goodN} good, ${cautionN + avoidN} for care — ${goodN >= cautionN + avoidN ? 'a fairly smooth month.' : 'an uneven month.'}`)

  // 'MM-DD' → 'M/D' (큰 날 날짜 라벨)
  const mdLabel = (ds: string) => {
    const dd = ds.split('-').pop() ?? ds
    return `${ymM ?? ''}/${Number(dd)}`
  }

  // ── readout — 선택된 날(기본=focusDay)의 셀 판정으로 라벨/문구를 결정. ──
  const [selectedDay, setSelectedDay] = useState<number>(focusDay)
  const selectedCell = calendar.find((c) => c.d === selectedDay)
  const selectedBigDay = bigDays.find((b) => {
    const dd = Number(b.when.split('-').pop())
    return Number.isFinite(dd) && dd === selectedDay
  })
  const selMark = selectedCell?.mark ?? null
  const selToday = !!selectedCell?.focus
  const readoutLabel = selectedBigDay
    ? selectedBigDay.title
    : selToday
      ? ko
        ? '오늘'
        : 'Today'
      : verdictPrefix(selMark)
  const readoutText = selectedBigDay
    ? ''
    : toneMeaningFor(markToTone(selMark), selectedDay, ko ? 'ko' : 'en', seed)
  // 태그 칩 텍스트 — today 가 우선.
  const readoutTag = selToday
    ? ko
      ? '오늘'
      : 'Today'
    : selMark === 'best' || selMark === 'good'
      ? ko
        ? '좋은 날'
        : 'good'
      : selMark === 'caution'
        ? ko
          ? '조심할 날'
          : 'caution'
        : selMark === 'avoid'
          ? ko
            ? '피하는 날'
            : 'avoid'
          : ko
            ? '잔잔한 날'
            : 'normal'
  const readoutTagClass = selToday
    ? styles.rtagToday
    : selMark === 'best' || selMark === 'good'
      ? styles.rtagGood
      : selMark === 'avoid'
        ? styles.rtagAvoid
        : ''

  // ── 셰어용 ── (한 줄 총평 + 큰 날 몇 개)
  const periodLabel = ko ? month.label : `${monthEn} ${year}`.trim()
  const summaryCard = (month.narrative ?? []).find((n) => n.tag === '이달 총평')
  const summaryText = ko ? summaryCard?.body : (summaryCard?.bodyEn ?? summaryCard?.body)
  const headline = (summaryText || verdictText || flowTitle).slice(0, 260)
  const shareHighlights = bigDays
    .slice(0, 4)
    .map((i) => (ko ? `${Number(i.when.slice(-2))}일 · ${i.title}` : `${i.when} · ${i.title}`))

  // ── 셀 클래스 결정 ──
  const cellMarkClass = (mark: DestinyDayMark | null): string | null => {
    if (mark === 'best' || mark === 'good') return styles.cellGood
    if (mark === 'caution') return styles.cellCaution
    if (mark === 'avoid') return styles.cellAvoid
    return null
  }

  return (
    <div className={styles.monthRoot}>
      {showRise && (
        <button type="button" className={styles.rise} onClick={onRise}>
          ↑ {ko ? '올해로 줌아웃' : 'Zoom out to year'}
        </button>
      )}

      {/* ── eyebrow ── */}
      <div className={styles.eyebrow}>
        <span>
          {ko ? '1달' : '1 Month'} · MONTHLY · {month.ym}
        </span>
        <span aria-hidden />
      </div>

      {/* ── ganzhi header ── */}
      <header className={styles.header}>
        <div className={styles.ganzhi}>{ganjiHanja}</div>
        {ganjiRead && <div className={styles.ganzhiRead}>{ko ? `${ganjiRead}월` : ganjiRead}</div>}
        <div className={styles.title}>
          {`${monthEn} ${year}`.trim()}
          <span className={styles.titleKo}>{flowTitle}</span>
        </div>
        <div className={styles.counts}>
          <span className={styles.cGood}>
            {ko ? '좋은 날' : 'good'}
            <b>{goodN}</b>
          </span>
          <span className={styles.cCare}>
            {ko ? '조심할 날' : 'caution'}
            <b>{cautionN}</b>
          </span>
          <span className={styles.cAvoid}>
            {ko ? '피하는 날' : 'avoid'}
            <b>{avoidN}</b>
          </span>
        </div>
      </header>

      {/* ── weekday row ── */}
      <div className={styles.dows}>
        {(ko ? DOWS : DOWS_EN).map((d, i) => (
          <span
            key={`dow-${i}`}
            className={i === 0 ? `${styles.dow} ${styles.dowSun}` : styles.dow}
          >
            {d}
          </span>
        ))}
      </div>

      {/* ── calendar grid ── */}
      <div className={styles.grid}>
        {Array.from({ length: firstDow }).map((_, i) => (
          <div key={`pad-${i}`} className={styles.cellPad} />
        ))}
        {calendar.map((c) => {
          const isBig = keyDates.has(c.ds)
          const markCls = cellMarkClass(c.mark)
          const cls = [
            styles.cell,
            !isBig && markCls,
            isBig && styles.cellBig,
            c.focus && styles.cellToday,
            c.d === selectedDay && styles.cellSel,
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <div
              key={c.d}
              className={cls}
              role="button"
              tabIndex={0}
              aria-label={ko ? `${c.d}일 자세히 보기` : `View day ${c.d}`}
              aria-pressed={c.d === selectedDay}
              onClick={() => setSelectedDay(c.d)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setSelectedDay(c.d)
                }
              }}
            >
              <span className={styles.num}>{c.d}</span>
              {isBig && (
                <span className={styles.star} aria-hidden>
                  ✦
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* ── readout panel — 선택된 날의 판정. 모든 날에 대해 생성됨. ── */}
      <div className={styles.readout}>
        <div className={styles.rday}>
          <span className={styles.rnum}>{selectedDay}</span>
          <span className={`${styles.rtag} ${readoutTagClass}`.trim()}>{readoutTag}</span>
        </div>
        <div className={styles.rlabel}>{readoutLabel}</div>
        {readoutText && <div className={styles.rtext}>{readoutText}</div>}
      </div>

      {/* ── legend ── */}
      <div className={styles.legend}>
        <span className={`${styles.lg} ${styles.lgGood}`}>
          <i />
          {ko ? '좋은 날' : 'Good day'}
        </span>
        <span className={`${styles.lg} ${styles.lgCare}`}>
          <i />
          {ko ? '조심할 날' : 'Caution'}
        </span>
        <span className={`${styles.lg} ${styles.lgAvoid}`}>
          <i />
          {ko ? '피하는 날' : 'Avoid'}
        </span>
        <span className={`${styles.lg} ${styles.lgToday}`}>
          <i />
          {ko ? '오늘' : 'Today'}
        </span>
        {bigDays.length > 0 && (
          <span className={`${styles.lg} ${styles.lgBig}`}>
            <i />
            {ko ? '큰 날' : 'Key day'}
          </span>
        )}
      </div>

      {/* ── 이달의 큰 날 ── */}
      {bigDays.length > 0 && (
        <section className={styles.sec}>
          <div className={styles.secH}>
            <span className={styles.secLbl}>{ko ? '이달의 큰 날' : 'Key days'}</span>
            <span className={styles.secLn} />
            <span className={styles.secLat}>Key days</span>
          </div>
          {bigDays.map((b) => {
            const isGood = b.title.startsWith(goodPrefix) || b.title.startsWith(bestPrefix)
            return (
              <div className={styles.bigday} key={b.when}>
                <span className={styles.bdStar} aria-hidden>
                  ✦
                </span>
                <span className={styles.bdDate}>{mdLabel(b.when)}</span>
                <span className={styles.bdName}>{b.title}</span>
                {isGood && <span className={styles.bdPill}>{ko ? '좋은 날' : 'Good'}</span>}
              </div>
            )
          })}
        </section>
      )}

      {/* ── 이달의 한 줄 (verdict) ── */}
      <section className={styles.sec}>
        <div className={styles.secH}>
          <span className={styles.secLbl}>{ko ? '이달의 한 줄' : 'In a line'}</span>
          <span className={styles.secLn} />
          <span className={styles.secLat}>In a line</span>
        </div>
        <p className={styles.verdict}>{verdictText}</p>
        {(ganjiHanja || woolunSibsinRaw) && (
          <div className={styles.verdictSub}>
            <span className={styles.termTag}>
              {[ganjiHanja, woolunSibsinRaw].filter(Boolean).join(' · ')}
            </span>
          </div>
        )}
      </section>

      {/* ── 겹치는 흐름 (crossings) ── */}
      {monthCross.length > 0 && (
        <section className={styles.sec}>
          <div className={styles.secH}>
            <span className={styles.secLbl}>{ko ? '겹치는 흐름' : 'Crossings'}</span>
            <span className={styles.secLn} />
            <span className={styles.secLat}>Crossings</span>
          </div>
          <div className={styles.crossLegend}>
            <span className={styles.clUp}>▲ {ko ? '도움이 되는 흐름' : 'Supporting flow'}</span>
            <span className={styles.clDn}>▼ {ko ? '부딪히는 흐름' : 'Clashing flow'}</span>
          </div>
          {monthCross.map((c, i) => {
            const isHero = topCross != null && c === topCross
            const poleSym = c.polarity > 0 ? '▲' : c.polarity < 0 ? '▼' : '·'
            const poleCls = c.polarity > 0 ? styles.poleUp : c.polarity < 0 ? styles.poleDn : ''
            const head = ko
              ? `${sibsinArea(c.saju)} × ${planetPlain(c.astro, true)}`
              : `${sibsinAreaEn(c.saju)} × ${planetPlain(c.astro, false)}`
            const body = ko ? c.meaning : (c.meaningEn ?? c.meaning)
            return (
              <div className={`${styles.cross} ${isHero ? styles.crossHero : ''}`.trim()} key={i}>
                <div className={styles.crossTop}>
                  <span className={`${styles.pole} ${poleCls}`.trim()} aria-hidden>
                    {poleSym}
                  </span>
                  <span className={`${styles.term} ${styles.termSaju}`}>
                    <span className={styles.termSys}>Saju</span>
                    <span className={styles.termNm}>{c.saju}</span>
                  </span>
                  <span className={styles.crossX} aria-hidden>
                    ×
                  </span>
                  <span className={`${styles.term} ${styles.termAstro}`}>
                    <span className={styles.termSys}>Astro</span>
                    <span className={styles.termNm}>{c.astro}</span>
                  </span>
                  {isHero && (
                    <span className={styles.crossFlag}>{ko ? '큰 날의 색' : 'Key-day color'}</span>
                  )}
                </div>
                <div className={styles.crossHead}>{head}</div>
                <div className={styles.crossBody}>{body}</div>
              </div>
            )
          })}
        </section>
      )}

      {/* ── share (discreet) ── */}
      <div className={styles.shareRow}>
        <ShareCalendarButton
          data={{ isKo: ko, periodLabel, headline, highlights: shareHighlights }}
        />
      </div>

      {/* ── CTA (zoom-in) ── */}
      <button className={styles.cta} onClick={() => onDive(focusDay)} type="button">
        {ko ? `오늘 ${ymM ?? ''}월 ${focusDay}일로 줌인 →` : `Zoom in to ${monthEn} ${focusDay}`}
      </button>
    </div>
  )
}
