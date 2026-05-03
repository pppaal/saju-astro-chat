'use client'

import React from 'react'
import { useI18n } from '@/i18n/I18nProvider'
import styles from './CrossAugmentCard.module.css'
import type { CalendarCrossAugment } from '@/lib/destiny-map/destinyCalendar'

interface CrossAugmentCardProps {
  augment: CalendarCrossAugment
  /** 'monthly' | 'weekly' | 'daily' — UI에 표시될 스코프 라벨 */
  scope?: 'monthly' | 'weekly' | 'daily'
  scopeLabel?: string
}

const LABELS = {
  ko: {
    domains: { self: '자아', love: '사랑', money: '재물', career: '직업', health: '건강', family: '가정' },
    tones: { positive: '긍정', negative: '주의', mixed: '양면', neutral: '평이' },
    intensities: { strong: '강', moderate: '중', weak: '약' },
    sectionThemes: '통합 테마',
    sectionDomains: '영역별',
    confirms: '양쪽 동의',
    duals: '양면성',
    empty: '이 영역에는 동시 신호 없음',
    imminent: '대운 전환 임박',
    scope: { monthly: '이번 달 큰 흐름', weekly: '이번 주 흐름', daily: '오늘 흐름' },
    age: (n: number) => `만 ${n}세`,
    daeun: (prev: string, next: string) => `대운 ${prev || '-'} → ${next || '-'}`,
    daeunImminent: (years: number) => ` (${Math.max(0, years).toFixed(1)}년 후 전환)`,
    lifeStage: { child: '아동기', teen: '청소년기', 'young-adult': '청년기', 'mid-adult': '중년기', 'late-adult': '장년기', elder: '노년기', adult: '성인기' } as Record<string, string>,
  },
  en: {
    domains: { self: 'Self', love: 'Love', money: 'Wealth', career: 'Career', health: 'Health', family: 'Family' },
    tones: { positive: 'Positive', negative: 'Caution', mixed: 'Dual', neutral: 'Neutral' },
    intensities: { strong: 'Hi', moderate: 'Md', weak: 'Lo' },
    sectionThemes: 'Themes',
    sectionDomains: 'By Domain',
    confirms: 'Both Agree',
    duals: 'Dual Signals',
    empty: 'No simultaneous signal',
    imminent: 'Daeun Transition Near',
    scope: { monthly: 'This Month', weekly: 'This Week', daily: 'Today' },
    age: (n: number) => `Age ${n}`,
    daeun: (prev: string, next: string) => `Daeun ${prev || '-'} → ${next || '-'}`,
    daeunImminent: (years: number) => ` (${Math.max(0, years).toFixed(1)}y to next)`,
    lifeStage: { child: 'Child', teen: 'Teen', 'young-adult': 'Young Adult', 'mid-adult': 'Mid Adult', 'late-adult': 'Late Adult', elder: 'Elder', adult: 'Adult' } as Record<string, string>,
  },
} as const

export default function CrossAugmentCard({
  augment,
  scope = 'monthly',
  scopeLabel,
}: CrossAugmentCardProps) {
  const { locale } = useI18n()
  const L = locale === 'en' ? LABELS.en : LABELS.ko
  const label = scopeLabel ?? L.scope[scope]

  return (
    <section className={styles.card} aria-label={label}>
      <header className={styles.header}>
        <span className={styles.scopeBadge}>{label}</span>
        {augment.context?.daeun?.transitionImminent && (
          <span className={styles.imminentBadge}>{L.imminent}</span>
        )}
      </header>

      {/* 통합 테마 */}
      {augment.themes.length > 0 && (
        <div className={styles.themesSection}>
          <h3 className={styles.sectionTitle}>{L.sectionThemes}</h3>
          <ul className={styles.themesList}>
            {augment.themes.map((t) => (
              <li key={t.id} className={styles.themeItem}>
                <strong className={styles.themeMeaning}>{t.meaning}</strong>
                <p className={styles.themeNarrative}>{t.narrative}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 도메인 그리드 */}
      <div className={styles.domainsSection}>
        <h3 className={styles.sectionTitle}>{L.sectionDomains}</h3>
        <div className={styles.domainsGrid}>
          {augment.domains.map((d) => (
            <article
              key={d.domain}
              className={`${styles.domainCard} ${styles[`tone_${d.tone}`]}`}
            >
              <header className={styles.domainHeader}>
                <span className={styles.domainName}>{L.domains[d.domain] ?? d.domain}</span>
                <span className={`${styles.toneBadge} ${styles[`badge_${d.tone}`]}`}>
                  {L.tones[d.tone] ?? d.tone}
                </span>
              </header>

              {d.topConfirms.length > 0 && (
                <div className={styles.signalGroup}>
                  <span className={styles.signalLabel}>{L.confirms}</span>
                  <ul className={styles.signalList}>
                    {d.topConfirms.map((c, i) => (
                      <li key={i} className={styles.signalItem}>
                        <span className={`${styles.intensityDot} ${styles[`intensity_${c.intensity}`]}`}>
                          {L.intensities[c.intensity]}
                        </span>
                        <span>{c.meaning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {d.dualSignals.length > 0 && (
                <div className={styles.signalGroup}>
                  <span className={`${styles.signalLabel} ${styles.dualLabel}`}>{L.duals}</span>
                  <ul className={styles.signalList}>
                    {d.dualSignals.map((c, i) => (
                      <li key={i} className={`${styles.signalItem} ${styles.dualItem}`}>
                        <span className={`${styles.intensityDot} ${styles[`intensity_${c.intensity}`]}`}>
                          {L.intensities[c.intensity]}
                        </span>
                        <span>{c.meaning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {d.topConfirms.length === 0 && d.dualSignals.length === 0 && (
                <p className={styles.emptyText}>{L.empty}</p>
              )}
            </article>
          ))}
        </div>
      </div>

      {/* 컨텍스트 푸터 */}
      {augment.context && (
        <footer className={styles.footer}>
          {augment.context.ageYears != null && (
            <span className={styles.footerItem}>{L.age(augment.context.ageYears)}</span>
          )}
          {augment.context.lifeStage && (
            <span className={styles.footerItem}>
              {L.lifeStage[augment.context.lifeStage] ?? augment.context.lifeStage}
            </span>
          )}
          {augment.context.daeun && (
            <span className={styles.footerItem}>
              {L.daeun(
                augment.context.daeun.previousSibsin ?? '',
                augment.context.daeun.nextSibsin ?? '',
              )}
              {augment.context.daeun.yearsToNext <= 1 && augment.context.daeun.transitionImminent
                ? L.daeunImminent(augment.context.daeun.yearsToNext)
                : ''}
            </span>
          )}
        </footer>
      )}
    </section>
  )
}
