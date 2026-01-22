import type { CalendarContent } from '@/app/myjourney/history/lib/types';
import { getGradeEmoji, getGradeLabel, getCategoryDisplay } from '@/app/myjourney/history/lib/helpers';
import styles from './DetailModal.module.css';

type CalendarDetailProps = {
  detail: CalendarContent;
};

export function CalendarDetail({ detail }: CalendarDetailProps) {
  return (
    <div className={styles.calendarDetail}>
      {/* Header */}
      <div className={styles.destinyHeader}>
        <span className={styles.destinyIcon}>📅</span>
        <div>
          <h2>운명 캘린더</h2>
          <p className={styles.destinyTheme}>
            {detail.date}
          </p>
        </div>
      </div>

      {/* Grade & Score */}
      <div className={styles.calendarGrade}>
        <span className={styles.gradeEmoji}>
          {getGradeEmoji(detail.grade)}
        </span>
        <span className={styles.gradeLabel}>
          {getGradeLabel(detail.grade)}
        </span>
        <span className={styles.scoreText}>점수: {detail.score}/100</span>
      </div>

      {/* Title & Summary */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>{detail.title}</h3>
        {detail.summary && (
          <p className={styles.calendarSummary}>{detail.summary}</p>
        )}
        <p>{detail.description}</p>
      </div>

      {/* Categories */}
      {detail.categories && detail.categories.length > 0 && (
        <div className={styles.calendarCategories}>
          {detail.categories.map((cat, i) => (
            <span key={i} className={styles.categoryTag}>
              {getCategoryDisplay(cat)}
            </span>
          ))}
        </div>
      )}

      {/* Best Times */}
      {detail.bestTimes && detail.bestTimes.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>⏰ 좋은 시간대</h3>
          <div className={styles.bestTimesList}>
            {detail.bestTimes.map((time, i) => (
              <span key={i} className={styles.bestTimeItem}>{time}</span>
            ))}
          </div>
        </div>
      )}

      {/* Analysis */}
      {((detail.sajuFactors && detail.sajuFactors.length > 0) ||
        (detail.astroFactors && detail.astroFactors.length > 0)) && (
        <div className={styles.aiSection}>
          <h3 className={styles.aiSectionTitle}>
            <span>✨</span> 운세 분석
          </h3>
          <ul className={styles.analysisList}>
            {[...(detail.sajuFactors || []), ...(detail.astroFactors || [])].map((factor, i) => (
              <li key={i}>{factor}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {detail.recommendations && detail.recommendations.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>✨ 오늘의 행운 키</h3>
          <ul>
            {detail.recommendations.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {detail.warnings && detail.warnings.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>⚡ 주의사항</h3>
          <ul>
            {detail.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Timestamp */}
      <p className={styles.timestamp}>
        저장일: {new Date(detail.createdAt).toLocaleString()}
      </p>
    </div>
  );
}
