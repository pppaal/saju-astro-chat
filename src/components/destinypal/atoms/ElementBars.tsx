'use client'

/**
 * ElementBars — 오행(목·화·토·금·수) 분포 막대.
 * 포팅 출처: destinypal-extracted/js-ink/util.jsx ElementBars
 *
 * 입력은 5개 element key → count 맵. 최대값을 기준으로 막대 높이를 정규화.
 */

import * as React from 'react'
import type { ElementCounts } from '@/types/destinypal'
import styles from '../styles/atoms.module.css'

interface ElMeta {
  color: string
  en: string
}

export const EL_META: Record<keyof ElementCounts, ElMeta> = {
  목: { color: 'var(--dp-el-wood)', en: 'Wood' },
  화: { color: 'var(--dp-el-fire)', en: 'Fire' },
  토: { color: 'var(--dp-el-earth)', en: 'Earth' },
  금: { color: 'var(--dp-el-metal)', en: 'Metal' },
  수: { color: 'var(--dp-el-water)', en: 'Water' },
}

const ORDER: Array<keyof ElementCounts> = ['목', '화', '토', '금', '수']

export interface ElementBarsProps {
  /** 5 원소별 카운트. */
  elements: ElementCounts
  /** 추가 className. */
  className?: string
}

export function ElementBars({
  elements,
  className,
}: ElementBarsProps): React.ReactElement {
  const values = ORDER.map((k) => elements[k])
  const max = Math.max(...values, 1) // avoid div-by-zero

  return (
    <div className={[styles.elementRow, className].filter(Boolean).join(' ')}>
      {ORDER.map((k) => {
        const v = elements[k]
        const meta = EL_META[k]
        return (
          <div
            key={k}
            className={styles.elBar}
            style={{
              height: 16 + (v / max) * 30,
              background: `linear-gradient(180deg, ${meta.color}, rgba(255,255,255,0.04))`,
              boxShadow: `0 0 12px -2px ${meta.color}`,
            }}
          >
            <span className={styles.glyph} style={{ color: meta.color }}>
              {k}
            </span>
            <small className={styles.count}>{v}</small>
          </div>
        )
      })}
    </div>
  )
}

export default ElementBars
