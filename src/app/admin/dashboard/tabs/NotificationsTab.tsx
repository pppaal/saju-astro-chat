import React from 'react'
import type { NotificationsData, TabRenderProps } from '../types'

export function NotificationsTab({
  data,
  styles,
  formatNumber,
  formatDate,
  pct,
  getBadgeClass,
  renderDistribution,
  renderTableInfo,
  SectionSkeleton,
}: { data: NotificationsData | undefined } & TabRenderProps) {
  if (!data) return <SectionSkeleton />

  const totalEmails = data.emailByStatus.reduce((sum, e) => sum + e.count, 0)
  const failedCount = data.emailByStatus.find((e) => e.status === 'failed')?.count || 0

  return (
    <>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>이메일 ({formatNumber(totalEmails)}건)</h2>
        <div className={styles.metricsGrid}>
          {data.emailByStatus.map((e) => (
            <div key={e.status} className={styles.metricCard}>
              <div className={styles.metricLabel}>{e.status}</div>
              <div className={styles.metricValue}>{formatNumber(e.count)}</div>
              <span className={`${styles.badge} ${getBadgeClass(e.status)}`}>{e.status}</span>
            </div>
          ))}
        </div>
        {totalEmails > 0 && (
          <div className={styles.statRate} style={{ marginTop: '0.75rem' }}>
            실패율: {pct(failedCount, totalEmails)}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>이메일 유형별</h2>
        {renderDistribution(data.emailByType.map((e) => ({ label: e.type, count: e.count })))}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>푸시 알림</h2>
        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>활성 구독</div>
            <div className={styles.metricValue} style={{ color: '#22c55e' }}>
              {formatNumber(data.activePushSubscriptions)}
            </div>
            <div className={styles.statRate}>
              {pct(data.activePushSubscriptions, data.totalPushSubscriptions)}
            </div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>전체 구독</div>
            <div className={styles.metricValue}>{formatNumber(data.totalPushSubscriptions)}</div>
          </div>
        </div>
      </section>

      {data.recentEmails.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>최근 이메일</h2>
          <div className={styles.servicesTable}>
            <div className={styles.tableHeader}>
              <span>수신자</span>
              <span>유형</span>
              <span>상태</span>
              <span>일시</span>
            </div>
            {data.recentEmails.map((e) => (
              <div key={e.id} className={styles.tableRow}>
                <span>{e.email}</span>
                <span>{e.type}</span>
                <span>
                  <span className={`${styles.badge} ${getBadgeClass(e.status)}`}>{e.status}</span>
                </span>
                <span>{formatDate(e.createdAt)}</span>
              </div>
            ))}
            {renderTableInfo(data.recentEmails.length, '이메일 로그')}
          </div>
        </section>
      )}
    </>
  )
}
