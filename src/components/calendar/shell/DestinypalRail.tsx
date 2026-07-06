'use client'

/* ============================================================
   destinypal · Rail — 좌측 vertical 5-stop depth rail.
   직역 출처: destinypal-extracted/js/app.jsx <nav className="rail"> 블록.
   각 stop 은 한 tier 로 이동. 활성 stop 은 ember 색 + glow.
   tiers prop 으로 stop 개수 결정 (life/decade/year/month/day = 5).
   ============================================================ */

import { Fragment } from 'react'
import styles from '../styles/shell.module.css'
import { useI18n } from '@/i18n/I18nProvider'

export interface RailTier {
  id: string
  ko: string
  en: string
  scale: string
  /** 영문 스케일 단위 — '30d'/'24h'/'84y'. 없으면 scale(ko) 폴백. */
  scaleEn?: string
}

export interface DestinypalRailProps {
  tiers: ReadonlyArray<RailTier>
  activeIndex: number
  onSelect: (index: number) => void
}

export function DestinypalRail({ tiers, activeIndex, onSelect }: DestinypalRailProps) {
  // 레일 라벨도 로케일을 따른다 — 예전엔 t.ko 하드코딩이라 영문 화면에도 "1달/1일"이
  // 새어 글로벌 품질을 깎았다(영문 우선).
  const { locale } = useI18n()
  const en = locale === 'en'
  return (
    <nav className={styles.rail} aria-label="destinypal depth rail">
      {tiers.map((t, i) => {
        const label = en ? t.en : t.ko
        const scale = en ? (t.scaleEn ?? t.scale) : t.scale
        return (
          <Fragment key={t.id}>
            <button
              type="button"
              className={[styles.railStop, activeIndex === i ? styles.railActive : '']
                .filter(Boolean)
                .join(' ')}
              onClick={() => onSelect(i)}
              aria-label={label}
              aria-current={activeIndex === i ? 'true' : undefined}
            >
              <span className="dot" />
              <span className={styles.railLbl}>
                {label} <span className={styles.railScale}>{scale}</span>
              </span>
            </button>
            {i < tiers.length - 1 && <span className={styles.railLine} />}
          </Fragment>
        )
      })}
    </nav>
  )
}
