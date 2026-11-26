/**
 * 집계 — 원국 교차 축을 엔진이 네 판정(같음 · 서로 도움 · 두 결 · 무관)으로 나눈 결과.
 * counts 는 tallyCrossRows(lib/report/natalCross)가 센 값을 그대로 넘긴다(결핍 축 제외 규칙이
 * 그 함수에 있다 — 여기서 다시 세지 않는다).
 *
 * - Tally: 4칸 비례 막대 + mono 범례(SAME 7 · SUPPORTIVE 5 · TWO PULLS 1 · UNRELATED 2).
 * - AgreeLine: 카드의 한 줄 — 'Saju × stars line up on 13 of 16 traits' + 얇은 막대.
 *   맞는 수 = 같음 + 서로 도움(결정: 카드 합의 줄).
 * 서버·클라이언트 공용.
 */

import type { CSSProperties } from 'react'
import type { CrossTally } from '@/lib/report/natalCrossShared'
import { CARD, VERDICT, fill, pick, type Lang, type VerdictKey } from './v9Copy'
import s from './Tally.module.css'

// 판정 키 = CrossTally 의 칸 이름(same · supportive · twoPulls · unrelated).
const ORDER: VerdictKey[] = ['same', 'supportive', 'twoPulls', 'unrelated']

interface TallyProps {
  counts: Pick<CrossTally, VerdictKey>
  size?: 'md' | 'sm'
  theme?: 'light' | 'dark'
  locale: Lang
  className?: string
}

export default function Tally({
  counts,
  size = 'md',
  theme = 'light',
  locale,
  className,
}: TallyProps) {
  const total = counts.same + counts.supportive + counts.twoPulls + counts.unrelated
  // 0 인 칸은 막대에서 빼되(폭 0 칸이 2px 틈만 남기지 않게) 범례엔 0 으로 남긴다.
  const shown = ORDER.filter((k) => counts[k] > 0)
  const cols = shown.map((k) => `${counts[k]}fr`).join(' ') || '1fr'
  return (
    <div
      className={[s.tally, size === 'sm' ? s.sm : '', theme === 'dark' ? s.dark : '', className]
        .filter(Boolean)
        .join(' ')}
      data-total={total}
    >
      <div className={s.tb} style={{ gridTemplateColumns: cols }} aria-hidden="true">
        {shown.map((k) => (
          <i key={k} className={s[k]} data-seg={k} />
        ))}
      </div>
      <ul className={s.tk}>
        {ORDER.map((k) => (
          <li key={k} data-key={k}>
            <i className={s[k]} aria-hidden="true" />
            {pick(VERDICT[k].short, locale)} <b>{counts[k]}</b>
          </li>
        ))}
      </ul>
    </div>
  )
}

interface AgreeLineProps {
  /** 맞는 축 수(같음 + 서로 도움). */
  lineUp: number
  /** 전체 축 수(tallyCrossRows().total). */
  total: number
  locale: Lang
  className?: string
}

/** 카드의 한 줄 합의 — 문장 + total 칸 막대(맞는 칸 먹). */
export function AgreeLine({ lineUp, total, locale, className }: AgreeLineProps) {
  const n = Math.max(0, Math.min(lineUp, total))
  const rest = Math.max(0, total - n)
  const template = pick(CARD.agree, locale)
  // 숫자만 굵게 — 템플릿을 '{n}' 앞뒤로 나눠 그린다.
  const [before, after] = fill(template, { m: total }).split('{n}')
  const barStyle: CSSProperties = {
    gridTemplateColumns:
      [n > 0 ? `${n}fr` : '', rest > 0 ? `${rest}fr` : ''].filter(Boolean).join(' ') || '1fr',
  }
  return (
    <div className={[s.one, className].filter(Boolean).join(' ')} data-agree={`${n}/${total}`}>
      <span className={s.t}>
        {before}
        <b>{n}</b>
        {after}
      </span>
      <span
        className={s.bar}
        style={barStyle}
        aria-hidden="true"
        data-ratio={total > 0 ? (n / total).toFixed(3) : '0'}
      >
        {n > 0 ? <i className={s.lineUp} style={{ '--cells': n } as CSSProperties} /> : null}
        {rest > 0 ? <i className={s.rest} style={{ '--cells': rest } as CSSProperties} /> : null}
      </span>
    </div>
  )
}
