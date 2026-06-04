'use client'

/**
 * ThemeBars — 5 테마 점수 막대 (love/money/career/health/growth).
 * 포팅 출처: destinypal-extracted/js-ink/util.jsx ThemeBars
 *
 * warm=true → 주사(ember) 그라데이션, false → 쪽빛(accent).
 */

import * as React from 'react'
import styles from '../styles/atoms.module.css'

export interface ThemeBarItem {
  /** React key. data.js 의 themes[].key 그대로. */
  key: string
  /** 한국어 라벨 — '사랑' / '재물' 등. */
  ko: string
  /** 0..100 값. */
  v: number
}

export interface ThemeBarsProps {
  /** 5 항목 (정렬·필터는 호출측 책임). */
  items: ThemeBarItem[]
  /** warm=true 면 주사 톤. 기본 false (쪽빛). */
  warm?: boolean
  /** 추가 className. */
  className?: string
}

export function ThemeBars({
  items,
  warm = false,
  className,
}: ThemeBarsProps): React.ReactElement {
  const fillBg = warm
    ? 'linear-gradient(90deg, rgba(200,73,44,0.55), var(--dp-ember))'
    : 'linear-gradient(90deg, var(--dp-accent-deep), var(--dp-accent))'
  return (
    <div className={[styles.themebars, className].filter(Boolean).join(' ')}>
      {items.map((t) => (
        <div className={styles.tbRow} key={t.key}>
          <span className={styles.lbl}>{t.ko}</span>
          <span className={styles.tbTrack}>
            <span
              className={styles.tbFill}
              style={{ width: t.v + '%', background: fillBg }}
            />
          </span>
          <span className={styles.val}>{t.v}</span>
        </div>
      ))}
    </div>
  )
}

export default ThemeBars
