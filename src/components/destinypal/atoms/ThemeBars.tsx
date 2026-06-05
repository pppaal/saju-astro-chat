'use client'

/* ============================================================
   destinypal · ThemeBars — 5축 테마 막대 (0-100)
   출처: destinypal-extracted/js/util.jsx ThemeBars()
   warm=false → 쪽빛(accent) / warm=true → 주사(ember).
   ============================================================ */

import styles from '../styles/atoms.module.css'

export interface ThemeBarItem {
  key: string
  ko: string
  v: number
}

export interface ThemeBarsProps {
  items: ReadonlyArray<ThemeBarItem>
  warm?: boolean
  className?: string
}

export function ThemeBars({ items, warm = false, className }: ThemeBarsProps) {
  return (
    <div className={[styles.themebars, className].filter(Boolean).join(' ')}>
      {items.map((t) => (
        <div className={styles.tbRow} key={t.key}>
          <span className="lbl">{t.ko}</span>
          <span className={styles.tbTrack}>
            <span
              className={styles.tbFill}
              style={{
                width: t.v + '%',
                background: warm
                  ? 'linear-gradient(90deg, rgba(217,168,74,0.5), var(--dp-ember))'
                  : 'linear-gradient(90deg, var(--dp-accent-deep), var(--dp-accent))',
                boxShadow: warm
                  ? '0 0 10px var(--dp-ember-glow)'
                  : '0 0 10px var(--dp-accent-glow)',
              }}
            />
          </span>
          <span className="val">{t.v}</span>
        </div>
      ))}
    </div>
  )
}

export default ThemeBars
