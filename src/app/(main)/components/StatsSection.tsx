import { formatNumber } from "@/utils/numberFormat";

type CSSModule = Record<string, string>;

interface StatsSectionProps {
  translate: (key: string, fallback: string) => string;
  todayVisitors: number | null;
  totalVisitors: number | null;
  totalMembers: number | null;
  visitorError: string | null;
  styles: CSSModule;
}

export default function StatsSection({
  translate,
  todayVisitors,
  totalVisitors,
  totalMembers,
  visitorError,
  styles,
}: StatsSectionProps) {
  return (
    <section className={styles.statsSection}>
      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <span className={styles.statIcon}>👁️</span>
          <p className={styles.statLabel}>
            {translate("landing.statsToday", "Today")}
          </p>
          <p className={styles.statValue}>
            {todayVisitors === null ? (
              <span className={styles.statSkeleton}>...</span>
            ) : (
              formatNumber(todayVisitors)
            )}
          </p>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statIcon}>🌟</span>
          <p className={styles.statLabel}>
            {translate("landing.statsTotal", "Total Visitors")}
          </p>
          <p className={styles.statValue}>
            {totalVisitors === null ? (
              <span className={styles.statSkeleton}>...</span>
            ) : (
              formatNumber(totalVisitors)
            )}
          </p>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statIcon}>✨</span>
          <p className={styles.statLabel}>
            {translate("landing.statsMembers", "Members")}
          </p>
          <p className={styles.statValue}>
            {totalMembers === null ? (
              <span className={styles.statSkeleton}>...</span>
            ) : (
              formatNumber(totalMembers)
            )}
          </p>
        </div>
        <div className={styles.statFootnote}>
          {visitorError ?? translate("landing.statsFootnote", "Live stats")}
        </div>
      </div>
    </section>
  );
}
