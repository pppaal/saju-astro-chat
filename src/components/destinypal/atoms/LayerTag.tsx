'use client'

/**
 * LayerTag — 신호의 출처 레이어 태그 ('사주' / '점성').
 * 포팅 출처: destinypal-extracted/js-ink/util.jsx LayerTag
 *
 * data.js 의 saju/astro 두 카테고리.
 */

import * as React from 'react'
import styles from '../styles/atoms.module.css'

export type LayerTagKind = 'saju' | 'astro'

export interface LayerTagProps {
  /** 레이어 종류. */
  kind: LayerTagKind
  /** 추가 className. */
  className?: string
}

export function LayerTag({
  kind,
  className,
}: LayerTagProps): React.ReactElement {
  const isSaju = kind === 'saju'
  const variantClass = isSaju ? styles.layerTagSaju : styles.layerTagAstro
  return (
    <span
      className={[styles.layerTag, variantClass, className]
        .filter(Boolean)
        .join(' ')}
    >
      <span className={styles.pip} />{' '}
      {isSaju ? '사주 · SAJU' : '점성 · ASTRO'}
    </span>
  )
}

export default LayerTag
