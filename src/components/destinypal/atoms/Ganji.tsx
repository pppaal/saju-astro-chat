'use client'

/**
 * Ganji — 간지 토큰 (한자 + 한글 + 영문 병기).
 * 포팅 출처: destinypal-extracted/js-ink/util.jsx Ganji
 *
 * data.js 의 gz() helper 결과 ({ hanja, kr, en }) 를 그대로 받아 표시.
 * 사이즈(size)는 한자 폰트 픽셀 — 한글/영문은 비율로 자동 축소.
 */

import * as React from 'react'
import type { Ganji as GanjiData } from '@/types/destinypal'
import styles from '../styles/atoms.module.css'

export interface GanjiProps {
  /** 한자 + 한글 + 영문 묶음. null/undefined 면 아무것도 렌더 안 함. */
  data: GanjiData | null | undefined
  /** 한자 폰트 크기 (px). 기본 30. */
  size?: number
  /** 영문 표기 노출 여부. 기본 true. */
  en?: boolean
  /** 한자 색조. 'ember' = 주사(빨강), 'accent' = 쪽빛(파랑). 기본 'ember'. */
  accent?: 'ember' | 'accent'
  /** 추가 className. */
  className?: string
}

export function Ganji({
  data,
  size = 30,
  en = true,
  accent = 'ember',
  className,
}: GanjiProps): React.ReactElement | null {
  if (!data) return null
  const col = accent === 'ember' ? 'var(--dp-ember-2)' : 'var(--dp-accent-2)'
  return (
    <span className={[styles.ganji, className].filter(Boolean).join(' ')}>
      <span className={styles.hanja} style={{ fontSize: size, color: col }}>
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
