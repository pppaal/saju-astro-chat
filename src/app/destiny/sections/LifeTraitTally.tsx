/**
 * 02 축별 교차 — 리포트와 같은 판정(buildCrossRows · tallyCrossRows)을 LLM 없이: 4칸 집계
 * 막대 + 축 행(판정은 행 끝 mono 라벨) + 전체 리포트 링크('N traits in your full report →',
 * N 은 리포트의 축 수 — 결핍 축 포함). 서버 컴포넌트.
 */

import Link from 'next/link'
import CrossCheckRow, { CrossCheckList } from '@/components/v9/CrossCheckRow'
import Tally from '@/components/v9/Tally'
import { pick, type Lang } from '@/components/v9/v9Copy'
import type { LifeTraitsVM } from '@/lib/calendar-view/lifetimeViewModel'
import { LIFE_COPY } from '../lifeCopy'
import { ArrowIcon } from './icons'
import s from '../LifeFlow.module.css'

export default function LifeTraitTally({ traits, locale }: { traits: LifeTraitsVM; locale: Lang }) {
  return (
    <section className={s.sec} data-life-section="traits" aria-labelledby="life-traits">
      <div className={s.lr}>
        <span>{pick(LIFE_COPY.traitsLabel, locale)}</span>
        <span>{traits.countLabel}</span>
      </div>
      <h2 id="life-traits" className={s.h2}>
        {pick(LIFE_COPY.traitsTitleA, locale)}
        <br />
        {pick(LIFE_COPY.traitsTitleB, locale)}
      </h2>
      <Tally counts={traits.tally} locale={locale} className={s.tally} />
      <CrossCheckList className={s.xlistTrait}>
        {traits.rows.map((r, i) => (
          <CrossCheckRow
            key={r.key}
            kind="trait"
            first={i === 0}
            locale={locale}
            axis={r.axis}
            verdict={r.verdict}
            saju={r.saju}
            stars={r.stars}
            phrase={r.phrase}
          />
        ))}
      </CrossCheckList>
      <Link href={traits.fullReportHref} className={s.xmore} prefetch={false}>
        <span>{traits.moreLabel}</span>
        <ArrowIcon />
      </Link>
    </section>
  )
}
