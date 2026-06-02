'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import styles from './dashboard.module.css'
import { SLA_THRESHOLDS } from '@/lib/metrics/schema'
import { formatNumber } from '@/utils/numberFormat'
import type {
  FunnelMetrics,
  PerformanceMetrics,
  TimeRange,
  TabKey,
  SectionState,
  UsersData,
  RevenueData,
  MatchingData,
  ContentData,
  ModerationData,
  AuditData,
  SystemData,
  BehaviorData,
  TabRenderProps,
} from './types'
import { TAB_CONFIG } from './types'
import { getMaxCount, formatDate, pct } from './helpers'
import {
  UsersTab,
  RevenueTab,
  MatchingTab,
  ContentTab,
  ModerationTab,
  AuditTab,
  SystemTab,
  BehaviorTab,
} from './tabs'
import { TabErrorBoundary } from './TabErrorBoundary'

// ============ Helpers (styles-dependent) ============

function getBadgeClass(status: string): string {
  const map: Record<string, string> = {
    pending: styles.badgePending,
    active: styles.badgeActive,
    sent: styles.badgeSent,
    failed: styles.badgeFailed,
    bounced: styles.badgeFailed,
    resolved: styles.badgeResolved,
    dismissed: styles.badgeDismissed,
    reviewed: styles.badgeReviewed,
    completed: styles.badgeActive,
    expired: styles.badgeDismissed,
    trialing: styles.badgePending,
    past_due: styles.badgeFailed,
    canceled: styles.badgeDismissed,
    unpaid: styles.badgeFailed,
    user: styles.badgeActive,
    admin: styles.badgeReviewed,
    superadmin: styles.badgeResolved,
  }
  return map[status] || styles.badgePending
}

// ============ Loading ============

// 개요·사용량 페이지와 동일한 단일 로딩 카드로 통일.
function SectionSkeleton() {
  return <div className={styles.loadingCard}>불러오는 중…</div>
}

// ============ Component ============

