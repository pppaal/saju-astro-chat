import type { ICPContent } from '@/app/myjourney/history/lib/types';
import styles from './DetailModal.module.css';

type ICPDetailProps = {
  detail: ICPContent;
};

export function ICPDetail({ detail }: ICPDetailProps) {
  return (
    <div className={styles.icpDetail}>
      {/* Header */}
      <div className={styles.destinyHeader}>
        <span className={styles.destinyIcon}>🔄</span>
        <div>
          <h2>ICP 대인관계 스타일</h2>
          <p className={styles.destinyTheme}>
            {detail.primaryStyle}
            {detail.secondaryStyle && ` / ${detail.secondaryStyle}`}
          </p>
        </div>
      </div>

      {/* Description */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>스타일 설명</h3>
        <p>{detail.analysisData.descriptionKo || detail.analysisData.description}</p>
      </div>

      {/* Scores */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>축 점수</h3>
        <div className={styles.scoreGrid}>
          <div className={styles.scoreBox}>
            <span className={styles.scoreLabel}>지배성 (Dominance)</span>
            <span className={styles.scoreValue}>{detail.dominanceScore}/100</span>
          </div>
          <div className={styles.scoreBox}>
            <span className={styles.scoreLabel}>친화성 (Affiliation)</span>
            <span className={styles.scoreValue}>{detail.affiliationScore}/100</span>
          </div>
        </div>
      </div>

      {/* Strengths */}
      {detail.analysisData.strengths && detail.analysisData.strengths.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>✨ 강점</h3>
          <ul>
            {(detail.analysisData.strengthsKo || detail.analysisData.strengths).map((strength, i) => (
              <li key={i}>{strength}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Challenges */}
      {detail.analysisData.challenges && detail.analysisData.challenges.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>⚡ 성장 과제</h3>
          <ul>
            {(detail.analysisData.challengesKo || detail.analysisData.challenges).map((challenge, i) => (
              <li key={i}>{challenge}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Timestamp */}
      <p className={styles.timestamp}>
        {new Date(detail.createdAt).toLocaleString()}
      </p>
    </div>
  );
}
