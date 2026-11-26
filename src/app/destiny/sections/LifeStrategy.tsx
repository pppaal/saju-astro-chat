/**
 * 06 전략 — 한 판 안의 판독 넷: 행운의 색(용신 오행) · 방향 · 숫자, 나를 돕는 띠(천을귀인 —
 * 지지 타일), 재물을 쌓는 방식, 조심할 해(곡선 저점 그대로). 근거 없는 칸은 빠진다. 서버 컴포넌트.
 */

import ElementTile from '@/components/v9/ElementTile'
import { fill, pick, type Lang } from '@/components/v9/v9Copy'
import type { LifeStrategyVM } from '@/lib/calendar-view/lifetimeViewModel'
import { LIFE_COPY } from '../lifeCopy'
import HanjaText from './HanjaText'
import s from '../LifeFlow.module.css'

export default function LifeStrategy({
  strategy,
  locale,
}: {
  strategy: LifeStrategyVM
  locale: Lang
}) {
  const { lucky, allies, wealth, watch } = strategy
  if (!lucky && !allies && !wealth && !watch) return null
  return (
    <section className={s.sec} data-life-section="strategy" aria-labelledby="life-strategy">
      <div className={s.lr}>
        <span>{pick(LIFE_COPY.strategyLabel, locale)}</span>
        <span>{pick(LIFE_COPY.strategyNote, locale)}</span>
      </div>
      <h2 id="life-strategy" className={s.h2}>
        {strategy.heading}
      </h2>
      <div className={`${s.panel} ${s.odds}`}>
        {lucky ? (
          <div className={s.od} data-strategy="lucky">
            <span className={s.k}>
              <HanjaText text={lucky.label} />
            </span>
            {lucky.colors ? <h3 className={s.h3}>{lucky.colors}</h3> : null}
            {lucky.direction || lucky.numbers ? (
              <div className={s.facts}>
                {lucky.direction ? (
                  <div>
                    <span className={s.k}>{pick(LIFE_COPY.direction, locale)}</span>
                    <span className={s.x}>{lucky.direction}</span>
                  </div>
                ) : null}
                {lucky.numbers ? (
                  <div>
                    <span className={s.k}>{pick(LIFE_COPY.numbers, locale)}</span>
                    <span className={s.x}>{lucky.numbers}</span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
        {allies ? (
          <div className={s.od} data-strategy="allies">
            <div className={s.hd}>
              <div>
                <span className={s.k}>{pick(LIFE_COPY.allies, locale)}</span>
                <h3 className={s.h3}>{allies.animals}</h3>
              </div>
              <div className={s.pair}>
                {allies.tiles.map((t) => (
                  <ElementTile key={t.ch} char={t.ch} element={t.el} />
                ))}
              </div>
            </div>
            <p>
              <HanjaText text={allies.note} />
            </p>
          </div>
        ) : null}
        {wealth ? (
          <div className={s.od} data-strategy="wealth">
            <span className={s.k}>{pick(LIFE_COPY.wealth, locale)}</span>
            <h3 className={s.h3}>{wealth.h3}</h3>
            {wealth.p ? <p>{wealth.p}</p> : null}
          </div>
        ) : null}
        {watch ? (
          <div className={s.od} data-strategy="watch">
            <span className={s.k}>{pick(LIFE_COPY.watchYears, locale)}</span>
            <div className={`${s.facts} ${s.yrs}`}>
              {watch.years.map((y) => (
                <div key={y.year}>
                  <span className={`${s.x} ${s.big}`}>
                    {fill(pick(LIFE_COPY.age, locale), { n: y.age })}
                  </span>
                  <span className={s.g}>{y.year}</span>
                </div>
              ))}
            </div>
            <p>{watch.note}</p>
          </div>
        ) : null}
      </div>
    </section>
  )
}
