/**
 * 히어로 — 먹 띠: 까치 한 줄 + 算 도장, 모서리 줄(인생 모양 · 인생 읽기 범위), 인생 모양 이름
 * (영어는 마지막 단어만 세리프 이탤릭 — 유형 이름이라 허용된 두 자리 중 하나), 태그 리드,
 * 일주 한 줄(일간 타일 + 일주 아키타입), NOW / NEXT LIFE TURN 판독 칸. 서버 컴포넌트.
 */

import KkachiMark from '@/components/branding/KkachiMark'
import ElementTile from '@/components/v9/ElementTile'
import { fill, pick, PROVENANCE, type ElementKey, type Lang } from '@/components/v9/v9Copy'
import type { LifeHeroVM } from '@/lib/calendar-view/lifetimeViewModel'
import { LIFE_COPY } from '../lifeCopy'
import s from '../LifeFlow.module.css'

export interface LifeRiver {
  /** 굵은 첫 문장 — 'A great river on dry ground — deep and responsible.' */
  head: string
  /** 나머지 — 'You hold the flow and the weight together.' */
  body: string
}

/** 일주 아키타입 한 줄 → 굵은 첫 문장 + 나머지('… responsible.' / 'You hold …'). */
export function splitRiver(character: string | undefined): LifeRiver | null {
  const text = (character ?? '').trim()
  if (!text) return null
  const m = /^(.+?[.!?])\s+(.+)$/.exec(text)
  return m ? { head: m[1], body: m[2] } : { head: text, body: '' }
}

interface LifeHeroProps {
  hero: LifeHeroVM
  dayMaster: { stem: string; element: ElementKey }
  river: LifeRiver | null
  locale: Lang
}

export default function LifeHero({ hero, dayMaster, river, locale }: LifeHeroProps) {
  const age = (n: number) => fill(pick(LIFE_COPY.age, locale), { n })
  return (
    <section className={`${s.band} ${s.hero}`} data-life-section="hero" aria-labelledby="life-h1">
      <div className={s.hby}>
        <KkachiMark size={24} light="var(--ink)" className={s.av} />
        <span>{pick(LIFE_COPY.byline, locale)}</span>
        <span className={s.stamp}>
          {pick(LIFE_COPY.computed, locale)}
          <span className={s.seal} role="img" aria-label={pick(PROVENANCE.seal, locale)}>
            算
          </span>
        </span>
      </div>
      <div className={`${s.lr} ${s.lrDark}`}>
        <span>{pick(LIFE_COPY.lifeShape, locale)}</span>
        <span>{fill(pick(LIFE_COPY.lifetimeRead, locale), { range: hero.range.label })}</span>
      </div>
      <h1 id="life-h1" className={s.type}>
        {hero.h1.lead ? (
          <>
            {hero.h1.lead}
            <br />
          </>
        ) : null}
        <i>{hero.h1.last}</i>
      </h1>
      {hero.lede ? <p className={s.lede}>{hero.lede}</p> : null}
      {river ? (
        <div className={s.river}>
          <ElementTile
            char={dayMaster.stem}
            element={dayMaster.element}
            size="lg"
            keyRing
            className={s.riverTile}
          />
          <div>
            <b>{river.head}</b>
            {river.body ? <span>{river.body}</span> : null}
          </div>
        </div>
      ) : null}
      <div className={[s.ros, hero.nextTurn ? s.two : ''].filter(Boolean).join(' ')}>
        <div className={s.ro} data-readout="now">
          <span className={s.l}>{pick(LIFE_COPY.now, locale)}</span>
          <span className={s.v}>
            {age(hero.now.age)}
            <i className={s.led} aria-hidden="true" />
          </span>
          <span className={s.y}>{hero.now.year}</span>
          {hero.now.note ? <span className={s.nt}>{hero.now.note}</span> : null}
        </div>
        {hero.nextTurn ? (
          <div className={s.ro} data-readout="next-life-turn">
            <span className={s.l}>{pick(LIFE_COPY.nextLifeTurn, locale)}</span>
            <span className={s.v}>{age(hero.nextTurn.age)}</span>
            <span className={s.y}>{hero.nextTurn.year}</span>
            {hero.nextTurn.note ? <span className={s.nt}>{hero.nextTurn.note}</span> : null}
          </div>
        ) : null}
      </div>
    </section>
  )
}
