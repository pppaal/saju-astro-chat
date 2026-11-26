/**
 * 읽기 — 인생 모양 서사의 첫 문장(인용 머리)과 나머지. 엔진 템플릿(lifePattern lead/body)이라
 * 'AI' 라벨을 달지 않는다(FIX9b E8): 모서리 줄은 'Reading · Computed from your chart · same
 * every time'. 서버 컴포넌트.
 */

import { pick, type Lang } from '@/components/v9/v9Copy'
import type { LifeReadingVM } from '@/lib/calendar-view/lifetimeViewModel'
import { LIFE_COPY } from '../lifeCopy'
import s from '../LifeFlow.module.css'

export default function LifeReading({ reading, locale }: { reading: LifeReadingVM; locale: Lang }) {
  return (
    <section className={`${s.sec} ${s.read}`} data-life-section="reading">
      <div className={s.lr}>
        <span>{pick(LIFE_COPY.readingLabel, locale)}</span>
        <span>{pick(LIFE_COPY.readingNote, locale)}</span>
      </div>
      <p className={s.q}>{reading.lead}</p>
      {reading.body ? <p>{reading.body}</p> : null}
    </section>
  )
}
