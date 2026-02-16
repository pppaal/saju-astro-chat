import { formatNumber } from '@/utils/numberFormat'

type CSSModule = Record<string, string>

interface StatsSectionProps {
  translate: (key: string, fallback: string) => string
  todayVisitors: number | null
  totalVisitors: number | null
  totalMembers: number | null
  visitorError: string | null
  styles: CSSModule
}

export default function StatsSection({
  translate,
  todayVisitors,
  totalVisitors,
  totalMembers,
  visitorError,
  styles,
}: StatsSectionProps) {
  const hasLiveStats =
    todayVisitors !== null && totalVisitors !== null && totalMembers !== null && !visitorError

  if (!hasLiveStats) {
    return null
  }

  return (
    <section className={styles.statsSection}>
      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <span className={styles.statIcon}>T</span>
          <p className={styles.statLabel}>{translate('landing.statsToday', 'Today')}</p>
          <p className={styles.statValue}>{formatNumber(todayVisitors)}</p>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statIcon}>V</span>
          <p className={styles.statLabel}>{translate('landing.statsTotal', 'Total Visitors')}</p>
          <p className={styles.statValue}>{formatNumber(totalVisitors)}</p>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statIcon}>M</span>
          <p className={styles.statLabel}>{translate('landing.statsMembers', 'Members')}</p>
          <p className={styles.statValue}>{formatNumber(totalMembers)}</p>
        </div>
        <div className={styles.statFootnote}>
          {visitorError ?? translate('landing.statsFootnote', 'Live stats')}
        </div>
      </div>
    </section>
  )
}
