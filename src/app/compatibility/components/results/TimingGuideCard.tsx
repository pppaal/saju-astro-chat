import React from 'react'
import type { TimingData } from '../../lib'
import styles from '../../Compatibility.module.css'
import { repairMojibakeText } from '@/lib/text/mojibake'

interface TimingGuideCardProps {
  timing: TimingData
  isGroupResult: boolean
  t: (key: string, fallback: string) => string
}

export const TimingGuideCard = React.memo<TimingGuideCardProps>(({ timing, isGroupResult, t }) => {
  return (
    <div className={styles.timingSection}>
      <div className={styles.resultCard}>
        <div className={styles.resultCardGlow} />
        <div className={styles.resultCardHeader}>
          <span className={styles.resultCardIcon}>{'\u23F0'}</span>
          <h3 className={styles.resultCardTitle}>{t('compatibilityPage.timingGuide', 'Timing Guide')}</h3>
        </div>
        <div className={styles.resultCardContent}>
          {timing.current_month && (
            <div className={styles.timingItem}>
              <h4>
                {'\u{1F4C5}'} {t('compatibilityPage.thisMonth', 'This Month')}
              </h4>
              <p className={styles.timingBranch}>
                {repairMojibakeText(timing.current_month.branch)} ({repairMojibakeText(timing.current_month.element)})
              </p>
              <p>{repairMojibakeText(timing.current_month.analysis)}</p>
            </div>
          )}

          {isGroupResult && timing.group_activities && timing.group_activities.length > 0 && (
            <div className={styles.goodDays}>
              <h4>
                {'\u{1F3AF}'} {t('compatibilityPage.groupActivities', 'Group Activities')}
              </h4>
              {timing.group_activities.map((activity, idx) => (
                <div key={idx} className={styles.dayItem}>
                  <span className={styles.dayLabel}>{repairMojibakeText(activity.days)}</span>
                  <span className={styles.dayActivities}>
                    {activity.activities.map((v) => repairMojibakeText(v)).join(', ')}
                  </span>
                  <span className={styles.dayReason}>{repairMojibakeText(activity.reason)}</span>
                </div>
              ))}
            </div>
          )}

          {!isGroupResult && timing.good_days && timing.good_days.length > 0 && (
            <div className={styles.goodDays}>
              <h4>
                {'\u2705'} {t('compatibilityPage.recommendedDays', 'Recommended Days')}
              </h4>
              {timing.good_days.map((day, idx) => (
                <div key={idx} className={styles.dayItem}>
                  <span className={styles.dayLabel}>{repairMojibakeText(day.days)}</span>
                  <span className={styles.dayActivities}>
                    {day.activities.map((v) => repairMojibakeText(v)).join(', ')}
                  </span>
                  <span className={styles.dayReason}>{repairMojibakeText(day.reason)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

TimingGuideCard.displayName = 'TimingGuideCard'
