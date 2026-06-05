'use client'

/* ============================================================
   destinypal · Ganji — 한자(干支) 토큰
   직역 출처: destinypal-extracted/js/util.jsx Ganji()
   한자 + 한글 + 영문 3종 병기, accent: ember(주사) | accent(쪽빛).
   ============================================================ */

import type { Ganji as GanjiData } from '@/types/destinypal'
import styles from '../styles/atoms.module.css'

export interface GanjiProps {
  data: GanjiData | null | undefined
  size?: number
  en?: boolean
  accent?: 'ember' | 'accent'
  className?: string
}

export function Ganji({
  data,
  size = 30,
  en = true,
  accent = 'ember',
  className,
}: GanjiProps) {
  if (!data) return null
  const col = accent === 'ember' ? 'var(--dp-ember-2)' : 'var(--dp-accent-2)'
  return (
    <span className={[styles.ganji, className].filter(Boolean).join(' ')}>
      <span
        className={styles.hanja}
        style={{ fontSize: size, color: col }}
      >
        {data.hanja}
      </span>
      <span
        className={styles.kr}
        style={{ fontSize: Math.max(10, size * 0.32), marginTop: 5 }}
      >
        {data.kr}
      </span>
      {en && (
        <span
          className={styles.en}
          style={{ fontSize: Math.max(9, size * 0.28), marginTop: 2 }}
        >
          {data.en}
        </span>
      )}
    </span>
  )
}

export default Ganji
