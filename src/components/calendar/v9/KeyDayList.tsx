'use client'

/**
 * 02 / 큰 날 — 뷰모델의 구조 행(monthViewModel.keyDays: 날짜 · 요일 · 그리드 마크 · 판정 단어 · 엔진
 * 한 줄 · 지난 날 · 두 체계 모두 무겁다고 본 날 · '왜' 교차 행)을 그대로 그린다.
 *
 * - 판정 단어는 그리드 마크에서(FIX9b E5) — 그리드 칸과 목록이 같은 말을 한다.
 * - 끝 마크: 두 체계가 모두 무겁다고 본 날(bothSystems)만 방향 — 좋은 날·최고의 날 ▲, 조심·피할 날
 *   ▼, 그 밖 —. 한쪽만 본 날은 —(합의를 지어내지 않는다). 범례(XLegend)는 블록 맨 아래 한 번.
 * - 지난 날 줄은 --mute 글자(견본만 흐리게 — 글자 대비 4.5:1 유지). 다음에 올 큰 날(지나지 않은
 *   첫 줄)은 처음부터 펼쳐 '왜' 행을 보인다.
 *   지난 날을 펼치면 'PAST' 표지.
 */

import { useId, useState } from 'react'
import type { KeyDayRowVM } from '@/lib/calendar-view/monthViewModel'
import CrossCheckRow from '@/components/v9/CrossCheckRow'
import XLegend from '@/components/v9/XLegend'
import { MarkTriangle } from '@/components/v9/Glyph'
import { LEGEND, pick, type Lang } from '@/components/v9/v9Copy'
import { CAL_COPY } from './calendarCopy'
import { swatchClass } from './GridLegend'
import s from './calendar.module.css'
import k from './KeyDayList.module.css'

/** 끝 마크 — 두 체계 모두 무거운 날의 방향만. */
export function keyDayDirection(
  row: Pick<KeyDayRowVM, 'mark' | 'bothSystems'>
): 'up' | 'down' | null {
  if (!row.bothSystems) return null
  if (row.mark === 'good' || row.mark === 'best') return 'up'
  if (row.mark === 'caution' || row.mark === 'avoid') return 'down'
  return null
}

/** 처음부터 펼칠 줄 — 다음에 올 큰 날(지나지 않은 첫 줄). */
export function defaultExpandedKeyDay(rows: readonly KeyDayRowVM[]): string | null {
  return rows.find((r) => !r.past)?.ds ?? null
}

interface KeyDayListProps {
  rows: KeyDayRowVM[]
  locale: Lang
}

export default function KeyDayList({ rows, locale }: KeyDayListProps) {
  const uid = useId()
  const [open, setOpen] = useState<ReadonlySet<string>>(() => {
    const first = defaultExpandedKeyDay(rows)
    return new Set(first ? [first] : [])
  })
  const toggle = (ds: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(ds)) next.delete(ds)
      else next.add(ds)
      return next
    })

  return (
    <section className={s.sec} data-cal-section="key-days">
      <h2 className={s.sr}>{pick(CAL_COPY.secKeyDays, locale)}</h2>
      <div className={s.lr}>
        <span aria-hidden="true">
          {pick(CAL_COPY.keyDays, locale)}
          <i className={s.kd} aria-hidden="true" />
        </span>
        <span>{pick(CAL_COPY.dateRead, locale)}</span>
      </div>
      <div className={k.list} data-lang={locale}>
        {rows.map((r, i) => {
          const expanded = open.has(r.ds) && !!r.why
          const dir = keyDayDirection(r)
          const panelId = `${uid}-kd-${r.ds}`
          const head = (
            <>
              <span className={k.date}>
                <span className={k.dt}>{r.label}</span>
                <span className={k.wd}>{r.weekday}</span>
              </span>
              <span className={k.body}>
                <b className={k.verdict}>
                  <i className={swatchClass(r.mark)} aria-hidden="true" />
                  {r.verdict}
                </b>
                <span className={k.meaning}>{r.meaning}</span>
              </span>
              <span className={k.mk} data-dir={dir ?? 'none'}>
                {dir ? (
                  <MarkTriangle dir={dir} />
                ) : (
                  <span className={k.dash} aria-hidden="true">
                    —
                  </span>
                )}
                <span className={s.sr}>
                  {dir
                    ? pick(dir === 'up' ? LEGEND.favorable : LEGEND.adverse, locale)
                    : pick(CAL_COPY.noMark, locale)}
                </span>
              </span>
            </>
          )
          return (
            <div
              key={r.ds}
              className={[k.row, i === 0 ? k.first : '', r.past ? k.past : '']
                .filter(Boolean)
                .join(' ')}
              data-ds={r.ds}
              data-mark={r.mark}
              data-past={r.past ? '' : undefined}
              data-today={r.isToday ? '' : undefined}
              data-expanded={expanded ? '' : undefined}
            >
              {r.why ? (
                <button
                  type="button"
                  className={k.head}
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  onClick={() => toggle(r.ds)}
                >
                  {head}
                </button>
              ) : (
                <div className={k.head}>{head}</div>
              )}
              {expanded && r.why ? (
                <div className={k.exp} id={panelId}>
                  {r.past || r.isToday ? (
                    <span className={k.tag} data-tag={r.isToday ? 'today' : 'past'}>
                      {r.isToday ? <i className={s.led} aria-hidden="true" /> : null}
                      {pick(r.isToday ? CAL_COPY.today : CAL_COPY.past, locale)}
                    </span>
                  ) : null}
                  <CrossCheckRow
                    kind="timing"
                    first
                    saju={r.why.saju}
                    stars={r.why.stars}
                    mark={r.why.mark}
                    note={r.why.note}
                    locale={locale}
                  />
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
      <XLegend locale={locale} className={s.xlegend} />
    </section>
  )
}
