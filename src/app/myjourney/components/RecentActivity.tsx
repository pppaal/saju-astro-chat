import Link from "next/link";
import type { DailyHistory } from "../types";
import { SERVICE_ICONS, SERVICE_NAME_KEYS, _SERVICE_URLS } from "../serviceConfig";
import { formatDate } from "../formatDate";

interface RecentActivityProps {
  styles: Record<string, string>;
  recentHistory: DailyHistory[];
  historyLoading: boolean;
  expandedDays: Record<string, boolean>;
  toggleDayExpanded: (date: string) => void;
  t: (key: string, fallback?: string) => string;
  locale: string;
}

export function RecentActivity({
  styles,
  recentHistory,
  historyLoading,
  expandedDays,
  toggleDayExpanded,
  t,
  locale,
}: RecentActivityProps) {
  return (
    <div className={styles.services}>
      <div className={styles.servicesHeader}>
        <h3>{t("myjourney.activity.title", "Recent Activity")}</h3>
        <Link href="/myjourney/history" className={styles.viewAllLink}>
          {t("myjourney.activity.viewAll", "View All \u2192")}
        </Link>
      </div>
      {historyLoading ? (
        <div className={styles.historyLoading}>
          <div className={styles.smallSpinner}></div>
        </div>
      ) : recentHistory.length > 0 ? (
        <div className={styles.recentHistory}>
          {recentHistory.map((day) => {
            const isExpanded = expandedDays[day.date];
            const visibleRecords = isExpanded ? day.records : day.records.slice(0, 3);
            const hasMore = day.records.length > 3;

            return (
              <div key={day.date} className={styles.dayGroup}>
                <div className={styles.dayDate}>{formatDate(day.date, t, locale)}</div>
                <div className={styles.dayTags}>
                  {visibleRecords.map((record) => {
                    // Get service name with proper formatting
                    let serviceName: string;
                    const i18nKey = SERVICE_NAME_KEYS[record.service];

                    if (i18nKey) {
                      serviceName = t(i18nKey);
                      // If translation failed and returned the key itself, use fallback
                      if (serviceName === i18nKey || serviceName.includes('.')) {
                        serviceName = record.service
                          .replace(/([A-Z])/g, ' $1')
                          .split(/[-\s]/)
                          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                          .join(' ')
                          .trim();
                      }
                    } else {
                      // Convert camelCase or kebab-case to Title Case
                      serviceName = record.service
                        .replace(/([A-Z])/g, ' $1') // Add space before capital letters
                        .split(/[-\s]/) // Split by dash or space
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                        .join(' ')
                        .trim();
                    }

                    const serviceUrl = _SERVICE_URLS[record.service] || `/${record.service}`;

                    return (
                      <Link
                        key={record.id}
                        href={serviceUrl}
                        className={styles.serviceTag}
                      >
                        <span className={styles.tagIcon}>{SERVICE_ICONS[record.service] || "\uD83D\uDCD6"}</span>
                        <span className={styles.tagName}>{serviceName}</span>
                      </Link>
                    );
                  })}
                </div>
                {hasMore && (
                  <button
                    className={styles.showMoreBtn}
                    onClick={() => toggleDayExpanded(day.date)}
                  >
                    {isExpanded ? t("myjourney.activity.showLess", "Show Less") : `${t("myjourney.activity.showMore", "Show More")} (+${day.records.length - 3})`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.emptyHistory}>
          <p className={styles.emptyHint}>{t("myjourney.activity.empty", "No activity yet")}</p>
          <Link href="/destiny-map" className={styles.emptyHistoryCta}>
            {t("myjourney.activity.startFirst", "Start Your First Reading")} {"\u2192"}
          </Link>
        </div>
      )}
    </div>
  );
}
