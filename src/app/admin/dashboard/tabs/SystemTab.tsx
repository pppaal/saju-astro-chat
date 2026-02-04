import React from 'react'
import type { SystemData, TabRenderProps } from '../types'

export function SystemTab({
  data,
  styles,
  formatNumber,
  formatDate,
  pct,
  renderDistribution,
  renderTableInfo,
  SectionSkeleton,
}: { data: SystemData | undefined } & TabRenderProps) {
  if (!data) return <SectionSkeleton />

  const totalStripe = data.stripeEvents.byType.reduce((s, e) => s + e.count, 0)

  return (
    <>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>크레딧 환불</h2>
        {data.creditRefunds.byType.length > 0 ? (
          <div className={styles.metricsGrid}>
            {data.creditRefunds.byType.map((c) => (
              <div key={c.creditType} className={styles.metricCard}>
                <div className={styles.metricLabel}>{c.creditType}</div>
                <div className={styles.metricValue}>{formatNumber(c.totalAmount)}</div>
                <div className={styles.metricSubtext}>{formatNumber(c.count)}건</div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>환불 기록 없음</div>
        )}
      </section>

      {data.creditRefunds.byReason.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>환불 사유별</h2>
          {renderDistribution(
            data.creditRefunds.byReason.map((c) => ({ label: c.reason, count: c.count }))
          )}
        </section>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Stripe 이벤트 ({formatNumber(totalStripe)}건)</h2>
        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>성공</div>
            <div className={styles.metricValue} style={{ color: '#22c55e' }}>
              {formatNumber(totalStripe - data.stripeEvents.failureCount)}
            </div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>실패</div>
            <div className={styles.metricValue} style={{ color: '#ef4444' }}>
              {formatNumber(data.stripeEvents.failureCount)}
            </div>
            <div className={styles.statRate}>
              실패율: {pct(data.stripeEvents.failureCount, totalStripe)}
            </div>
          </div>
        </div>
      </section>

      {data.stripeEvents.byType.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>이벤트 유형별</h2>
          {renderDistribution(
            data.stripeEvents.byType.map((s) => ({ label: s.type, count: s.count }))
          )}
        </section>
      )}

      {data.stripeEvents.recent.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>최근 Stripe 이벤트</h2>
          <div className={styles.servicesTable}>
            <div className={styles.tableHeader}>
              <span>유형</span>
              <span>Event ID</span>
              <span>결과</span>
              <span>일시</span>
            </div>
            {data.stripeEvents.recent.map((s) => (
              <div key={s.id} className={styles.tableRow}>
                <span className={styles.serviceName}>{s.type}</span>
                <span style={{ fontSize: '0.75rem' }}>{s.eventId.slice(0, 20)}...</span>
                <span>
                  <span
                    className={`${styles.badge} ${s.success ? styles.badgeActive : styles.badgeFailed}`}
                  >
                    {s.success ? 'OK' : 'FAIL'}
                  </span>
                </span>
                <span>{formatDate(s.processedAt)}</span>
              </div>
            ))}
            {renderTableInfo(data.stripeEvents.recent.length, 'Stripe 로그')}
          </div>
        </section>
      )}

      {data.sharedResults.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>공유 결과</h2>
          <div className={styles.servicesTable}>
            <div className={styles.tableHeader}>
              <span>유형</span>
              <span>공유수</span>
              <span>조회수</span>
              <span>평균</span>
            </div>
            {data.sharedResults.map((s) => (
              <div key={s.resultType} className={styles.tableRow}>
                <span className={styles.serviceName}>{s.resultType}</span>
                <span>{formatNumber(s.count)}</span>
                <span>{formatNumber(s.totalViews)}</span>
                <span>{s.count > 0 ? (s.totalViews / s.count).toFixed(1) : '0'}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
