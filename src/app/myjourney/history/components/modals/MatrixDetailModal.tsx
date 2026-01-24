import type { DestinyMatrixContent } from '../../lib';
import { logger } from '@/lib/logger';
import styles from '../../history.module.css';

type MatrixDetailModalProps = {
  detail: DestinyMatrixContent;
};

export function MatrixDetailModal({ detail }: MatrixDetailModalProps) {
  return (
    <div className={styles.matrixDetail}>
      {/* Header */}
      <div className={styles.modalHeader}>
        <h3>
          🔷 {detail.title}
        </h3>
      </div>

      {/* Score Badge */}
      {detail.overallScore !== undefined && (
        <div className={styles.scoreSection}>
          <div className={styles.scoreBadge}>
            {detail.grade && (
              <span className={styles.gradeEmoji}>
                {detail.grade === 'S' ? '⭐' :
                 detail.grade === 'A' ? '💫' :
                 detail.grade === 'B' ? '✨' :
                 detail.grade === 'C' ? '💠' : '🔷'}
              </span>
            )}
            <span className={styles.scoreText}>{detail.overallScore}/100</span>
            {detail.grade && (
              <span className={styles.gradeLabel}>{detail.grade} 등급</span>
            )}
          </div>
        </div>
      )}

      {/* Summary */}
      {detail.summary && (
        <div className={styles.section}>
          <h4>요약</h4>
          <p>{detail.summary}</p>
        </div>
      )}

      {/* Report Info */}
      <div className={styles.section}>
        <h4>리포트 정보</h4>
        <p className={styles.infoLabel}>
          유형: {detail.reportType === 'timing' ? '타이밍 리포트' : '테마 리포트'}
        </p>
        {detail.period && (
          <p className={styles.infoLabel}>기간: {
            detail.period === 'daily' ? '일간' :
            detail.period === 'monthly' ? '월간' :
            detail.period === 'yearly' ? '연간' : '종합'
          }</p>
        )}
        {detail.theme && (
          <p className={styles.infoLabel}>테마: {
            detail.theme === 'love' ? '연애운' :
            detail.theme === 'career' ? '직업운' :
            detail.theme === 'wealth' ? '재물운' :
            detail.theme === 'health' ? '건강운' : '가정운'
          }</p>
        )}
      </div>

      {/* PDF Download Button - PDF generation not yet supported for timing/themed reports */}
      <div className={styles.actionSection}>
        <button
          className={styles.pdfButton}
          disabled
          title="PDF 다운로드 기능은 준비 중입니다"
        >
          📄 PDF 다운로드 (준비중)
        </button>
      </div>

      {/* Timestamp */}
      <p className={styles.timestamp}>
        {new Date(detail.createdAt).toLocaleString()}
      </p>
    </div>
  );
}
