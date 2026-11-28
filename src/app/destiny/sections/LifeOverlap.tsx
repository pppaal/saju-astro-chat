/**
 * 01 이번 10년의 겹침 — 대운(10년) 부모와 긴 주기 천체 부모가 같은 부호로 맞을 때만 생기는
 * 교차 행(엔진 정직성 게이트). 행이 있으면 교차 행 + 블록 맨 아래 범례 한 번 + 트랜짓 캡션,
 * 없으면 정직한 빈 상태(오너 결정 13 — 채움 행을 지어내지 않는다). 서버 컴포넌트.
 */

import CrossCheckRow, { CrossCheckList } from '@/components/v9/CrossCheckRow'
import XLegend from '@/components/v9/XLegend'
import { pick, type Lang } from '@/components/v9/v9Copy'
import type { LifeOverlapVM } from '@/lib/calendar-view/lifetimeViewModel'
import { LIFE_COPY } from '../lifeCopy'
import HanjaText from './HanjaText'
import s from '../LifeFlow.module.css'

export default function LifeOverlap({ overlap, locale }: { overlap: LifeOverlapVM; locale: Lang }) {
  const empty = overlap.rows.length === 0
  return (
    <section
      className={s.sec}
      data-life-section="overlap"
      data-empty={empty ? '' : undefined}
      aria-labelledby="life-overlap"
    >
      <div className={s.lr}>
        <span>{pick(LIFE_COPY.overlapLabel, locale)}</span>
        {overlap.rangeLabel ? <span>{overlap.rangeLabel}</span> : null}
      </div>
      <h2 id="life-overlap" className={s.h2}>
        {pick(LIFE_COPY.overlapTitle, locale)}
      </h2>
      {empty ? (
        <p className={s.empty} data-overlap-empty="">
          {overlap.empty}
        </p>
      ) : (
        <>
          <CrossCheckList className={s.xlist}>
            {overlap.rows.map((r, i) => (
              <CrossCheckRow
                key={`${r.saju.text}-${r.stars.text}-${i}`}
                kind="timing"
                first={i === 0}
                locale={locale}
                saju={r.saju}
                stars={r.stars}
                mark={r.mark}
                note={r.note}
              />
            ))}
          </CrossCheckList>
          <XLegend locale={locale} className={s.xlegend} />
          {overlap.caption ? (
            <p className={s.cap}>
              <HanjaText text={overlap.caption} />
            </p>
          ) : null}
        </>
      )}
    </section>
  )
}
