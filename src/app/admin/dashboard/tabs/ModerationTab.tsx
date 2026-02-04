import React from 'react'
import type { ModerationData, TabRenderProps } from '../types'

export function ModerationTab({
  data,
  styles,
  formatNumber,
  formatDate,
  getBadgeClass,
  renderTableInfo,
  SectionSkeleton,
}: { data: ModerationData | undefined } & TabRenderProps) {
  if (!data) return <SectionSkeleton />

  const totalReports = data.reportsByStatus.reduce((sum, r) => sum + r.count, 0)
  const pendingReports = data.reportsByStatus.find((r) => r.status === 'pending')?.count || 0

  return (
    <>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          신고 현황 ({formatNumber(totalReports)}건)
          {pendingReports > 0 && (
            <span style={{ color: '#eab308', marginLeft: '0.5rem' }}>
              미처리 {pendingReports}건
            </span>
          )}
        </h2>
        <div className={styles.metricsGrid}>
          {data.reportsByStatus.map((r) => (
            <div key={r.status} className={styles.metricCard}>
              <div className={styles.metricLabel}>{r.status}</div>
              <div className={styles.metricValue}>{formatNumber(r.count)}</div>
              <span className={`${styles.badge} ${getBadgeClass(r.status)}`}>{r.status}</span>
            </div>
          ))}
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>차단</div>
            <div className={styles.metricValue}>{formatNumber(data.totalBlocks)}</div>
          </div>
        </div>
      </section>

      {data.recentReports.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>최근 신고</h2>
          <div className={styles.servicesTable}>
            <div className={styles.tableHeader}>
              <span>신고자</span>
              <span>대상</span>
              <span>분류</span>
              <span>상태</span>
            </div>
            {data.recentReports.map((r) => (
              <div key={r.id} className={styles.tableRow}>
                <span>{r.reporterEmail || '—'}</span>
                <span>{r.reportedEmail || '—'}</span>
                <span>{r.category}</span>
                <span>
                  <span className={`${styles.badge} ${getBadgeClass(r.status)}`}>{r.status}</span>
                </span>
              </div>
            ))}
            {renderTableInfo(data.recentReports.length, '신고 목록')}
          </div>
        </section>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>리퍼럴 보상</h2>
        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>총 보상</div>
            <div className={styles.metricValue}>
              {formatNumber(data.referralStats.totalRewards)}
            </div>
            <div className={styles.metricSubtext}>건</div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>지급 크레딧</div>
            <div className={styles.metricValue}>
              {formatNumber(data.referralStats.totalCredits)}
            </div>
          </div>
          {data.referralByStatus.map((r) => (
            <div key={r.status} className={styles.metricCard}>
              <div className={styles.metricLabel}>{r.status}</div>
              <div className={styles.metricValue}>{formatNumber(r.count)}</div>
              <span className={`${styles.badge} ${getBadgeClass(r.status)}`}>{r.status}</span>
            </div>
          ))}
        </div>
      </section>

      {data.recentBlocks.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>최근 차단</h2>
          <div className={styles.servicesTable}>
            <div className={styles.tableHeader}>
              <span>차단자</span>
              <span>대상</span>
              <span>사유</span>
              <span>일시</span>
            </div>
            {data.recentBlocks.map((b) => (
              <div key={b.id} className={styles.tableRow}>
                <span>{b.blockerEmail || '—'}</span>
                <span>{b.blockedEmail || '—'}</span>
                <span>{b.reason || '—'}</span>
                <span>{formatDate(b.createdAt)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
