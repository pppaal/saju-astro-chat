'use client'

/* ============================================================
   destinypal · LayerTag — 사주 / 점성 레이어 태그
   출처: destinypal-extracted/js/util.jsx LayerTag()
   ============================================================ */

import { useI18n } from '@/i18n/I18nProvider'

import styles from '../styles/atoms.module.css'

export type LayerTagKind = 'saju' | 'astro'

export interface LayerTagProps {
  kind: LayerTagKind
  className?: string
}

export function LayerTag({ kind, className }: LayerTagProps) {
  const { locale } = useI18n()
  const ko = locale === 'ko'
  const isSaju = kind === 'saju'
  const kindClass = isSaju ? styles.layerTagSaju : styles.layerTagAstro
  const label = isSaju ? (ko ? '사주 · SAJU' : 'Saju · 四柱') : ko ? '점성 · ASTRO' : 'Astrology'
  return (
    <span className={[styles.layerTag, kindClass, className].filter(Boolean).join(' ')}>
      <span className="pip" /> {label}
    </span>
  )
}
