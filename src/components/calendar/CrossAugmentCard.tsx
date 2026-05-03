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

/**
 * Strip internal technical jargon out of rule "meaning" labels before they
 * reach the user. The cross-rules engine emits short codes like
 * "ZR L1 ruler × 세운 동조" or "점성 progression × 세운" that are useful
 * for engineers but unreadable for end users — replace the recognizable
 * jargon with plain Korean phrases, drop anything that's still pure code.
 */
function humanizeMeaning(raw: string | undefined | null, locale: 'ko' | 'en'): string {
  if (!raw) return ''
  let text = raw
  if (locale === 'ko') {
    text = text
      // Zodiacal Releasing periods & Hellenistic terms
      .replace(/\bZR\s*L1\s*ruler\b/gi, '인생 챕터의 통치 행성')
      .replace(/\bZR\s*L2\b/gi, '월 단위 sub-period')
      .replace(/\bZR\b/gi, '인생 챕터')
      .replace(/\bL1 ruler\b/gi, '챕터 통치 행성')
      .replace(/\bL2 ruler\b/gi, '서브 통치 행성')
      .replace(/\bruler\b/gi, '통치 행성')
      // Astrology jargon
      .replace(/\bsecondary progressions?\b/gi, '장기 전개')
      .replace(/\bprogressions?\b/gi, '장기 전개')
      .replace(/\bnatal aspect\b/gi, '본명 각도')
      .replace(/\bsynastry\b/gi, '관계 각도')
      .replace(/\btransit\b/gi, '트랜짓')
      .replace(/\bstellium\b/gi, '집중 행성')
      .replace(/\bdignity\b/gi, '품위')
      .replace(/\bbenefic\b/gi, '길성')
      .replace(/\bmalefic\b/gi, '흉성')
      .replace(/\bsect\b/gi, '주야 구분')
      // Common conjunction symbol stays — it reads OK in Korean
      .replace(/\s*×\s*/g, ' × ')
  } else {
    text = text
      .replace(/통치자/gi, 'ruler')
      .replace(/세운/gi, 'year cycle')
      .replace(/대운/gi, 'major cycle')
      .replace(/일진/gi, 'day stem')
  }
  return text.trim()
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
  const activeLocale: 'ko' | 'en' = locale === 'en' ? 'en' : 'ko'
  const L = activeLocale === 'en' ? LABELS.en : LABELS.ko
  const label = scopeLabel ?? L.scope[scope]
  const sanitize = (s: string | undefined | null) => humanizeMeaning(s, activeLocale)

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
                <strong className={styles.themeMeaning}>{sanitize(t.meaning)}</strong>
                <p className={styles.themeNarrative}>{t.narrative}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 도메인 그리드 — 사용자 view: 도메인 이름 + tone + (선택) 1줄 자연어 요약.
          기존엔 raw rule meaning 코드들이 list로 늘어났는데, 사용자가 무슨 말인지
          모르는 기술 라벨이라 모두 제거. dualSignals에 narrative가 있는 경우에만
          한 줄 자연어 보충. */}
      <div className={styles.domainsSection}>
        <h3 className={styles.sectionTitle}>{L.sectionDomains}</h3>
        <div className={styles.domainsGrid}>
          {augment.domains.map((d) => {
            // dualSignals에 narrative가 있으면 첫 줄만 보여주기 (이미 사용자 친화 문장).
            // confirms는 narrative 없어서 생략.
            const dualNote =
              d.dualSignals.find((s) => s.narrative && s.narrative.length > 0)?.narrative?.trim() ||
              ''
            const hasAnySignal = d.topConfirms.length > 0 || d.dualSignals.length > 0
            return (
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

                {dualNote && <p className={styles.themeNarrative}>{dualNote}</p>}

                {!dualNote && !hasAnySignal && (
                  <p className={styles.emptyText}>{L.empty}</p>
                )}
              </article>
            )
          })}
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
