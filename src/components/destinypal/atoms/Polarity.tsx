'use client'

/* ============================================================
   destinypal · Polarity — -3..+3 톤 칩
   출처: destinypal-extracted/js/util.jsx Polarity()
   p (positive) / n (negative) / z (zero) 클래스.
   ============================================================ */

import type { Polarity as PolarityValue } from '@/types/destinypal'
import styles from '../styles/atoms.module.css'

export interface PolarityProps {
  v: PolarityValue
  className?: string
}

export function Polarity({ v, className }: PolarityProps) {
  const cls = v > 0 ? styles.polP : v < 0 ? styles.polN : styles.polZ
  const txt = v > 0 ? `+${v}` : v < 0 ? String(v) : '0'
  return (
    <span className={[styles.pol, cls, className].filter(Boolean).join(' ')}>
      {txt}
    </span>
  )
}

export default Polarity
