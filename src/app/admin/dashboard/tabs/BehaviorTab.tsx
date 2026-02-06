import React from 'react'
import type { BehaviorData, TabRenderProps } from '../types'

export function BehaviorTab({
  data,
  styles,
  formatNumber,
  pct,
  SectionSkeleton,
}: { data: BehaviorData | undefined } & TabRenderProps) {
  if (!data) return <SectionSkeleton />

  const getRetentionColor = (rate: number) => {
    if (rate >= 60) return '#22c55e' // green
    if (rate >= 40) return '#84cc16' // lime
    if (rate >= 20) return '#eab308' // yellow
    if (rate >= 10) return '#f97316' // orange
    return '#ef4444' // red
  }

  const getRiskColor = (score: number) => {
    if (score >= 80) return styles.badgeDanger
    if (score >= 50) return styles.badgeWarning
    return styles.badge
  }

  return (
    <>
      {/* User Activity Summary */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>사용자 활동 요약</h2>
        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>오늘 활성</div>
            <div className={styles.metricValue}>{formatNumber(data.userActivitySummary.totalActiveToday)}</div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>이번 주 활성</div>
            <div className={styles.metricValue}>{formatNumber(data.userActivitySummary.totalActiveThisWeek)}</div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>이번 달 활성</div>
            <div className={styles.metricValue}>{formatNumber(data.userActivitySummary.totalActiveThisMonth)}</div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>오늘 가입</div>
            <div className={styles.metricValue}>{formatNumber(data.userActivitySummary.newUsersToday)}</div>
          </div>
        </div>
      </section>

      {/* Retention Funnel */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>리텐션 퍼널</h2>
        {data.retentionFunnel.stages.length > 0 ? (
          <>
            <div className={styles.funnelContainer}>
              {data.retentionFunnel.stages.map((stage, i) => {
                const widthPercent = Math.max(stage.conversionRate, 5)
                return (
                  <div key={stage.name} className={styles.funnelStage}>
                    <div className={styles.funnelLabel}>
                      <span>{stage.label}</span>
                      <span>{formatNumber(stage.count)}</span>
                    </div>
                    <div className={styles.funnelBarContainer}>
                      <div
                        className={styles.funnelBar}
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                    <div className={styles.funnelStats}>
                      <span>전환율: {stage.conversionRate}%</span>
                      {i > 0 && <span>이탈률: {stage.dropoffRate}%</span>}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className={styles.funnelSummary}>
              전체 전환율: <strong>{data.retentionFunnel.overallConversion}%</strong>
            </div>
          </>
        ) : (
          <div className={styles.emptyState}>퍼널 데이터 없음</div>
        )}
      </section>

      {/* Cohort Analysis */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>코호트 리텐션 분석</h2>
        {data.cohortAnalysis.cohorts.length > 0 ? (
          <>
            <div className={styles.cohortTable}>
              <div className={styles.cohortHeader}>
                <span className={styles.cohortPeriod}>기간</span>
                <span className={styles.cohortUsers}>사용자</span>
                <span>W0</span>
                <span>W1</span>
                <span>W2</span>
                <span>W3</span>
                <span>W4</span>
              </div>
              {data.cohortAnalysis.cohorts.map((cohort) => (
                <div key={cohort.period} className={styles.cohortRow}>
                  <span className={styles.cohortPeriod}>{cohort.period}</span>
                  <span className={styles.cohortUsers}>{formatNumber(cohort.totalUsers)}</span>
                  {cohort.retentionByWeek.map((rate, i) => (
                    <span
                      key={i}
                      className={styles.cohortCell}
                      style={{ backgroundColor: getRetentionColor(rate), color: rate > 40 ? '#fff' : '#000' }}
                    >
                      {rate.toFixed(0)}%
                    </span>
                  ))}
                </div>
              ))}
            </div>
            <div className={styles.cohortSummary}>
              평균 4주 리텐션: <strong>{data.cohortAnalysis.avgRetentionRate}%</strong>
            </div>
          </>
        ) : (
          <div className={styles.emptyState}>코호트 데이터 없음</div>
        )}
      </section>

      {/* Churn Prediction */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>이탈 예측</h2>
        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>위험 사용자</div>
            <div className={styles.metricValue}>{formatNumber(data.churnPrediction.totalAtRisk)}</div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>30일 내 예상 이탈</div>
            <div className={styles.metricValue}>{formatNumber(data.churnPrediction.predictedChurnNext30Days)}</div>
          </div>
        </div>

        {data.churnPrediction.atRiskUsers.length > 0 && (
          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>이탈 위험 사용자 목록</h3>
            <div className={styles.servicesTable}>
              <div className={styles.tableHeader}>
                <span>이메일</span>
                <span>이름</span>
                <span>미활동 일수</span>
                <span>위험 점수</span>
                <span>위험 요인</span>
              </div>
              {data.churnPrediction.atRiskUsers.slice(0, 20).map((user) => (
                <div key={user.userId} className={styles.tableRow}>
                  <span>{user.email || '—'}</span>
                  <span>{user.name || '—'}</span>
                  <span>{user.daysSinceLastActivity}일</span>
                  <span>
                    <span className={`${styles.badge} ${getRiskColor(user.riskScore)}`}>
                      {user.riskScore}
                    </span>
                  </span>
                  <span>
                    {user.riskFactors.map((factor, i) => (
                      <span key={i} className={styles.riskFactor}>
                        {factor === 'inactive_7d' && '7일 미접속'}
                        {factor === 'inactive_14d' && '14일 미접속'}
                        {factor === 'inactive_30d' && '30일 미접속'}
                        {factor === 'cancelled_subscription' && '구독 취소'}
                        {factor === 'no_readings_14d' && '14일 리딩 없음'}
                        {i < user.riskFactors.length - 1 && ', '}
                      </span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Engagement by Service */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>서비스별 참여도</h2>
        {data.engagementByService.length > 0 ? (
          <div className={styles.servicesTable}>
            <div className={styles.tableHeader}>
              <span>서비스</span>
              <span>DAU</span>
              <span>WAU</span>
              <span>MAU</span>
              <span>총 리딩</span>
            </div>
            {data.engagementByService.map((service) => (
              <div key={service.service} className={styles.tableRow}>
                <span>{service.service}</span>
                <span>{formatNumber(service.dailyActiveUsers)}</span>
                <span>{formatNumber(service.weeklyActiveUsers)}</span>
                <span>{formatNumber(service.monthlyActiveUsers)}</span>
                <span>{formatNumber(service.totalReadings)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>서비스별 데이터 없음</div>
        )}
      </section>
    </>
  )
}
