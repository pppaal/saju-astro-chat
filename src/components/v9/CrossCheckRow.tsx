/**
 * 교차 행 — SAJU 칸 × STARS 칸. v9 의 중심 장치(홈 3단계 · 인생 흐름 이 10년의 겹침 ·
 * 캘린더 '왜 오늘').
 *
 * - kind 'timing': 타이밍 신호. 교차는 두 부모 신호의 부호가 같을 때만 생기므로(E11) 행이
 *   있다는 것 자체가 '두 체계가 같은 쪽'이다. mark 'up' ▲(유리) / 'down' ▼(불리)가 그
 *   방향이고, mark 가 없으면 마크를 그리지 않는다 — 합의·방향을 지어내지 않는다. 시진 ×
 *   상승궁 주인 같은 짝은 교차가 아니므로(결정 19) 이 행으로 그리지 않는다.
 * - kind 'trait': 원국 축 하나의 판정 — 축 이름 + 행 끝 mono 판정(SAME · SUPPORTIVE ·
 *   TWO PULLS · UNRELATED). 판정 키는 리포트 교차 행과 같은 tone(resonant…neutral).
 *
 * 칸: SAJU = 라벨 + 한자 + 값(+ 둘째 줄 w). STARS = 라벨 + 행성 기호 + 값 + mono sub.
 * 값 문구는 호출자가 locale 에 맞춰 넘긴다. 서버·클라이언트 공용.
 */

import type { ReactNode } from 'react'
import { Glyph, MarkTriangle, type PlanetGlyph } from './Glyph'
import {
  LEGEND,
  SYSTEMS,
  TONE_TO_VERDICT,
  VERDICT,
  pick,
  type CrossToneKey,
  type Lang,
} from './v9Copy'
import s from './CrossCheckRow.module.css'

export interface SajuCell {
  /** 십신·신살 한자(正官) — 라벨 옆. */
  hanja?: string
  /** 값(Direct Officer / 정관). */
  text: string
  /** 둘째 줄 설명(trait: 'fluid and permeating'). */
  w?: string
}

export interface StarsCell {
  glyph?: PlanetGlyph
  text: string
  /** mono 보조 줄(SATURN RETURN · 9° ARIES · 2026). */
  sub?: string
  w?: string
}

interface BaseProps {
  theme?: 'light' | 'dark'
  /** 묶음의 첫 행 — 위 실선 없음. */
  first?: boolean
  locale: Lang
  className?: string
}

export interface TimingRowProps extends BaseProps {
  kind: 'timing'
  saju: SajuCell
  stars: StarsCell
  /** 합의된 신호의 방향. 없으면 마크 없음. */
  mark?: 'up' | 'down'
  /** 행 아래 한 문장(엔진 문구). */
  note?: string
}

export interface TraitRowProps extends BaseProps {
  kind: 'trait'
  /** 축 이름(Identity / 정체성). */
  axis: string
  verdict: CrossToneKey
  saju?: SajuCell
  stars?: StarsCell
  /** 칸 대신 엔진의 한 문장('unions in your saju, soft aspects in your chart'). */
  phrase?: string
}

export type CrossCheckRowProps = TimingRowProps | TraitRowProps

function SajuSys({ cell, locale }: { cell: SajuCell; locale: Lang }) {
  return (
    <span className={s.sys} data-cell="saju">
      <span className={s.lbl}>
        {pick(SYSTEMS.saju, locale)}
        {cell.hanja ? <span className={s.hj}>{cell.hanja}</span> : null}
      </span>
      <span className={s.val}>
        {cell.text}
        {cell.w ? <span className={s.w}> {cell.w}</span> : null}
      </span>
    </span>
  )
}

function StarsSys({ cell, locale }: { cell: StarsCell; locale: Lang }) {
  return (
    <span className={s.sys} data-cell="stars">
      <span className={s.lbl}>{pick(SYSTEMS.stars, locale)}</span>
      <span className={s.val}>
        {cell.glyph ? <Glyph name={cell.glyph} className={s.pg} /> : null}
        {cell.text}
        {cell.w ? <span className={s.w}> {cell.w}</span> : null}
      </span>
      {cell.sub ? <span className={s.sub}>{cell.sub}</span> : null}
    </span>
  )
}

export default function CrossCheckRow(props: CrossCheckRowProps) {
  const { theme = 'light', first = false, locale, className } = props
  const base = [s.row, first ? s.first : '', theme === 'dark' ? s.dark : '']

  if (props.kind === 'trait') {
    const v = TONE_TO_VERDICT[props.verdict]
    const verdict = VERDICT[v]
    return (
      <div
        className={[...base, s.trait, className].filter(Boolean).join(' ')}
        data-kind="trait"
        data-verdict={v}
      >
        <span className={s.ax}>
          <span>{props.axis}</span>
          <span className={`${s.vd} ${s[v]}`} title={pick(verdict.long, locale)}>
            {pick(verdict.short, locale)}
          </span>
        </span>
        {props.saju && props.stars ? (
          <>
            <SajuSys cell={props.saju} locale={locale} />
            <span className={s.x} aria-hidden="true">
              ×
            </span>
            <StarsSys cell={props.stars} locale={locale} />
          </>
        ) : props.phrase ? (
          <p className={s.ph}>{props.phrase}</p>
        ) : null}
        <span className={s.sr}>{pick(verdict.long, locale)}</span>
      </div>
    )
  }

  const { mark } = props
  return (
    <div
      className={[...base, className].filter(Boolean).join(' ')}
      data-kind="timing"
      data-mark={mark ?? 'none'}
    >
      <SajuSys cell={props.saju} locale={locale} />
      <span className={s.x} aria-hidden="true">
        ×
      </span>
      <StarsSys cell={props.stars} locale={locale} />
      <span className={s.mk}>
        {mark ? (
          <>
            <MarkTriangle dir={mark} />
            <span className={s.sr}>
              {pick(mark === 'up' ? LEGEND.favorable : LEGEND.adverse, locale)}
            </span>
          </>
        ) : null}
      </span>
      {props.note ? <p className={s.nt}>{props.note}</p> : null}
    </div>
  )
}

/** 교차 행 묶음 — 아래 실선 하나. */
export function CrossCheckList({
  theme = 'light',
  children,
  className,
}: {
  theme?: 'light' | 'dark'
  children: ReactNode
  className?: string
}) {
  return (
    <div className={[s.list, theme === 'dark' ? s.dark : '', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  )
}
