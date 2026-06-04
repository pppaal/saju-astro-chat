'use client'

/**
 * DestinypalRail — 좌측 vertical depth rail (4-stop).
 * 포팅 출처: destinypal-extracted/js-ink/app.jsx (rail block)
 *
 * Phase B 는 4-tier (life / year / month / day) — decade 는 Phase C 에서 슬롯 추가.
 */

import * as React from 'react'
import shellStyles from '../styles/shell.module.css'

export interface DestinypalRailStop {
  /** TIERS[].id — 'life' | 'year' | 'month' | 'day' (Phase B). */
  id: string
  /** 한국어 라벨 — '인생' / '1년' 등. */
  ko: string
  /** 영문 라벨 — 'LIFETIME'. (현재 rail UI 에는 미사용 — 보존용) */
  en: string
  /** 스케일 라벨 — '84년' / '12달' 등. */
  scale: string
}

export interface DestinypalRailProps {
  /** 4 stop. */
  stops: DestinypalRailStop[]
  /** 활성 stop index. */
  activeIndex: number
  /** stop 클릭 시 호출. */
  onStop: (index: number) => void
}

export function DestinypalRail({
  stops,
  activeIndex,
  onStop,
}: DestinypalRailProps): React.ReactElement {
  return (
    <nav className={shellStyles.rail} aria-label="Depth navigation">
      {stops.map((t, i) => (
        <React.Fragment key={t.id}>
          <button
            type="button"
            className={[
              shellStyles.railStop,
              activeIndex === i ? shellStyles.active : null,
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onStop(i)}
            aria-label={t.ko}
            aria-current={activeIndex === i ? 'true' : undefined}
          >
            <span className={shellStyles.dot} />
            <span className={shellStyles.lbl}>
              {t.ko} <span className={shellStyles.scale}>{t.scale}</span>
            </span>
          </button>
          {i < stops.length - 1 && <span className={shellStyles.railLine} />}
        </React.Fragment>
      ))}
    </nav>
  )
}

export default DestinypalRail
