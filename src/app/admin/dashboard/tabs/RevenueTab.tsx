import React from 'react'
import type { RevenueData, TabRenderProps } from '../types'

export function RevenueTab({
  data,
  styles,
  formatNumber,
  formatDate,
  formatCurrency: _formatCurrency,
  pct,
  renderDistribution: _renderDistribution,
  renderTableInfo,
  SectionSkeleton,
}: { data: RevenueData | undefined } & TabRenderProps) {
  if (!data) return <SectionSkeleton />

  return (
    <>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>서비스별 크레딧 사용</h2>
        {data.creditUsageByService.length > 0 ? (
          <div className={styles.servicesTable}>
            <div className={styles.tableHeader}>
              <span>서비스</span>
              <span>크레딧</span>
              <span>접근수</span>
              <span>평균</span>
            </div>
            {data.creditUsageByService.map((c) => (
              <div key={c.service} className={styles.tableRow}>
                <span className={styles.serviceName}>{c.service}</span>
                <span>{formatNumber(c.totalCredits)}</span>
                <span>{formatNumber(c.accessCount)}</span>
                <span>{c.accessCount > 0 ? (c.totalCredits / c.accessCount).toFixed(1) : '0'}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>크레딧 사용 기록 없음</div>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>보너스 크레딧</h2>
        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>총 지급</div>
            <div className={styles.metricValue}>
              {formatNumber(data.bonusCreditStats.totalAmount)}
            </div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>잔여</div>
            <div className={styles.metricValue}>
              {formatNumber(data.bonusCreditStats.totalRemaining)}
            </div>
            <div className={styles.statRate}>
              소진율{' '}
              {pct(
                data.bonusCreditStats.totalAmount - data.bonusCreditStats.totalRemaining,
                data.bonusCreditStats.totalAmount
              )}
            </div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>구매 건수</div>
            <div className={styles.metricValue}>
              {formatNumber(data.bonusCreditStats.purchaseCount)}
            </div>
          </div>
        </div>
      </section>

      {data.recentRefunds.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>최근 환불</h2>
          <div className={styles.servicesTable}>
            <div className={styles.tableHeader}>
              <span>유형</span>
              <span>수량</span>
              <span>사유</span>
              <span>일시</span>
            </div>
            {data.recentRefunds.map((r) => (
              <div key={r.id} className={styles.tableRow}>
                <span>{r.creditType}</span>
                <span style={{ color: '#ef4444' }}>{formatNumber(r.amount)}</span>
                <span>{r.reason}</span>
                <span>{formatDate(r.createdAt)}</span>
              </div>
            ))}
            {renderTableInfo(data.recentRefunds.length, '환불 로그')}
          </div>
        </section>
      )}
    </>
  )
}
