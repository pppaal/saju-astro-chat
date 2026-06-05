'use client'

/* ============================================================
   destinypal · Rail — 좌측 vertical 5-stop depth rail.
   직역 출처: destinypal-extracted/js/app.jsx <nav className="rail"> 블록.
   각 stop 은 한 tier 로 이동. 활성 stop 은 ember 색 + glow.
   tiers prop 으로 stop 개수 결정 (life/decade/year/month/day = 5).
   ============================================================ */

import { Fragment } from 'react'
import styles from '../styles/shell.module.css'

export interface RailTier {
  id: string
  ko: string
  en: string
  scale: string
}

export interface DestinypalRailProps {
  tiers: ReadonlyArray<RailTier>
  activeIndex: number
  onSelect: (index: number) => void
}

export function DestinypalRail({
  tiers,
  activeIndex,
  onSelect,
}: DestinypalRailProps) {
  return (
    <nav className={styles.rail} aria-label="destinypal depth rail">
      {tiers.map((t, i) => (
        <Fragment key={t.id}>
          <button
            type="button"
            className={[
              styles.railStop,
              activeIndex === i ? styles.railActive : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onSelect(i)}
            aria-label={t.ko}
            aria-current={activeIndex === i ? 'true' : undefined}
          >
            <span className="dot" />
            <span className={styles.railLbl}>
              {t.ko} <span className={styles.railScale}>{t.scale}</span>
            </span>
          </button>
          {i < tiers.length - 1 && <span className={styles.railLine} />}
        </Fragment>
      ))}
    </nav>
  )
}

export default DestinypalRail
