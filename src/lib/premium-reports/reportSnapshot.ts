const REPORT_SNAPSHOT_PREFIX = 'premium_report_snapshot:'
const REPORT_SNAPSHOT_TTL_MS = 15 * 60 * 1000

export type PremiumReportType = 'timing' | 'themed' | 'comprehensive'

export interface PremiumReportSnapshot {
  reportId: string
  reportType: PremiumReportType
  period?: string
  theme?: string
  createdAt: string
  report: Record<string, unknown>
}

function getSnapshotKey(reportId: string): string {
  return `${REPORT_SNAPSHOT_PREFIX}${reportId}`
}

export function savePremiumReportSnapshot(snapshot: PremiumReportSnapshot): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.sessionStorage.setItem(getSnapshotKey(snapshot.reportId), JSON.stringify(snapshot))
  } catch {
    // Ignore storage failures (private mode / quota)
  }
}

export function readPremiumReportSnapshot(reportId: string): PremiumReportSnapshot | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.sessionStorage.getItem(getSnapshotKey(reportId))
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as PremiumReportSnapshot
    if (!parsed?.reportId || parsed.reportId !== reportId) {
      return null
    }

    const createdTime = new Date(parsed.createdAt).getTime()
    if (!Number.isFinite(createdTime) || Date.now() - createdTime > REPORT_SNAPSHOT_TTL_MS) {
      window.sessionStorage.removeItem(getSnapshotKey(reportId))
      return null
    }

    return parsed
  } catch {
    return null
  }
}
