import React from 'react'
import type { MatchingData, TabRenderProps } from '../types'

export function MatchingTab({
  data,
  styles,
  formatNumber,
  pct,
  renderDistribution,
  SectionSkeleton,
}: { data: MatchingData | undefined } & TabRenderProps) {
  if (!data) return <SectionSkeleton />

  const totalSwipes = data.swipeStats.reduce((sum, s) => sum + s.count, 0)
  const likes = data.swipeStats.find((s) => s.action === 'like')?.count || 0

  return (
    <>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>프로필 현황</h2>
        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>전체</div>
            <div className={styles.metricValue}>{formatNumber(data.totalProfiles)}</div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>활성</div>
            <div className={styles.metricValue} style={{ color: '#22c55e' }}>
              {formatNumber(data.activeProfiles)}
            </div>
            <div className={styles.statRate}>{pct(data.activeProfiles, data.totalProfiles)}</div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>인증됨</div>
            <div className={styles.metricValue} style={{ color: '#3b82f6' }}>
              {formatNumber(data.verifiedProfiles)}
            </div>
            <div className={styles.statRate}>{pct(data.verifiedProfiles, data.totalProfiles)}</div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>스와이프 ({formatNumber(totalSwipes)}건)</h2>
        {renderDistribution(data.swipeStats.map((s) => ({ label: s.action, count: s.count })))}
        {totalSwipes > 0 && (
          <div className={styles.statRate} style={{ marginTop: '0.5rem' }}>
            Like 비율: {pct(likes, totalSwipes)} | 매칭 전환율: {pct(data.connections.count, likes)}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>커넥션 & 메시지</h2>
        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>매칭 성사</div>
            <div className={styles.metricValue}>{formatNumber(data.connections.count)}</div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>평균 궁합</div>
            <div className={styles.metricValue}>
              {data.connections.avgCompatibility?.toFixed(0) || '—'}
            </div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>채팅 시작</div>
            <div className={styles.metricValue}>{formatNumber(data.chatStartedCount)}</div>
            <div className={styles.statRate}>
              {pct(data.chatStartedCount, data.connections.count)}
            </div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>메시지</div>
            <div className={styles.metricValue}>{formatNumber(data.messageCount)}</div>
          </div>
        </div>
      </section>
    </>
  )
}
