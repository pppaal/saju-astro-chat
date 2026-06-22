'use client'

/* ============================================================
   destinypal · MonthTier — 1달(月運) "이 달의 모양" 카드 · 쉬운말 우선
   ────────────────────────────────────────────────────────────
   재설계 원칙(시안 · jargon-free "이 달의 모양"):
     · 제목 "N월의 모양" + 한 줄 요약(쉬운말) — 전문용어를 주 화면에서 뺀다.
     · 색 그리드는 유지(좋음/주의/피함 밑줄). 셀 숫자 배지·점수 없음.
       눈에 띄는 "큰 날"만 도장 점(seal) + 오늘 링으로 소수만 표시.
       범례는 잔잔→좋음 + 좋은날/조심할날 점.
     · "이 달의 큰 날" — 판정어 + 뜻만. 신뢰(confidence) 숫자 제거 →
       필요하면 강도를 *말*로(강하게 겹침 등), 숫자 없음.
       "사주+점성/四柱" 시스템 배지 → 중립 "겹치는 흐름".
     · 간지 한자 도장(甲午)·월운 읽기·"사주 · 四柱" 태그·"정재 × 금성" 용어
       칩은 주 화면에서 제거. 간지는 "자세한 신호 보기" 폴드 안에만.

   살아있는 데이터만 사용:
     month.{ym,label,woolun,calendar[].{d,ds,mark,focus},focusDay,
            goodDays,cautionDays,avoidDays,bestDay,keyDays,narrative,
            crossActivations,seed}
   ============================================================ */