export default function MetricsDashboard() {
  const [funnel, setFunnel] = useState<FunnelMetrics | null>(null)
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<TimeRange>('24h')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [sections, setSections] = useState<Partial<Record<TabKey, SectionState>>>({})
  const tabBarRef = useRef<HTMLDivElement>(null)
  const [showTabFade, setShowTabFade] = useState(false)

  useEffect(() => {
    const el = tabBarRef.current
    if (!el) return
    const check = () =>
      setShowTabFade(
        el.scrollWidth > el.clientWidth && el.scrollLeft + el.clientWidth < el.scrollWidth - 10
      )
    check()
    el.addEventListener('scroll', check)
    window.addEventListener('resize', check)
    return () => {
      el.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
    }
  }, [])

  // ============ Data Fetching ============

  const fetchMetrics = useCallback(async () => {
    setLoading(true)
    setApiError(null)
    try {
      const [funnelRes, perfRes] = await Promise.allSettled([
        fetch(`/api/admin/metrics/funnel?timeRange=${timeRange}`),
        fetch(`/api/admin/metrics?timeRange=${timeRange}`),
      ])

      const errors: string[] = []

      if (funnelRes.status === 'fulfilled' && funnelRes.value.ok) {
        const json = await funnelRes.value.json()
        // funnel route 는 apiSuccess({ data: funnelData, timeRange }) 로
        // 반환해 최종 응답이 { data: { data: funnelData, timeRange } } 로
        // 이중 래핑된다. 화면은 funnel.registrations 를 기대하므로 한 겹 더
        // 벗긴다(json.data.data). 혹시 단일 래핑(json.data 에 registrations
        // 직접)으로 바뀌어도 동작하도록 registrations 키 존재로 판별.
        const outer = json?.data
        const funnelData =
          outer && typeof outer === 'object' && 'registrations' in outer ? outer : outer?.data
        if (funnelData && funnelData.registrations) {
          setFunnel(funnelData)
        } else {
          errors.push('Funnel: 응답에 data 없음')
          setFunnel(null)
        }
      } else {
        const msg =
          funnelRes.status === 'rejected' ? funnelRes.reason?.message : `${funnelRes.value.status}`
        errors.push(`Funnel: ${msg}`)
        setFunnel(null)
      }

      if (perfRes.status === 'fulfilled' && perfRes.value.ok) {
        const data = await perfRes.value.json()
        if (data.data?.overview) {
          setPerformance({
            api: {
              totalRequests: data.data.overview.totalRequests,
              errorRate: data.data.overview.errorRate,
              avgLatencyMs: data.data.overview.avgLatencyMs,
              p95LatencyMs:
                data.data.overview.p95LatencyMs || data.data.overview.avgLatencyMs * 1.5,
            },
            services: data.data.services || {},
          })
        } else setPerformance(null)
      } else {
        const msg =
          perfRes.status === 'rejected' ? perfRes.reason?.message : `${perfRes.value.status}`
        errors.push(`Metrics: ${msg}`)
        setPerformance(null)
      }

      if (errors.length > 0) setApiError(errors.join(' | '))
      setLastUpdated(new Date())
    } catch (err) {
      setApiError(`네트워크 오류: ${err instanceof Error ? err.message : String(err)}`)
      setFunnel(null)
      setPerformance(null)
    } finally {
      setLoading(false)
    }
  }, [timeRange])

  const fetchSectionData = useCallback(
    async (section: TabKey) => {
      if (section === 'overview') return
      setSections((prev) => ({
        ...prev,
        [section]: {
          data: prev[section]?.data || null,
          loading: true,
          error: null,
          lastUpdated: prev[section]?.lastUpdated || null,
        },
      }))
      try {
        const res = await fetch(
          `/api/admin/metrics/comprehensive?section=${section}&timeRange=${timeRange}`
        )
        if (res.ok) {
          const json = await res.json()
          // comprehensive 는 apiSuccess({ data, section, timeRange }) 로 반환해
          // 최종 응답이 { data: { data: <섹션데이터>, section, timeRange } } 로
          // 이중 래핑된다. 탭은 섹션데이터를 직접 기대하므로 한 겹 더 벗긴다.
          // (혹시 단일 래핑으로 바뀌어도 동작하도록 data 키 유무로 판별.)
          const outer = json?.data
          const sectionData =
            outer && typeof outer === 'object' && 'data' in outer ? outer.data : outer
          setSections((prev) => ({
            ...prev,
            [section]: { data: sectionData, loading: false, error: null, lastUpdated: new Date() },
          }))
        } else {
          const errBody = await res.json().catch(() => ({}))
          const msg = errBody.error?.message || errBody.error || res.statusText
          setSections((prev) => ({
            ...prev,
            [section]: {
              data: null,
              loading: false,
              error: `${res.status}: ${msg}`,
              lastUpdated: null,
            },
          }))
        }
      } catch (err) {
        setSections((prev) => ({
          ...prev,
          [section]: {
            data: null,
            loading: false,
            error: err instanceof Error ? err.message : String(err),
            lastUpdated: null,
          },
        }))
      }
    },
    [timeRange]
  )

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 60000)
    return () => clearInterval(interval)
  }, [fetchMetrics])

  useEffect(() => {
    if (activeTab !== 'overview' && !sections[activeTab]?.data && !sections[activeTab]?.loading) {
      fetchSectionData(activeTab)
    }
  }, [activeTab, fetchSectionData, sections])

  useEffect(() => {
    setSections({})
  }, [timeRange])

  // ============ Shared Helpers ============

  const getSlaStatus = (value: number, threshold: number, inverse = false) => {
    const pass = inverse ? value <= threshold : value >= threshold
    return pass ? 'pass' : 'fail'
  }

  const formatCurrency = (num: number) =>
    new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(num)

  const renderDistribution = (items: Array<{ label: string; count: number }>) => {
    if (items.length === 0) return <div className={styles.emptyState}>데이터 없음</div>
    const max = getMaxCount(items)
    return (
      <div className={styles.distributionList}>
        {items.map((item) => (
          <div key={item.label} className={styles.distributionItem}>
            <span className={styles.distributionLabel}>{item.label}</span>
            <div className={styles.distributionBarOuter}>
              <div
                className={styles.distributionBarInner}
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </div>
            <span className={styles.distributionCount}>{formatNumber(item.count)}</span>
          </div>
        ))}
      </div>
    )
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    if (activeTab === 'overview') {
      await fetchMetrics()
    } else {
      setSections((prev) => {
        const next = { ...prev }
        delete next[activeTab]
        return next
      })
      await fetchSectionData(activeTab)
    }
    setRefreshing(false)
  }

  const getSectionState = (key: TabKey): SectionState | undefined => sections[key]

  const renderSectionError = (section: TabKey) => {
    const state = getSectionState(section)
    if (!state?.error) return null
    return (
      <div className={styles.errorState}>
        <div>로딩 실패: {state.error}</div>
        <button className={styles.errorStateRetry} onClick={() => fetchSectionData(section)}>
          다시 시도
        </button>
      </div>
    )
  }

  const renderTableInfo = (shown: number, label: string) => (
    <div className={styles.tableInfo}>
      <span>최근 {shown}건 표시</span>
      <span>{label}</span>
    </div>
  )

  const currentLastUpdated =
    activeTab === 'overview' ? lastUpdated : getSectionState(activeTab)?.lastUpdated || null

  // ============ Tab Shared Props ============

  const tabProps: TabRenderProps = {
    styles,
    formatNumber,
    formatDate,
    formatCurrency,
    pct,
    getBadgeClass,
    getMaxCount,
    renderDistribution,
    renderTableInfo,
    renderSectionError,
    SectionSkeleton,
  }

  const getTabData = <T,>(key: TabKey): T | undefined => {
    const state = getSectionState(key)
    if (state?.loading || state?.error) return undefined
    return state?.data as T | undefined
  }

  // ============ Overview Tab ============

  const renderOverviewTab = () => {
    if (loading) return <SectionSkeleton />
    return (
      <>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>SLA 상태</h2>
          <div className={styles.slaGrid}>
            <div
              className={`${styles.slaCard} ${styles[getSlaStatus(performance?.api.p95LatencyMs || 0, SLA_THRESHOLDS.P95_LATENCY_MS, true)]}`}
            >
              <div className={styles.slaLabel}>p95 API Latency</div>
              <div className={styles.slaValue}>
                {performance?.api.p95LatencyMs?.toFixed(0) || '—'}ms
              </div>
              <div className={styles.slaThreshold}>
                목표: {'<'} {SLA_THRESHOLDS.P95_LATENCY_MS}ms
              </div>
            </div>
            <div
              className={`${styles.slaCard} ${styles[getSlaStatus(performance?.api.errorRate || 0, SLA_THRESHOLDS.ERROR_RATE_PERCENT, true)]}`}
            >
              <div className={styles.slaLabel}>Error Rate</div>
              <div className={styles.slaValue}>
                {performance?.api.errorRate?.toFixed(2) || '0'}%
              </div>
              <div className={styles.slaThreshold}>
                목표: {'<'} {SLA_THRESHOLDS.ERROR_RATE_PERCENT}%
              </div>
            </div>
            <div className={`${styles.slaCard} ${styles.info}`}>
              <div className={styles.slaLabel}>Total Requests</div>
              <div className={styles.slaValue}>
                {formatNumber(performance?.api.totalRequests || 0)}
              </div>
              <div className={styles.slaThreshold}>기간: {timeRange}</div>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>핵심 퍼널 지표</h2>
          <div className={styles.funnelContainer}>
            <div className={styles.funnelStep}>
              <div className={styles.funnelIcon}>📝</div>
              <div className={styles.funnelLabel}>신규 가입</div>
              <div className={styles.funnelValue}>
                {formatNumber(funnel?.registrations?.daily || 0)}
              </div>
              <div
                className={styles.funnelTrend}
                data-positive={(funnel?.registrations?.trend ?? 0) >= 0}
              >
                {(funnel?.registrations?.trend ?? 0) >= 0 ? '↑' : '↓'}{' '}
                {Math.abs(funnel?.registrations?.trend || 0).toFixed(1)}%
              </div>
            </div>
            <div className={styles.funnelArrow}>→</div>
            <div className={styles.funnelStep}>
              <div className={styles.funnelIcon}>✅</div>
              <div className={styles.funnelLabel}>활성화</div>
              <div className={styles.funnelValue}>
                {formatNumber(funnel?.activations?.total || 0)}
              </div>
              <div className={styles.funnelRate}>{funnel?.activations?.rate?.toFixed(1) || 0}%</div>
            </div>
            <div className={styles.funnelArrow}>→</div>
            <div className={styles.funnelStep}>
              <div className={styles.funnelIcon}>🔥</div>
              <div className={styles.funnelLabel}>주간 활성</div>
              <div className={styles.funnelValue}>
                {formatNumber(funnel?.engagement?.weeklyActiveUsers || 0)}
              </div>
              <div className={styles.funnelRate}>
                {funnel?.registrations?.total
                  ? (
                      ((funnel?.engagement?.weeklyActiveUsers || 0) / funnel.registrations.total) *
                      100
                    ).toFixed(1)
                  : 0}
                %
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>사용자 참여도</h2>
          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>누적 가입</div>
              <div className={styles.metricValue}>
                {formatNumber(funnel?.registrations?.total || 0)}
              </div>
              <div className={styles.metricSubtext}>전체 회원 수</div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>DAU</div>
              <div className={styles.metricValue}>
                {formatNumber(funnel?.engagement?.dailyActiveUsers || 0)}
              </div>
              <div className={styles.metricSubtext}>최근 24시간 활동</div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>WAU</div>
              <div className={styles.metricValue}>
                {formatNumber(funnel?.engagement?.weeklyActiveUsers || 0)}
              </div>
              <div className={styles.metricSubtext}>최근 7일 활동</div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>리딩/사용자</div>
              <div className={styles.metricValue}>
                {funnel?.engagement?.readingsPerUser?.toFixed(1) || 0}
              </div>
              <div className={styles.metricSubtext}>주간 활성자당 행동 수</div>
            </div>
          </div>
        </section>

        {performance?.services && Object.keys(performance.services).length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>서비스별 성능</h2>
            <div className={styles.servicesTable}>
              <div className={styles.tableHeader}>
                <span>서비스</span>
                <span>요청수</span>
                <span>에러</span>
                <span>응답시간</span>
              </div>
              {Object.entries(performance.services).map(([service, m]) => (
                <div key={service} className={styles.tableRow}>
                  <span className={styles.serviceName}>{service}</span>
                  <span>{formatNumber(m.requests)}</span>
                  <span className={m.errors > 0 ? styles.errorCount : ''}>
                    {formatNumber(m.errors)}
                  </span>
                  <span>{m.avgLatencyMs.toFixed(0)}ms</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </>
    )
  }

  // ============ Tab Content ============

  const renderTabContent = () => {
    const state = getSectionState(activeTab)
    if (activeTab === 'overview') return renderOverviewTab()
    if (state?.loading) return <SectionSkeleton />
    if (state?.error) return renderSectionError(activeTab)

    switch (activeTab) {
      case 'users':
        return <UsersTab data={getTabData<UsersData>('users')} {...tabProps} />
      case 'revenue':
        return <RevenueTab data={getTabData<RevenueData>('revenue')} {...tabProps} />
      case 'matching':
        return <MatchingTab data={getTabData<MatchingData>('matching')} {...tabProps} />
      case 'content':
        return <ContentTab data={getTabData<ContentData>('content')} {...tabProps} />
      case 'moderation':
        return <ModerationTab data={getTabData<ModerationData>('moderation')} {...tabProps} />
      case 'audit':
        return <AuditTab data={getTabData<AuditData>('audit')} {...tabProps} />
      case 'system':
        return <SystemTab data={getTabData<SystemData>('system')} {...tabProps} />
      case 'behavior':
        return <BehaviorTab data={getTabData<BehaviorData>('behavior')} {...tabProps} />
      default:
        return null
    }
  }

  // ============ Main Render ============

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>상세 지표</h1>
          <p className={styles.subtitle}>핵심 퍼널 지표 및 종합 모니터링</p>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.timeRangeSelector} role="group" aria-label="시간 범위 선택">
            {(['1h', '24h', '7d', '30d'] as TimeRange[]).map((range) => (
              <button
                key={range}
                className={`${styles.timeRangeBtn} ${timeRange === range ? styles.active : ''}`}
                onClick={() => setTimeRange(range)}
                aria-pressed={timeRange === range}
              >
                {range}
              </button>
            ))}
          </div>
          <button onClick={handleRefresh} className={styles.refreshBtn} disabled={refreshing}>
            {refreshing && <span className={styles.refreshBtnSpinner}>↻</span>}
            {refreshing ? '로딩' : '새로고침'}
          </button>
        </div>
      </header>

      {apiError && (
        <div
          style={{
            background: '#fff1f2',
            color: '#be123c',
            border: '1px solid #fecdd3',
            padding: '12px 16px',
            borderRadius: '12px',
            marginBottom: '16px',
            fontSize: '14px',
          }}
        >
          API 오류: {apiError}
        </div>
      )}

      {currentLastUpdated && (
        <div className={styles.lastUpdated}>
          마지막 업데이트: {currentLastUpdated.toLocaleTimeString('ko-KR')}
        </div>
      )}

      <div className={styles.tabBarWrap}>
        <div className={styles.tabBar} role="tablist" aria-label="대시보드 섹션" ref={tabBarRef}>
          {TAB_CONFIG.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              aria-controls={`tabpanel-${tab.key}`}
              className={`${styles.tabBtn} ${activeTab === tab.key ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {showTabFade && <div className={styles.tabBarFade} aria-hidden="true" />}
      </div>

      <div
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-label={TAB_CONFIG.find((t) => t.key === activeTab)?.label}
      >
        <TabErrorBoundary resetKey={activeTab} styles={styles}>
          {renderTabContent()}
        </TabErrorBoundary>
      </div>
    </div>
  )
}
