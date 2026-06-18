'use client'

/* ============================================================
   destinypal · LayerTag — 사주 / 점성 레이어 태그
   출처: destinypal-extracted/js/util.jsx LayerTag()
   ============================================================ */

import styles from '../styles/atoms.module.css'

export type LayerTagKind = 'saju' | 'astro'

export interface LayerTagProps {
  kind: LayerTagKind
  className?: string
}

export function LayerTag({ kind, className }: LayerTagProps) {
  const isSaju = kind === 'saju'
  const kindClass = isSaju ? styles.layerTagSaju : styles.layerTagAstro
  return (
    <span className={[styles.layerTag, kindClass, className].filter(Boolean).join(' ')}>
      <span className="pip" /> {isSaju ? '사주 · SAJU' : '점성 · ASTRO'}
    </span>
  )
}

