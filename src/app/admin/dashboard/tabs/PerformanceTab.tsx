import React, { useState } from 'react'
import type { PerformanceData, TabRenderProps } from '../types'

type SortKey = 'endpoint' | 'totalRequests' | 'avgLatencyMs' | 'p95LatencyMs' | 'errorRate'
type SortOrder = 'asc' | 'desc'

export function PerformanceTab({
  data,
  styles,
  formatNumber,
  pct,
  SectionSkeleton,
}: { data: PerformanceData | undefined } & TabRenderProps) {
  const [sortKey, setSortKey] = useState<SortKey>('totalRequests')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  if (!data) return <SectionSkeleton />

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('desc')
    }
  }

  const sortedApiMetrics = [...data.apiMetrics].sort((a, b) => {
    const aVal = a[sortKey]
    const bVal = b[sortKey]
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    }
    return sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
  })

  const getSeverityClass = (severity: string) => {
    if (severity === 'critical') return styles.badgeDanger
    if (severity === 'warning') return styles.badgeWarning
    return styles.badge
  }

  const getStatusClass = (status: string) => {
    if (status === 'healthy') return styles.badgeSuccess
    if (status === 'degraded') return styles.badgeWarning
    return styles.badgeDanger
  }

  return (
    <>
      {/* System Health Summary */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>시스템 상태</h2>
        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>상태</div>
            <div className={styles.metricValue}>
              <span className={`${styles.badge} ${getStatusClass(data.systemHealth.status)}`}>
                {data.systemHealth.status === 'healthy' ? '정상' :
                 data.systemHealth.status === 'degraded' ? '저하' : '위험'}
              </span>
            </div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>메모리 사용량</div>
            <div className={styles.metricValue}>{formatNumber(data.systemHealth.memoryMb)} MB</div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>총 요청 수</div>
            <div className={styles.metricValue}>{formatNumber(data.systemHealth.totalRequests)}</div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>에러율</div>
            <div className={styles.metricValue}>{data.systemHealth.errorRatePercent.toFixed(2)}%</div>
          </div>
        </div>
      </section>

      {/* Bottlenecks */}
      {data.bottlenecks.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>병목 감지 ({data.bottlenecks.length}건)</h2>
          <div className={styles.bottleneckList}>
            {data.bottlenecks.map((b, i) => (
              <div key={i} className={`${styles.bottleneckCard} ${b.severity === 'critical' ? styles.bottleneckCritical : styles.bottleneckWarning}`}>
                <div className={styles.bottleneckHeader}>
                  <span className={`${styles.badge} ${getSeverityClass(b.severity)}`}>
                    {b.severity === 'critical' ? '심각' : '경고'}
                  </span>
                  <span className={styles.bottleneckIssue}>
                    {b.issue === 'slow_response' ? '느린 응답' : '높은 에러율'}
                  </span>
                </div>
                <div className={styles.bottleneckEndpoint}>{b.endpoint}</div>
                <div className={styles.bottleneckStats}>
                  평균 {b.avgLatencyMs.toFixed(0)}ms (기준: {b.threshold}ms)
                </div>
                <div className={styles.bottleneckRecommendation}>{b.recommendation}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* API Metrics Table */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>API 엔드포인트 성능</h2>
        {data.apiMetrics.length > 0 ? (
          <div className={styles.servicesTable}>
            <div className={styles.tableHeader}>
              <span onClick={() => handleSort('endpoint')} style={{ cursor: 'pointer' }}>
                엔드포인트 {sortKey === 'endpoint' && (sortOrder === 'asc' ? '↑' : '↓')}
              </span>
              <span onClick={() => handleSort('totalRequests')} style={{ cursor: 'pointer' }}>
                요청 수 {sortKey === 'totalRequests' && (sortOrder === 'asc' ? '↑' : '↓')}
              </span>
              <span onClick={() => handleSort('avgLatencyMs')} style={{ cursor: 'pointer' }}>
                평균 {sortKey === 'avgLatencyMs' && (sortOrder === 'asc' ? '↑' : '↓')}
              </span>
              <span onClick={() => handleSort('p95LatencyMs')} style={{ cursor: 'pointer' }}>
                p95 {sortKey === 'p95LatencyMs' && (sortOrder === 'asc' ? '↑' : '↓')}
              </span>
              <span onClick={() => handleSort('errorRate')} style={{ cursor: 'pointer' }}>
                에러율 {sortKey === 'errorRate' && (sortOrder === 'asc' ? '↑' : '↓')}
              </span>
            </div>
            {sortedApiMetrics.slice(0, 20).map((m, i) => (
              <div key={i} className={styles.tableRow}>
                <span title={m.endpoint}>{m.endpoint.length > 40 ? m.endpoint.slice(0, 40) + '...' : m.endpoint}</span>
                <span>{formatNumber(m.totalRequests)}</span>
                <span className={m.avgLatencyMs > 700 ? styles.textDanger : ''}>{m.avgLatencyMs.toFixed(0)}ms</span>
                <span className={m.p95LatencyMs > 700 ? styles.textDanger : ''}>{m.p95LatencyMs.toFixed(0)}ms</span>
                <span className={m.errorRate > 0.5 ? styles.textDanger : ''}>{m.errorRate.toFixed(2)}%</span>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>API 메트릭 데이터 없음</div>
        )}
      </section>

      {/* RAG Performance */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>RAG 파이프라인 성능</h2>
        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>총 트레이스</div>
            <div className={styles.metricValue}>{formatNumber(data.ragMetrics.totalTraces)}</div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>평균 시간</div>
            <div className={styles.metricValue}>{data.ragMetrics.avgDurationMs.toFixed(0)}ms</div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>p95</div>
            <div className={styles.metricValue}>{data.ragMetrics.p95DurationMs.toFixed(0)}ms</div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>에러율</div>
            <div className={styles.metricValue}>{(data.ragMetrics.errorRate * 100).toFixed(2)}%</div>
          </div>
        </div>

        {Object.keys(data.ragMetrics.sourceMetrics).length > 0 && (
          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>소스별 성능</h3>
            <div className={styles.servicesTable}>
              <div className={styles.tableHeader}>
                <span>소스</span>
                <span>호출 수</span>
                <span>평균</span>
                <span>p95</span>
              </div>
              {Object.entries(data.ragMetrics.sourceMetrics).map(([source, metrics]) => (
                <div key={source} className={styles.tableRow}>
                  <span>{source}</span>
                  <span>{formatNumber(metrics.count)}</span>
                  <span>{metrics.avgMs.toFixed(0)}ms</span>
                  <span>{metrics.p95Ms.toFixed(0)}ms</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Cache Performance */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>캐시 성능</h2>
        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>히트율</div>
            <div className={styles.metricValue}>{data.cacheMetrics.hitRate.toFixed(1)}%</div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${Math.min(data.cacheMetrics.hitRate, 100)}%` }}
              />
            </div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>히트/미스</div>
            <div className={styles.metricValue}>
              {formatNumber(data.cacheMetrics.hits)} / {formatNumber(data.cacheMetrics.misses)}
            </div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>백엔드</div>
            <div className={styles.metricValue}>
              <span className={`${styles.badge} ${data.cacheMetrics.backend === 'redis' ? styles.badgeSuccess : styles.badge}`}>
                {data.cacheMetrics.backend.toUpperCase()}
              </span>
            </div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>메모리 엔트리</div>
            <div className={styles.metricValue}>{formatNumber(data.cacheMetrics.memoryEntries)}</div>
          </div>
        </div>
      </section>

      {/* Distributed Traces */}
      {data.distributedTraces.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>최근 트레이스</h2>
          <div className={styles.servicesTable}>
            <div className={styles.tableHeader}>
              <span>트레이스 ID</span>
              <span>쿼리</span>
              <span>도메인</span>
              <span>시간</span>
              <span>상태</span>
            </div>
            {data.distributedTraces.slice(0, 10).map((t) => (
              <div key={t.traceId} className={styles.tableRow}>
                <span title={t.traceId}>{t.traceId.slice(0, 12)}...</span>
                <span title={t.query}>{t.query.slice(0, 30)}{t.query.length > 30 ? '...' : ''}</span>
                <span>{t.domain || '-'}</span>
                <span>{t.totalDurationMs.toFixed(0)}ms</span>
                <span>
                  <span className={`${styles.badge} ${t.hasError ? styles.badgeDanger : styles.badgeSuccess}`}>
                    {t.hasError ? '에러' : '정상'}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
