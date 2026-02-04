import React from 'react'
import type { ContentData, TabRenderProps } from '../types'

export function ContentTab({
  data,
  styles,
  formatNumber,
  pct,
  renderDistribution,
  SectionSkeleton,
}: { data: ContentData | undefined } & TabRenderProps) {
  if (!data) return <SectionSkeleton />

  const totalContent =
    data.consultations.count +
    data.destinyMatrix.count +
    data.tarotReadings.count +
    data.pastLifeCount +
    data.compatibilityCount

  return (
    <>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>콘텐츠 생성 ({formatNumber(totalContent)}건)</h2>
        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>상담</div>
            <div className={styles.metricValue}>{formatNumber(data.consultations.count)}</div>
            <div className={styles.statRate}>{pct(data.consultations.count, totalContent)}</div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>운명 리포트</div>
            <div className={styles.metricValue}>{formatNumber(data.destinyMatrix.count)}</div>
            <div className={styles.metricSubtext}>
              PDF: {formatNumber(data.destinyMatrix.pdfGenerated)}
            </div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>타로</div>
            <div className={styles.metricValue}>{formatNumber(data.tarotReadings.count)}</div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>전생</div>
            <div className={styles.metricValue}>{formatNumber(data.pastLifeCount)}</div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>궁합</div>
            <div className={styles.metricValue}>{formatNumber(data.compatibilityCount)}</div>
          </div>
        </div>
      </section>

      {data.readingsByType.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>리딩 유형별</h2>
          {renderDistribution(data.readingsByType.map((r) => ({ label: r.type, count: r.count })))}
        </section>
      )}
      {data.consultations.byTheme.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>상담 테마별</h2>
          {renderDistribution(
            data.consultations.byTheme.map((c) => ({ label: c.theme, count: c.count }))
          )}
        </section>
      )}
      {data.tarotReadings.byTheme.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>타로 테마별</h2>
          {renderDistribution(
            data.tarotReadings.byTheme.map((t) => ({ label: t.theme || 'general', count: t.count }))
          )}
        </section>
      )}
      {data.destinyMatrix.byType.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>운명 리포트 유형별</h2>
          {renderDistribution(
            data.destinyMatrix.byType.map((d) => ({ label: d.reportType, count: d.count }))
          )}
        </section>
      )}
      {data.personalityTypes && data.personalityTypes.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>성격 유형 분포</h2>
          {renderDistribution(
            data.personalityTypes.map((p) => ({ label: p.typeCode, count: p.count }))
          )}
        </section>
      )}
    </>
  )
}