import type { DestinyMonth, DestinyDayMark } from '@/types/calendar'
import styles from './MonthTier.module.css'
import { useI18n } from '@/i18n/I18nProvider'
import { toneMeaningFor, type MeaningTone } from '@/lib/calendar-engine/derivers/toneMeaning'
import { sibsinArea, sibsinAreaEn, planetPlain } from '@/lib/calendar-engine/derivers/plainLanguage'
import {
  TierFrame,
  RiseButton,
  Eyebrow,
  TierHero,
  Band,
  MoreFold,
  WhyList,
  type WhyItem,
} from '@/components/calendar/layout/TierFrame'

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

  // 1달 제목 — ko: "6월의 모양" / en: "The shape of June"
  const ymM = Number(month.ym.split('-')[1])
  const monthEn = MONTH_EN[(ymM ?? 1) - 1] ?? ''
  const flowTitle = ko ? `${ymM ?? ''}월의 모양` : `The shape of ${monthEn}`.trim()

  const goodN = month.goodDays?.length ?? 0
  const cautionN = month.cautionDays?.length ?? 0
  const avoidN = month.avoidDays?.length ?? 0
  // 개인 시드 — 큰 날 문구를 사람마다 다르게 회전(같은 날·톤이라도 본명 다르면 다른 줄).
  const seed = month.seed ?? 0

  // ── 이달의 큰 날 (사주×점성 수렴) — 제목 톤을 달력 셀 판정과 같은 소스로 맞춘다 ──
  // (점수 색과 의미 톤이 어긋나지 않게: 셀이 '주의'면 의미도 '주의할 날'.)
  const markByDs = new Map<string, DestinyDayMark | null>(calendar.map((c) => [c.ds, c.mark]))
  const verdictPrefix = (m: DestinyDayMark | null): string | null => {
    if (m === 'best' || m === 'good') return ko ? '좋은 날' : 'Good day'
    if (m === 'caution') return ko ? '조심할 날' : 'Caution'
    if (m === 'avoid') return ko ? '피할 날' : 'Avoid'
    return null
  }
  const markToTone = (m: DestinyDayMark | null): MeaningTone | null => {
    if (m === 'best' || m === 'good') return 'positive'
    if (m === 'caution' || m === 'avoid') return 'negative'
    if (m === 'converge') return 'neutral'
    return null
  }
  // ISO('YYYY-MM-DD…') → 'M/D' (수렴 구간 라벨). 빈/동일 경계면 null.
  const isoMd = (iso?: string) =>
    iso ? `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}` : ''
  const fmtWindow = (w?: { start: string; peak: string; end: string }): string | null => {
    if (!w) return null
    const s = isoMd(w.start)
    const e = isoMd(w.end)
    if (!s || !e || s === e) return null
    return `${s}–${e}`
  }
  interface BigDay {
    when: string
    title: string
    /** 두 흐름이 겹치는 날 — 숫자 신뢰 대신 *말*로 표현. */
    overlap: boolean
    window: string | null
  }
  const keyDayItems: BigDay[] = [...(month.keyDays ?? [])].map((k) => {
    const mark = markByDs.get(k.date) ?? null
    const tone = markToTone(mark)
    const dayNum = parseInt(k.date.slice(-2), 10)
    const meaning = tone
      ? toneMeaningFor(tone, dayNum, ko ? 'ko' : 'en', seed)
      : k.meaning || (k.bothSystems ? (ko ? '신호가 겹치는 날' : 'signals overlap') : '')
    const vp = verdictPrefix(mark)
    const title =
      vp && meaning ? `${vp} · ${meaning}` : meaning || vp || (ko ? '주목할 날' : 'Notable day')
    return {
      when: k.date,
      title,
      overlap: !!k.bothSystems,
      window: fmtWindow(k.window),
    }
  })
  // best(최고)일이 큰 날 목록에 빠졌으면 채워 넣는다.
  if (month.bestDay?.date && !keyDayItems.some((i) => i.when === month.bestDay.date)) {
    const dn = parseInt(month.bestDay.date.slice(-2), 10)
    keyDayItems.push({
      when: month.bestDay.date,
      title: `${ko ? '최고의 날' : 'Best day'} · ${toneMeaningFor('positive', dn, ko ? 'ko' : 'en', seed)}`,
      overlap: false,
      window: null,
    })
  }
  const bigDays = keyDayItems.sort((a, b) => a.when.localeCompare(b.when))
  const keyDates = new Set(bigDays.map((i) => i.when))

  // ── 이달 총평 — 정본 태그 '이달 총평'으로 찾고, body(ko)/bodyEn(en) 로케일 선택. ──
  const summaryCard = (month.narrative ?? []).find((n) => n.tag === '이달 총평')

  // ── 이달의 사주 × 점성 교차 — 월운 십신 × 그 달 점성(monthly 층 페어). ──
  const monthCross = month.crossActivations ?? []

  // 간지(갑오) — 주 화면에서 뺀 전문 신호. "자세한 신호 보기" 폴드 안에만.
  const ganjiHanja = month.woolun?.hanja ?? ''
  const ganjiRead = ko ? (month.woolun?.kr ?? '') : (month.woolun?.en ?? month.woolun?.kr ?? '')
  const hasGanji = !!ganjiHanja || !!ganjiRead

  // ── 이달 풀이 — 쉬운말 합성 해석 2~3줄. 새 계산 없음: 월운 십신(주된 분야) +
  //    좋은/조심 날 개수 + 가장 센 겹치는 흐름을 묶어 잔잔한 한 단락으로. ──
  const woolunSibsinRaw = month.woolunSibsin ? String(month.woolunSibsin) : ''
  const woolunArea = woolunSibsinRaw
    ? ko
      ? sibsinArea(woolunSibsinRaw)
      : sibsinAreaEn(woolunSibsinRaw)
    : ''
  // 가장 센(극성 절댓값 최대) 겹치는 흐름 — 풀이의 한 축.
  const topCross = [...monthCross].sort((a, b) => Math.abs(b.polarity) - Math.abs(a.polarity))[0]
  const topCrossMeaning = topCross
    ? ko
      ? topCross.meaning
      : (topCross.meaningEn ?? topCross.meaning)
    : ''
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

  // ── 왜 이렇게 보나 (근거) — 실제 전문용어 신호 → 쉬운 결론. fold 전용. ──
  // 새 계산 없음: 이미 이달 props 에 있는 월 간지·십신·겹치는 흐름을 용어 그대로 묶는다.
  const whyItems: WhyItem[] = []
  if (ganjiHanja || woolunSibsinRaw) {
    const term = [
      ko ? '월 간지' : 'Month pillar',
      ganjiHanja,
      woolunSibsinRaw ? `· ${woolunSibsinRaw}` : '',
    ]
      .filter(Boolean)
      .join(' ')
    whyItems.push({
      term,
      because: woolunArea
        ? ko
          ? `이 달의 바탕이 ‘${woolunArea}’ 기운으로 깔립니다.`
          : `${woolunArea} sets the base of the month.`
        : ko
          ? '이 달의 바탕이 되는 기운입니다.'
          : 'the base energy of the month.',
      tone: 'neutral',
    })
  }
  for (const c of [...monthCross]
    .sort((a, b) => Math.abs(b.polarity) - Math.abs(a.polarity))
    .slice(0, 3)) {
    const sign = c.polarity > 0 ? '＋' : c.polarity < 0 ? '－' : ''
    whyItems.push({
      term: `${c.saju} × ${c.astro}${sign ? ` (${sign})` : ''}`,
      because: ko ? c.meaning : (c.meaningEn ?? c.meaning),
      tone: c.polarity > 0 ? 'positive' : c.polarity < 0 ? 'caution' : 'neutral',
    })
  }

  // 'MM-DD' → 'M/D' (큰 날 날짜 라벨)
  const mdLabel = (ds: string) => {
    const [, dd] = ds.split('-')
    return `${ymM ?? ''}/${Number(dd)}`
  }

  // 한 줄 요약(쉬운말) — 히어로 sub 로. 좋은 날/조심할 날/피하는 날 개수.
  const summaryLine = ko ? (
    <>
      좋은 날 <b>{goodN}개</b> · 조심할 날 <b>{cautionN}개</b> · 피하는 날 <b>{avoidN}개</b>
    </>
  ) : (
    <>
      <b>{goodN}</b> good · <b>{cautionN}</b> caution · <b>{avoidN}</b> avoid
    </>
  )

  return (
    <TierFrame screenLabel={`1달 ${month.ym}`}>
      {showRise && (
        <RiseButton label={ko ? '올해로 줌아웃' : 'Zoom out to year'} onClick={onRise} />
      )}

      <Eyebrow>
        {ko ? '1달' : '1 Month'} · Monthly · {month.ym}
      </Eyebrow>

      {/* ── Hero — "N월의 모양" + 한 줄 요약(좋은/조심/피하는 날 개수). ── */}
      <TierHero lead={flowTitle} sub={summaryLine} />

      {/* ── 핵심 1 — 색 달력 그리드 + 잔잔→좋음 범례 (이 티어의 시그니처 비주얼). ── */}
      <Band title={ko ? '이달 달력' : 'Calendar'}>
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

        {/* ===== legend — 잔잔→좋음 + 좋은날/조심할날 점 ===== */}
        <div className={styles.legend}>
          <span className={styles.legScale}>{ko ? '잔잔' : 'Calm'}</span>
          <span className={styles.legBar} aria-hidden />
          <span className={styles.legScale}>{ko ? '좋음' : 'Good'}</span>
          <span className={styles.legItem}>
            <span className={`${styles.swatch} ${styles.swatchGood}`} />
            {ko ? '좋은 날' : 'Good day'}
          </span>
          <span className={styles.legItem}>
            <span className={`${styles.swatch} ${styles.swatchCaution}`} />
            {ko ? '조심할 날' : 'Caution'}
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
      </Band>

      {/* ===== 핵심 2 — 이달의 큰 날 (판정 + 뜻만 · 신뢰 숫자 없음) ===== */}
      {bigDays.length > 0 && (
        <Band title={ko ? '이달의 큰 날' : 'Key days this month'}>
          <div className={styles.bigDays}>
            {bigDays.map((b) => (
              <div className={styles.bigDay} key={b.when}>
                <span className={styles.bigDayDate}>{mdLabel(b.when)}</span>
                <div className={styles.bigDayMain}>
                  <span className={styles.bigDayTxt}>{b.title}</span>
                  {(b.overlap || b.window) && (
                    <div className={styles.bigDayMeta}>
                      {b.overlap && (
                        <span className={styles.bigDayOverlap}>
                          {ko ? '겹치는 흐름' : 'Overlapping flows'}
                        </span>
                      )}
                      {b.window && (
                        <span className={styles.bigDayWindow}>
                          {ko ? `${b.window} 흐름` : b.window}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Band>
      )}

      {/* ===== 핵심 3 — 이달의 겹치는 흐름 (쉬운말 area × planet 쌍만) ===== */}
      {monthCross.length > 0 && (
        <Band title={ko ? '이달의 겹치는 흐름' : 'Overlapping flows this month'}>
          <div className={styles.mcross}>
            {monthCross.map((c, i) => (
              <div className={styles.mcrossRow} key={i}>
                <span
                  className={`${styles.mcrossPair} ${c.polarity >= 0 ? styles.mcrossPos : styles.mcrossNeg}`}
                >
                  {ko
                    ? `${sibsinArea(c.saju)} × ${planetPlain(c.astro, true)}`
                    : `${sibsinAreaEn(c.saju)} × ${planetPlain(c.astro, false)}`}
                </span>
                <span className={styles.mcrossMeaning}>
                  {ko ? c.meaning : (c.meaningEn ?? c.meaning)}
                </span>
              </div>
            ))}
          </div>
        </Band>
      )}

      {/* ── 더 보기 — 쉬운말 보조(이달 총평·이달 풀이)를 접어서 위계상 아래로 내림. ── */}
      {((summaryCard && (summaryCard.body || summaryCard.bodyEn)) || monthReading) && (
        <MoreFold label={ko ? '이달 더 자세히' : 'More about this month'}>
          {/* ===== 이달 총평 ===== */}
          {summaryCard && (summaryCard.body || summaryCard.bodyEn) && (
            <div className={styles.card}>
              <div className={styles.cardLabel}>{ko ? '이달 총평' : 'This month'}</div>
              <p className={styles.cardBody}>
                {ko ? summaryCard.body : (summaryCard.bodyEn ?? summaryCard.body)}
              </p>
            </div>
          )}

          {/* ===== 이달 풀이 — 월운 분야 + 좋은/조심 날 + 가장 센 흐름 합성 해석 ===== */}
          {monthReading && (
            <div className={styles.card}>
              <div className={styles.cardLabel}>{ko ? '이달 풀이' : 'How it reads'}</div>
              <p className={styles.cardBody}>{monthReading}</p>
            </div>
          )}
        </MoreFold>
      )}

      {/* ===== 자세한 신호 보기 (근거 + 간지 등 전문 신호는 폴드 안에만) ===== */}
      {(hasGanji || whyItems.length > 0) && (
        <details className={styles.details}>
          <summary className={styles.detailsSummary}>
            {ko ? '자세한 신호 보기' : 'See detailed signals'}
          </summary>
          <div className={styles.detailsBody}>
            {/* 왜 이렇게 보나 — 실제 용어 신호 → 쉬운 결론(근거). 표면 쉬운말의 출처. */}
            <WhyList title={ko ? '왜 이렇게 보나' : 'Why it reads this way'} items={whyItems} />
            {hasGanji && (
              <div className={styles.ganjiRow}>
                <span className={styles.ganjiLabel}>
                  {ko ? '이 달의 간지' : "This month's ganji"}
                </span>
                <span className={styles.ganjiVal}>
                  {ganjiHanja}
                  {ganjiRead && <span className={styles.ganjiRead}> · {ganjiRead}</span>}
                </span>
              </div>
            )}
          </div>
        </details>
      )}

      {/* ===== dive (줌인) ===== */}
      <button className={styles.dive} onClick={() => onDive(focusDay)} type="button">
        {ko ? `오늘 ${ymM ?? ''}월 ${focusDay}일로 줌인` : `Zoom in to ${monthEn} ${focusDay}`}
        <span className={styles.diveArrow}>↓</span>
      </button>
    </TierFrame>
  )
}
