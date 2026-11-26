/**
 * 해 볼 것 — PUSH(오늘 이후 좋은 날, 최고의 날 우선) · HOLD(오늘 이후 피할 날 먼저) 두 칸 판독.
 * 날짜·문구는 뷰모델(pickTryThis — 지난 날은 짚지 않는다). 빈 쪽은 숨기고, 둘 다 없으면 블록 자체를
 * 그리지 않는다. 서버·클라이언트 공용.
 */

import type { MonthViewModel } from '@/lib/calendar-view/monthViewModel'
import { pick, type Lang } from '@/components/v9/v9Copy'
import { CAL_COPY } from './calendarCopy'
import s from './calendar.module.css'

export default function TryThis({
  tryThis,
  locale,
}: {
  tryThis: MonthViewModel['tryThis']
  locale: Lang
}) {
  const { push, hold } = tryThis
  if (!push && !hold) return null
  const corner =
    push && hold
      ? pick(CAL_COPY.pushHold, locale)
      : pick(push ? CAL_COPY.push : CAL_COPY.hold, locale)
  return (
    <section className={s.try} data-cal-section="try">
      <div className={s.lr}>
        <span>{pick(CAL_COPY.tryThis, locale)}</span>
        <span>{corner}</span>
      </div>
      <div className={s.ros}>
        {push ? (
          <div className={s.ro} data-try="push" data-ds={push.ds}>
            <span className={s.roL}>{pick(CAL_COPY.push, locale)}</span>
            <span className={s.roV}>{push.label}</span>
            <span className={s.roNt}>{push.note}</span>
          </div>
        ) : null}
        {hold ? (
          <div className={s.ro} data-try="hold" data-ds={hold.ds}>
            <span className={s.roL}>{pick(CAL_COPY.hold, locale)}</span>
            <span className={s.roV}>{hold.label}</span>
            <span className={s.roNt}>{hold.note}</span>
          </div>
        ) : null}
      </div>
    </section>
  )
}
