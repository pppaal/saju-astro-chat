import type React from 'react'

// ============ Data Types ============

// 모두 실측값. 익명 방문자는 추적 인프라가 없어 측정 불가능하므로 제거했다.
export type FunnelMetrics = {
  registrations: { total: number; daily: number; trend: number }
  activations: { total: number; rate: number }
  engagement: {
    dailyActiveUsers: number
    weeklyActiveUsers: number
    readingsPerUser: number
  }
}

export type PerformanceMetrics = {
  api: { totalRequests: number; errorRate: number; avgLatencyMs: number; p95LatencyMs: number }
  services: Record<string, { requests: number; errors: number; avgLatencyMs: number }>
}

export type TimeRange = '1h' | '24h' | '7d' | '30d'

export type TabKey =
  | 'overview'
  | 'users'
  | 'revenue'
  | 'matching'
  | 'content'
  | 'moderation'
  | 'audit'
  | 'system'
  | 'behavior'

export type UsersData = {
  totalUsers: number
  recentSignups: Array<{
    id: string
    email: string | null
    name: string | null
    role: string
    createdAt: string
  }>
  roleDistribution: Array<{ role: string; count: number }>
  oauthProviders: Array<{ provider: string; count: number }>
  interactionsByService: Array<{ service: string; count: number }>
}

export type RevenueData = {
  creditUsageByService: Array<{ service: string; totalCredits: number; accessCount: number }>
  bonusCreditStats: { totalAmount: number; totalRemaining: number; purchaseCount: number }
  recentRefunds: Array<{
    id: string
    userId: string
    creditType: string
    amount: number
    reason: string
    apiRoute: string | null
    createdAt: string
  }>
}

export type MatchingData = {
  totalProfiles: number
  activeProfiles: number
  verifiedProfiles: number
  swipeStats: Array<{ action: string; count: number }>
  connections: { count: number; avgCompatibility: number | null }
  chatStartedCount: number
  messageCount: number
}

export type ContentData = {
  consultations: { count: number }
  destinyMatrix: {
    count: number
    byType: Array<{ reportType: string; count: number }>
    pdfGenerated: number
  }
  tarotReadings: { count: number }
  readingsByType: Array<{ type: string; count: number }>
  compatibilityCount: number
  personalityTypes: Array<{ typeCode: string; count: number }>
}

export type ModerationData = {
  reportsByStatus: Array<{ status: string; count: number }>
  recentReports: Array<{
    id: string
    category: string
    status: string
    description: string | null
    createdAt: string
    reporterEmail: string | null
    reportedEmail: string | null
  }>
  totalBlocks: number
  recentBlocks: Array<{
    id: string
    reason: string | null
    createdAt: string
    blockerEmail: string | null
    blockedEmail: string | null
  }>
  referralStats: { totalCredits: number; totalRewards: number }
  referralByStatus: Array<{ status: string; count: number }>
}

export type AuditData = {
  totalLogs: number
  recentLogs: Array<{
    id: string
    adminEmail: string
    action: string
    targetType: string | null
    targetId: string | null
    success: boolean
    errorMessage: string | null
    createdAt: string
    metadata: unknown
  }>
  actionBreakdown: Array<{ action: string; count: number }>
}

export type SystemData = {
  creditRefunds: {
    byType: Array<{ creditType: string; totalAmount: number; count: number }>
    byReason: Array<{ reason: string; count: number }>
    recent: Array<{
      id: string
      userId: string
      creditType: string
      amount: number
      reason: string
      apiRoute: string | null
      createdAt: string
    }>
  }
  stripeEvents: {
    byType: Array<{ type: string; count: number }>
    failureCount: number
    recent: Array<{
      id: string
      eventId: string
      type: string
      success: boolean
      errorMsg: string | null
      processedAt: string
    }>
  }
  sharedResults: Array<{ resultType: string; count: number; totalViews: number }>
}

export type BehaviorData = {
  cohortAnalysis: {
    cohorts: Array<{
      period: string
      totalUsers: number
      retentionByWeek: number[]
    }>
    avgRetentionRate: number
  }
  retentionFunnel: {
    stages: Array<{
      name: string
      label: string
      count: number
      conversionRate: number
      dropoffRate: number
    }>
    overallConversion: number
  }
  engagementByService: Array<{
    service: string
    dailyActiveUsers: number
    weeklyActiveUsers: number
    monthlyActiveUsers: number
    totalReadings: number
  }>
  userActivitySummary: {
    totalActiveToday: number
    totalActiveThisWeek: number
    totalActiveThisMonth: number
    newUsersToday: number
  }
}

export type SectionState = {
  data: unknown | null
  loading: boolean
  error: string | null
  lastUpdated: Date | null
}

// ============ Tab Config ============

export const TAB_CONFIG: { key: TabKey; label: string }[] = [
  { key: 'overview', label: '개요' },
  { key: 'users', label: '사용자' },
  { key: 'revenue', label: '수익' },
  { key: 'matching', label: '매칭' },
  { key: 'content', label: '콘텐츠' },
  { key: 'moderation', label: '운영' },
  { key: 'audit', label: '감사로그' },
  { key: 'system', label: '시스템' },
  { key: 'behavior', label: '행동분석' },
]

// ============ Tab Render Props ============

export interface TabRenderProps {
  styles: Record<string, string>
  formatNumber: (n: number) => string
  formatDate: (iso: string) => string
  formatCurrency: (n: number) => string
  pct: (a: number, b: number) => string
  getBadgeClass: (status: string) => string
  getMaxCount: (items: Array<{ count: number }>) => number
  renderDistribution: (items: Array<{ label: string; count: number }>) => React.ReactNode
  renderTableInfo: (shown: number, label: string) => React.ReactNode
  renderSectionError: (section: TabKey) => React.ReactNode | null
  SectionSkeleton: React.FC
}
