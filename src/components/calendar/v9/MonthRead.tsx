/**
 * 한 달 읽기 + 날 수 — 히어로 띠 안. 읽기 = 톤 단어 · 월운 영역('A mixed month · toward duty &
 * standing'), 날 수 = verdict 단일 권위(좋음 · 조심 · 피함 · 잔잔 — 잔잔 = 엔진의 중립 단어 Calm).
 * 라벨은 뷰모델 범례 라벨, 견본은 그리드와 같은 부호(먹 위 판). 서버·클라이언트 공용.
 */

import type { MonthViewModel } from '@/lib/calendar-view/monthViewModel'
import { pick, type Lang } from '@/components/v9/v9Copy'
import { CAL_COPY } from './calendarCopy'
import s from './calendar.module.css'

const COUNT_KEYS = ['good', 'caution', 'avoid', 'calm'] as const

const SWATCH_DARK: Record<(typeof COUNT_KEYS)[number], string> = {
  good: s.swGood,
  caution: s.swCaution,
  avoid: s.swAvoid,
  calm: '',
}

interface MonthReadProps {
  read: MonthViewModel['read']
  counts: MonthViewModel['counts']
  countsLine: string
  legend: MonthViewModel['legend']
  locale: Lang
}

export default function MonthRead({ read, counts, countsLine, legend, locale }: MonthReadProps) {
  const label = (k: string) => legend.find((l) => l.key === k)?.label ?? k
  return (
    <>
      <div className={s.read} data-cal-read="">
        <span className={s.rdL}>{pick(CAL_COPY.monthRead, locale)}</span>
        <span className={s.rdV}>
          {read.area ? (
            <>
              <span className={s.nw}>{read.tone}&nbsp;·</span> <span>{read.area}</span>
            </>
          ) : (
            read.tone
          )}
        </span>
      </div>
      <div className={`${s.lr} ${s.lrDark} ${s.cnt}`}>
        <span>{pick(CAL_COPY.days, locale)}</span>
        <span>{countsLine}</span>
      </div>
      <dl className={s.counts} aria-label={pick(CAL_COPY.countsAria, locale)}>
        {COUNT_KEYS.map((k) => (
          <div key={k} className={s.count} data-count={k}>
            <dt className={s.countL}>{label(k)}</dt>
            <dd className={s.countV}>
              {counts[k]}
              <i
                className={[s.sw, s.swDark, SWATCH_DARK[k]].filter(Boolean).join(' ')}
                aria-hidden="true"
              />
            </dd>
          </div>
        ))}
      </dl>
    </>
  )
}
