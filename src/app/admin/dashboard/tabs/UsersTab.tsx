import React from 'react'
import type { UsersData, TabRenderProps } from '../types'

export function UsersTab({
  data,
  styles,
  formatNumber,
  formatDate,
  pct,
  getBadgeClass,
  renderDistribution,
  renderTableInfo,
  SectionSkeleton,
}: { data: UsersData | undefined } & TabRenderProps) {
  if (!data) return <SectionSkeleton />

  return (
    <>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>사용자 요약</h2>
        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>전체 사용자</div>
            <div className={styles.metricValue}>{formatNumber(data.totalUsers)}</div>
          </div>
          {data.roleDistribution.map((r) => (
            <div key={r.role} className={styles.metricCard}>
              <div className={styles.metricLabel}>{r.role}</div>
              <div className={styles.metricValue}>{formatNumber(r.count)}</div>
              <div className={styles.statRate}>{pct(r.count, data.totalUsers)}</div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>플랜 분포</h2>
        {renderDistribution(data.planDistribution.map((p) => ({ label: p.plan, count: p.count })))}
      </section>

      {data.oauthProviders && data.oauthProviders.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>OAuth 가입 경로</h2>
          {renderDistribution(
            data.oauthProviders.map((p) => ({ label: p.provider, count: p.count }))
          )}
        </section>
      )}

      {data.interactionsByService && data.interactionsByService.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>서비스별 이용 현황</h2>
          {renderDistribution(
            data.interactionsByService.map((s) => ({ label: s.service, count: s.count }))
          )}
        </section>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>최근 가입자</h2>
        {data.recentSignups.length > 0 ? (
          <div className={styles.servicesTable}>
            <div className={styles.tableHeader}>
              <span>이메일</span>
              <span>이름</span>
              <span>역할</span>
              <span>가입일</span>
            </div>
            {data.recentSignups.map((u) => (
              <div key={u.id} className={styles.tableRow}>
                <span>{u.email || '—'}</span>
                <span>{u.name || '—'}</span>
                <span>
                  <span className={`${styles.badge} ${getBadgeClass(u.role)}`}>{u.role}</span>
                </span>
                <span>{formatDate(u.createdAt)}</span>
              </div>
            ))}
            {renderTableInfo(data.recentSignups.length, `전체 ${formatNumber(data.totalUsers)}명`)}
          </div>
        ) : (
          <div className={styles.emptyState}>해당 기간 가입자 없음</div>
        )}
      </section>
    </>
  )
}
