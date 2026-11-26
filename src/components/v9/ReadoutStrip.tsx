/**
 * 판독 띠(.ros) — 칸마다 mono 라벨과 값. 홈의 COST · ACCOUNT · TIME, 캘린더의 Good · Caution
 * · Avoid · Calm 개수처럼 '숫자를 읽는' 줄. 칸 수만큼 같은 폭으로 나눈다. 서버·클라이언트 공용.
 */

import type { ReactNode } from 'react'
import s from './ReadoutStrip.module.css'

export interface ReadoutCell {
  label: string
  value: ReactNode
  /** 값 뒤 작은 단위(SECONDS). */
  unit?: string
  /** 값 아래 한 줄 설명(sans). */
  note?: string
  /** 큰 숫자(30px sans) — 개수 판독용. */
  big?: boolean
}

interface ReadoutStripProps {
  cells: ReadoutCell[]
  theme?: 'light' | 'dark'
  className?: string
  /** 띠 전체의 스크린 리더 이름. */
  ariaLabel?: string
}

export default function ReadoutStrip({
  cells,
  theme = 'light',
  className,
  ariaLabel,
}: ReadoutStripProps) {
  return (
    <dl
      className={[s.ros, theme === 'dark' ? s.dark : '', className].filter(Boolean).join(' ')}
      style={{ gridTemplateColumns: `repeat(${Math.max(1, cells.length)}, minmax(0, 1fr))` }}
      aria-label={ariaLabel}
    >
      {cells.map((c, i) => (
        <div key={`${c.label}-${i}`} className={s.ro}>
          <dt className={s.l}>{c.label}</dt>
          <dd className={[s.v, c.big ? s.big : ''].filter(Boolean).join(' ')}>
            {c.value}
            {c.unit ? <small>{c.unit}</small> : null}
          </dd>
          {c.note ? <dd className={s.nt}>{c.note}</dd> : null}
        </div>
      ))}
    </dl>
  )
}
