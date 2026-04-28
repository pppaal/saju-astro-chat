'use client'

import React from 'react'
import styles from './CrossAugmentCard.module.css'
import type { CalendarCrossAugment } from '@/lib/destiny-map/destinyCalendar'

interface CrossAugmentCardProps {
  augment: CalendarCrossAugment
  /** 'monthly' | 'weekly' | 'daily' — UI에 표시될 스코프 라벨 */
  scope?: 'monthly' | 'weekly' | 'daily'
  scopeLabel?: string
}

const DOMAIN_KO: Record<string, string> = {
  self: '자아',
  love: '사랑',
  money: '재물',
  career: '직업',
  health: '건강',
  family: '가정',
}

const TONE_KO: Record<string, string> = {
  positive: '긍정',
  negative: '주의',
  mixed: '양면',
  neutral: '평이',
}

const INTENSITY_KO: Record<string, string> = {
  strong: '강',
  moderate: '중',
  weak: '약',
}

export default function CrossAugmentCard({
  augment,
  scope = 'monthly',
  scopeLabel,
}: CrossAugmentCardProps) {
  const label =
    scopeLabel ?? (scope === 'monthly' ? '이번 달 큰 흐름' : scope === 'weekly' ? '이번 주 흐름' : '오늘 흐름')

  return (
    <section className={styles.card} aria-label={label}>
      <header className={styles.header}>
        <span className={styles.scopeBadge}>{label}</span>
        {augment.context?.daeun?.transitionImminent && (
          <span className={styles.imminentBadge}>대운 전환 임박</span>
        )}
      </header>

      {/* 통합 테마 */}
      {augment.themes.length > 0 && (
        <div className={styles.themesSection}>
          <h3 className={styles.sectionTitle}>통합 테마</h3>
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
        <h3 className={styles.sectionTitle}>영역별</h3>
        <div className={styles.domainsGrid}>
          {augment.domains.map((d) => (
            <article
              key={d.domain}
              className={`${styles.domainCard} ${styles[`tone_${d.tone}`]}`}
            >
              <header className={styles.domainHeader}>
                <span className={styles.domainName}>{DOMAIN_KO[d.domain] ?? d.domain}</span>
                <span className={`${styles.toneBadge} ${styles[`badge_${d.tone}`]}`}>
                  {TONE_KO[d.tone] ?? d.tone}
                </span>
              </header>

              {d.topConfirms.length > 0 && (
                <div className={styles.signalGroup}>
                  <span className={styles.signalLabel}>양쪽 동의</span>
                  <ul className={styles.signalList}>
                    {d.topConfirms.map((c, i) => (
                      <li key={i} className={styles.signalItem}>
                        <span className={`${styles.intensityDot} ${styles[`intensity_${c.intensity}`]}`}>
                          {INTENSITY_KO[c.intensity]}
                        </span>
                        <span>{c.meaning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {d.dualSignals.length > 0 && (
                <div className={styles.signalGroup}>
                  <span className={`${styles.signalLabel} ${styles.dualLabel}`}>양면성</span>
                  <ul className={styles.signalList}>
                    {d.dualSignals.map((c, i) => (
                      <li key={i} className={`${styles.signalItem} ${styles.dualItem}`}>
                        <span className={`${styles.intensityDot} ${styles[`intensity_${c.intensity}`]}`}>
                          {INTENSITY_KO[c.intensity]}
                        </span>
                        <span>{c.meaning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {d.topConfirms.length === 0 && d.dualSignals.length === 0 && (
                <p className={styles.emptyText}>이 영역에는 동시 신호 없음</p>
              )}
            </article>
          ))}
        </div>
      </div>

      {/* 컨텍스트 푸터 */}
      {augment.context && (
        <footer className={styles.footer}>
          {augment.context.ageYears != null && (
            <span className={styles.footerItem}>만 {augment.context.ageYears}세</span>
          )}
          {augment.context.lifeStage && (
            <span className={styles.footerItem}>{lifeStageKo(augment.context.lifeStage)}</span>
          )}
          {augment.context.daeun && (
            <span className={styles.footerItem}>
              대운 {augment.context.daeun.previousSibsin ?? '-'} → {augment.context.daeun.nextSibsin ?? '-'}
              {augment.context.daeun.yearsToNext <= 1 && augment.context.daeun.transitionImminent
                ? ` (${Math.max(0, augment.context.daeun.yearsToNext).toFixed(1)}년 후 전환)`
                : ''}
            </span>
          )}
        </footer>
      )}
    </section>
  )
}

function lifeStageKo(stage: string): string {
  const m: Record<string, string> = {
    child: '아동기',
    teen: '청소년기',
    'young-adult': '청년기',
    'mid-adult': '중년기',
    'late-adult': '장년기',
    elder: '노년기',
    adult: '성인기',
  }
  return m[stage] ?? stage
}
