import React from 'react'
import type { AuditData, TabRenderProps } from '../types'

export function AuditTab({
  data,
  styles,
  formatNumber,
  formatDate,
  renderDistribution,
  renderTableInfo,
  SectionSkeleton,
}: { data: AuditData | undefined } & TabRenderProps) {
  if (!data) return <SectionSkeleton />

  return (
    <>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>감사 로그 ({formatNumber(data.totalLogs)}건)</h2>
        {data.actionBreakdown.length > 0 &&
          renderDistribution(
            data.actionBreakdown.map((a) => ({ label: a.action, count: a.count }))
          )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>최근 어드민 액션</h2>
        {data.recentLogs.length > 0 ? (
          <div className={styles.servicesTable}>
            <div className={styles.tableHeader5col}>
              <span>어드민</span>
              <span>액션</span>
              <span>대상</span>
              <span>결과</span>
              <span>일시</span>
            </div>
            {data.recentLogs.map((l) => (
              <div key={l.id} className={styles.tableRow5col}>
                <span>{l.adminEmail}</span>
                <span className={styles.serviceName}>{l.action}</span>
                <span>{l.targetType ? `${l.targetType}:${l.targetId || ''}` : '—'}</span>
                <span>
                  <span
                    className={`${styles.badge} ${l.success ? styles.badgeActive : styles.badgeFailed}`}
                  >
                    {l.success ? 'OK' : 'FAIL'}
                  </span>
                </span>
                <span>{formatDate(l.createdAt)}</span>
              </div>
            ))}
            {renderTableInfo(data.recentLogs.length, `전체 ${formatNumber(data.totalLogs)}건`)}
          </div>
        ) : (
          <div className={styles.emptyState}>감사 로그 없음</div>
        )}
      </section>
    </>
  )
}
