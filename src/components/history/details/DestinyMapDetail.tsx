import Link from 'next/link';
import type { DestinyMapContent } from '@/app/myjourney/history/lib/types';
import { getThemeDisplayName } from '@/app/myjourney/history/lib/helpers';
import styles from './DetailModal.module.css';

type DestinyMapDetailProps = {
  detail: DestinyMapContent;
};

export function DestinyMapDetail({ detail }: DestinyMapDetailProps) {
  return (
    <div className={styles.destinyMapDetail}>
      {/* Header */}
      <div className={styles.destinyHeader}>
        <span className={styles.destinyIcon}>🗺️</span>
        <div>
          <h2>Destiny Map</h2>
          <p className={styles.destinyTheme}>
            {getThemeDisplayName(detail.theme)}
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>요약</h3>
        <p>{detail.summary}</p>
      </div>

      {/* Full Report */}
      {detail.fullReport ? (
        <div className={styles.aiSection}>
          <h3 className={styles.aiSectionTitle}>
            <span>✨</span> 상세 분석
          </h3>
          <div className={styles.aiBlock}>
            <div className={styles.fullReport}>
              {detail.fullReport}
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.premiumRequired}>
          <span className={styles.lockIcon}>🔒</span>
          <p>상세 내용은 프리미엄 구독자 전용입니다.</p>
          <Link href="/pricing" className={styles.upgradeLink}>
            프리미엄 구독하기
          </Link>
        </div>
      )}

      {/* User Question */}
      {detail.userQuestion && (
        <div className={styles.questionBox}>
          <span className={styles.questionIcon}>❓</span>
          <p>{detail.userQuestion}</p>
        </div>
      )}

      {/* Timestamp */}
      <p className={styles.timestamp}>
        {new Date(detail.createdAt).toLocaleString()}
      </p>
    </div>
  );
}
