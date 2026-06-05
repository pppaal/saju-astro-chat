'use client'

/* ============================================================
   destinypal · ElementBars — 5 오행 분포 막대
   출처: destinypal-extracted/js/util.jsx ElementBars() + EL_META.
   ============================================================ */

import type { ElementCounts } from '@/types/destinypal'
import styles from '../styles/atoms.module.css'

const EL_META = {
  목: { c: 'var(--dp-el-wood)',  en: 'Wood'  },
  화: { c: 'var(--dp-el-fire)',  en: 'Fire'  },
  토: { c: 'var(--dp-el-earth)', en: 'Earth' },
  금: { c: 'var(--dp-el-metal)', en: 'Metal' },
  수: { c: 'var(--dp-el-water)', en: 'Water' },
} as const

export type { ElementCounts }
export { EL_META }

export interface ElementBarsProps {
  elements: ElementCounts
  className?: string
}

export function ElementBars({ elements, className }: ElementBarsProps) {
  const values = Object.values(elements)
  const max = Math.max(...values, 1)
  return (
    <div className={[styles.elementRow, className].filter(Boolean).join(' ')}>
      {(Object.entries(elements) as Array<[keyof typeof EL_META, number]>).map(
        ([k, v]) => (
          <div
            className={styles.elBar}
            key={k}
            style={{
              height: 16 + (v / max) * 30,
              background: `linear-gradient(180deg, ${EL_META[k].c}, rgba(255,255,255,0.04))`,
              boxShadow: `0 0 12px -2px ${EL_META[k].c}`,
            }}
          >
            <span style={{ color: EL_META[k].c }}>{k}</span>
            <small>{v}</small>
          </div>
        ),
      )}
    </div>
  )
}

export default ElementBars
