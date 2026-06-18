'use client'

// 교차 리스트 — 캘린더의 본질. 모든 tier(인생·대운·년·월·일) 공용.
// "언제(when) · 무엇이 교차하나(title) · 무슨 뜻(detail)" 한 줄씩. 그게 전부.
// 왼쪽 세로 레일 + 점으로 시간 순서를, 오른쪽에 내용을.

import styles from './CrossingList.module.css'
import { useI18n } from '@/i18n/I18nProvider'

export interface CrossingItem {
  /** 언제 — 연/월/일 등 스케일에 맞는 시점. */
  when: string
  /** 무엇이 교차하나 — 한 줄. */
  title: string
  /** 근거/해석 — 한 줄. */
  detail?: string
  /** 지금에 해당. */
  now?: boolean
  /** 과거(흐리게). */
  past?: boolean
}

export function CrossingList({ heading, items }: { heading?: string; items: CrossingItem[] }) {
  const { locale } = useI18n()
  if (!items || items.length === 0) return null
  const nowLabel = locale === 'ko' ? '지금' : 'now'
  return (
    <div className={styles.wrap}>
      {heading ? <div className={styles.heading}>{heading}</div> : null}
      <ul className={styles.list}>
        {items.map((it, i) => (
          <li
            key={i}
            className={`${styles.item} ${it.now ? styles.now : ''} ${it.past ? styles.past : ''}`}
          >
            <span className={styles.when}>
              {it.when}
              {it.now ? <em>{nowLabel}</em> : null}
            </span>
            <span className={styles.dot} aria-hidden="true" />
            <div className={styles.body}>
              <div className={styles.title}>{it.title}</div>
              {it.detail ? <div className={styles.detail}>{it.detail}</div> : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

