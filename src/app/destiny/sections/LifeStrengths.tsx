/**
 * 03 타고난 강점 · 十神 — 십성 다섯 묶음 표(결 · 원국 글자 타일 · 개수 N). 타일 하나 = 원국 글자
 * 하나(엔진 categoryCount 와 같은 수). 가장 센 결은 행 라벨 옆 STRONGEST(동률이면 표시하지
 * 않는다), 표 아래 오행 띠와 캡션(숨긴 시주 포함 · 시간 미상이면 추정). 서버 컴포넌트.
 */

import ElementTile from '@/components/v9/ElementTile'
import { pick, type Lang } from '@/components/v9/v9Copy'
import type { LifeStrengthsVM } from '@/lib/calendar-view/lifetimeViewModel'
import { LIFE_COPY } from '../lifeCopy'
import HanjaText from './HanjaText'
import s from '../LifeFlow.module.css'

/** 'Your strongest thread is Status.' — 결 이름만 먹 굵게. */
function Heading({ text, strongest }: { text: string; strongest: string | null }) {
  const i = strongest ? text.lastIndexOf(strongest) : -1
  if (!strongest || i < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, i)}
      <span className={s.em}>{strongest}</span>
      {text.slice(i + strongest.length)}
    </>
  )
}

export default function LifeStrengths({
  strengths,
  locale,
}: {
  strengths: LifeStrengthsVM
  locale: Lang
}) {
  const showTop = !strengths.strongestTied
  const heading = showTop ? strengths.heading : null
  return (
    <section className={s.sec} data-life-section="strengths" aria-labelledby="life-strengths">
      <div className={s.lr}>
        <span>
          {pick(LIFE_COPY.strengthsLabel, locale)} ·{' '}
          <span className={s.hj} lang="ko">
            十神
          </span>
        </span>
        <span>
          {pick(LIFE_COPY.dayMaster, locale)}{' '}
          <span className={s.hj} lang="ko">
            {strengths.dayMaster}
          </span>
        </span>
      </div>
      <h2 id="life-strengths" className={s.h2}>
        {heading ? (
          <Heading text={heading} strongest={strengths.strongest} />
        ) : (
          pick(LIFE_COPY.strengthsTitleTied, locale)
        )}
      </h2>
      {heading ? <p className={s.sub}>{pick(LIFE_COPY.strengthsSub, locale)}</p> : null}
      <div className={s.stab}>
        <div className={s.sth}>
          <span>{pick(LIFE_COPY.colThread, locale)}</span>
          <span>{pick(LIFE_COPY.colChart, locale)}</span>
          <span className={s.r}>{pick(LIFE_COPY.colN, locale)}</span>
        </div>
        {strengths.rows.map((r) => {
          const top = showTop && r.strongest
          return (
            <div
              key={r.key}
              className={[s.str, r.count === 0 ? s.z : ''].filter(Boolean).join(' ')}
              data-thread={r.key}
              data-strongest={top ? '' : undefined}
            >
              <div className={s.nm}>
                {r.label}
                {/* 묶음 한자(官)는 바로 앞 이름(Status)과 같은 말 — 스크린 리더엔 한 번만. */}
                {r.hanja ? (
                  <span className={s.nmHj} lang="ko" aria-hidden="true">
                    {r.hanja}
                  </span>
                ) : null}
                {top ? <span className={s.st}>{pick(LIFE_COPY.strongest, locale)}</span> : null}
              </div>
              <span className={s.tiles}>
                {r.chars.length ? (
                  r.chars.map((c, i) => (
                    <ElementTile key={`${c.pillar}-${c.part}-${i}`} char={c.ch} element={c.el} />
                  ))
                ) : (
                  <span className={s.none}>{pick(LIFE_COPY.noneInChart, locale)}</span>
                )}
              </span>
              <span className={s.n}>{r.count}</span>
            </div>
          )
        })}
        <div className={s.stf}>
          {strengths.elements.map((e) => (
            <span key={e.key} className={e.count === 0 ? s.z : undefined} data-element={e.key}>
              <i className={s[`sw_${e.key}`]} aria-hidden="true" />
              {e.label} <b>{e.count}</b>
            </span>
          ))}
        </div>
      </div>
      <p className={s.cap}>
        <HanjaText text={strengths.caption} />
      </p>
    </section>
  )
}
