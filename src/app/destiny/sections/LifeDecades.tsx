/**
 * 05 10년 시간표 · 大運 — 연도 먼저, 대운 천간 오행 레일. 지난 · 먼 행은 옅게, 지금 행은 판 위에
 * 'You are here' + 올해 세운 한 줄과 캘린더 링크, 다음 인생 마디가 든 행엔 LIFE TURN 표지, 서사의
 * 정점이 든 행엔 엔진의 정점 절. 맨 아래 캡션 'Themes name a decade's topic, not its quality.'
 * 서버 컴포넌트.
 */

import Link from 'next/link'
import { pick, type Lang } from '@/components/v9/v9Copy'
import type { LifeDecadesVM } from '@/lib/calendar-view/lifetimeViewModel'
import { LIFE_COPY } from '../lifeCopy'
import { ArrowIcon } from './icons'
import HanjaText from './HanjaText'
import s from '../LifeFlow.module.css'

const STATE_CLASS = { past: s.past, now: s.now, future: '', far: s.far } as const

export default function LifeDecades({ decades, locale }: { decades: LifeDecadesVM; locale: Lang }) {
  return (
    <section className={s.sec} data-life-section="decades" aria-labelledby="life-decades">
      <div className={s.lr}>
        <span>
          {pick(LIFE_COPY.decadesLabel, locale)} ·{' '}
          <span className={s.hj} lang="ko" aria-hidden="true">
            大運
          </span>
        </span>
        {decades.rangeLabel ? <span>{decades.rangeLabel}</span> : null}
      </div>
      <h2 id="life-decades" className={s.h2}>
        {decades.heading}
      </h2>
      <div className={s.tth} aria-hidden="true">
        <span />
        <span>{pick(LIFE_COPY.colYears, locale)}</span>
        <span className={s.hj}>大運</span>
        <span>{pick(LIFE_COPY.colTheme, locale)}</span>
      </div>
      <ol className={s.tlist}>
        {decades.rows.map((r) => (
          <li
            key={`${r.gz}-${r.start}`}
            className={[s.tr, STATE_CLASS[r.state]].filter(Boolean).join(' ')}
            data-state={r.state}
            aria-current={r.state === 'now' ? 'true' : undefined}
          >
            <span className={s.rl} aria-hidden="true">
              <i className={`${s.rail} ${s[`rail_${r.element}`]}`} />
            </span>
            <span className={s.yr}>{r.years}</span>
            {/* 간지는 바로 옆 읽는 법(r.roman)과 같은 말 — 스크린 리더엔 한 번만. */}
            <span className={s.gz} lang="ko" aria-hidden="true">
              {r.gz}
            </span>
            <div className={s.tcell}>
              {r.state === 'now' ? (
                <span className={s.here}>{pick(LIFE_COPY.youAreHere, locale)}</span>
              ) : null}
              {r.theme ? <span className={s.th}>{r.theme}</span> : null}
              <span className={s.rm}>{r.roman}</span>
              {r.lifeTurn ? (
                <span className={s.turn} data-life-turn={r.lifeTurn.year}>
                  {r.lifeTurn.label} · {r.lifeTurn.year}
                </span>
              ) : null}
            </div>
            {r.yrow ? (
              <Link href={r.yrow.href} className={s.yrow} prefetch={false}>
                <span>
                  <HanjaText text={r.yrow.text} />
                </span>
                <span className={s.lk}>
                  {r.yrow.link}
                  <ArrowIcon />
                </span>
              </Link>
            ) : null}
            {r.peakNote ? <p className={s.nt}>{r.peakNote}</p> : null}
          </li>
        ))}
      </ol>
      <p className={s.cap}>{decades.caption}</p>
    </section>
  )
}
