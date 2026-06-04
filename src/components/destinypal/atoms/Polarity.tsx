'use client'

/**
 * Polarity — polarity 칩 (+3 ~ -3).
 * 포팅 출처: destinypal-extracted/js-ink/util.jsx Polarity
 *
 * v > 0  → 우호 (green)
 * v < 0  → 주의 (vermilion)
 * v == 0 → 중립 (neutral)
 */

import * as React from 'react'
import styles from '../styles/atoms.module.css'

export interface PolarityProps {
  /** -3 .. +3. */
  v: number
  /** 추가 className. */
  className?: string
}

export function Polarity({ v, className }: PolarityProps): React.ReactElement {
  const cls = v > 0 ? styles.polP : v < 0 ? styles.polN : styles.polZ
  const txt = v > 0 ? '+' + v : v < 0 ? String(v) : '0'
  return (
    <span className={[styles.pol, cls, className].filter(Boolean).join(' ')}>
      {txt}
    </span>
  )
}

export default Polarity
