'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Compass,
  Heart,
  ShieldAlert,
  Sparkles,
  Target,
} from 'lucide-react'
import { analytics } from '@/components/analytics/GoogleAnalytics'
import UnifiedServiceLoading from '@/components/ui/UnifiedServiceLoading'
import CalculationDetailsSection from '@/app/premium-reports/_components/CalculationDetailsSection'
import GraphRagEvidenceSection from '@/app/premium-reports/_components/GraphRagEvidenceSection'
import PremiumPageScaffold from '@/app/premium-reports/_components/PremiumPageScaffold'
import PersonModelOverview from '@/app/premium-reports/_components/PersonModelOverview'
import QualityAuditSection from '@/app/premium-reports/_components/QualityAuditSection'
import ReportBulletListSection from '@/app/premium-reports/_components/ReportBulletListSection'
import ReportInsightCards from '@/app/premium-reports/_components/ReportInsightCards'
import ReportSectionReader from '@/app/premium-reports/_components/ReportSectionReader'
import ReportSummarySection from '@/app/premium-reports/_components/ReportSummarySection'
import SingleSubjectViewSection from '@/app/premium-reports/_components/SingleSubjectViewSection'
import {
  toQualityMarkdown,
  type QualityAudit,
  type CalculationDetails,
} from '@/lib/destiny-matrix/ai-report/qualityAudit'
import {
  normalizeReportTheme,
  type ReportThemeValue,
} from '@/lib/destiny-matrix/ai-report/themeSchema'
import type {
  AdapterPersonModel,
  AdapterSingleSubjectView,
} from '@/lib/destiny-matrix/core/adaptersTypes'
import { readPremiumReportSnapshot } from '@/lib/premium-reports/reportSnapshot'

interface ReportSection {
  title: string
  content: string
}

interface GraphRAGEvidenceAnchor {
  id: string
  section: string
  sajuEvidence: string
  astrologyEvidence: string
  crossConclusion: string
  crossEvidenceSets?: Array<{
    id: string
    astrologyEvidence: string
    sajuEvidence: string
    overlapDomains?: string[]
    overlapScore?: number
    combinedConclusion?: string
  }>
}

interface GraphRAGEvidenceBundle {
  mode: 'comprehensive' | 'timing' | 'themed'
  theme?: string
  period?: string
  anchors: GraphRAGEvidenceAnchor[]
}

interface ReportData {
  id: string
  type: 'timing' | 'themed' | 'comprehensive'
  title: string
  summary: string
  createdAt: string
  period?: string
  theme?: string
  score?: number
  grade?: string
  sections: ReportSection[]
  keywords?: string[]
  insights?: Array<{ title: string; content: string }>
  actionItems?: string[]
  qualityAudit?: QualityAudit
  calculationDetails?: CalculationDetails
  graphRagEvidence?: GraphRAGEvidenceBundle
  singleSubjectView?: AdapterSingleSubjectView
  personModel?: AdapterPersonModel
  fullData?: Record<string, unknown>
}

const REPORT_FETCH_MAX_RETRIES = 8
const REPORT_FETCH_RETRY_MS = 1200

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const THEME_LABELS: Record<ReportThemeValue, string> = {
  love: '연애',
  career: '커리어',
  wealth: '재물',
  health: '건강',
  family: '가족',
}

const REPORT_TYPE_LABELS: Record<ReportData['type'], string> = {
  comprehensive: '종합 인물 리포트',
  themed: '테마 심화 리포트',
  timing: '타이밍 리포트',
}

const MODE_LABELS: Record<'execute' | 'verify' | 'prepare', string> = {
  execute: '실행 우위',
  verify: '검토 우위',
  prepare: '준비 우위',
}

const WINDOW_LABELS: Record<string, string> = {
  now: '지금',
  '1-3m': '1-3개월',
  '3-6m': '3-6개월',
  '6-12m': '6-12개월',
  '12m+': '12개월 이후',
}

const THEME_SUMMARY_KEYS: Record<ReportThemeValue, Array<{ key: string; label: string }>> = {
  love: [
    { key: 'deepAnalysis', label: '핵심 흐름' },
    { key: 'compatibility', label: '관계 포인트' },
    { key: 'marriageTiming', label: '전환 시기' },
  ],
  career: [
    { key: 'deepAnalysis', label: '핵심 흐름' },
    { key: 'strategy', label: '전략 포인트' },
    { key: 'turningPoints', label: '전환 시기' },
  ],
  wealth: [
    { key: 'deepAnalysis', label: '핵심 흐름' },
    { key: 'strategy', label: '전략 포인트' },
    { key: 'riskManagement', label: '리스크 관리' },
  ],
  health: [
    { key: 'deepAnalysis', label: '핵심 흐름' },
    { key: 'recoveryPlan', label: '회복 포인트' },
    { key: 'riskWindows', label: '주의 시기' },
  ],
  family: [
    { key: 'deepAnalysis', label: '핵심 흐름' },
    { key: 'dynamics', label: '가족 구조' },
    { key: 'communication', label: '대화 포인트' },
  ],
}

function normalizeNarrativeText(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .replace(/\r/g, ' ')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function takeLeadSentence(text: string, maxLength = 92): string {
  const normalized = normalizeNarrativeText(text)
  if (!normalized) {
    return ''
  }

  const sentenceMatch = normalized.match(/(.+?[.!?。]|.+?다\.|.+?요\.|.+?$)/)
  const sentence = sentenceMatch?.[1]?.trim() || normalized

  if (sentence.length <= maxLength) {
    return sentence
  }

  return `${sentence.slice(0, maxLength - 1).trimEnd()}…`
}

function findSectionSnippet(report: ReportData, key: string): string {
  const exact = report.sections.find((section) => section.title === key)
  if (exact?.content) {
    return takeLeadSentence(exact.content)
  }

  const loose = report.sections.find((section) =>
    section.title.toLowerCase().includes(key.toLowerCase())
  )
  if (loose?.content) {
    return takeLeadSentence(loose.content)
  }

  return ''
}

function buildThemedHeadlineLines(report: ReportData): Array<{ label: string; text: string }> {
  const theme = normalizeReportTheme(report.theme)
  if (!theme) {
    return []
  }

  const preferredLines = THEME_SUMMARY_KEYS[theme]
    .map(({ key, label }) => ({
      label,
      text: findSectionSnippet(report, key),
    }))
    .filter((line) => line.text.length > 0)

  const fallbackSummary = takeLeadSentence(report.summary)
  const fallbackLines = report.sections
    .filter(
      (section) => !preferredLines.some((line) => line.text === takeLeadSentence(section.content))
    )
    .map((section, index) => ({
      label: index === 0 ? '핵심 흐름' : index === 1 ? '포인트' : '실행 힌트',
      text: takeLeadSentence(section.content),
    }))
    .filter((line) => line.text.length > 0)

  const combined = [
    ...(fallbackSummary ? [{ label: '핵심 요약', text: fallbackSummary }] : []),
    ...preferredLines,
    ...fallbackLines,
  ]

  const unique = combined.filter(
    (line, index, lines) => lines.findIndex((candidate) => candidate.text === line.text) === index
  )

  return unique.slice(0, 3)
}

function isPersonModel(value: unknown): value is AdapterPersonModel {
  if (!value || typeof value !== 'object') {
    return false
  }
  const candidate = value as Record<string, unknown>
  return typeof candidate.overview === 'string' && !!candidate.structuralCore
}

function isSingleSubjectView(value: unknown): value is AdapterSingleSubjectView {
  if (!value || typeof value !== 'object') {
    return false
  }
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.directAnswer === 'string' && !!candidate.actionAxis && !!candidate.timingState
  )
}

function formatRatioPercent(value?: number): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '-'
  }
  return `${Math.round(value * 100)}%`
}

function labelWindow(window?: string): string {
  if (!window) {
    return '현재'
  }
  return WINDOW_LABELS[window] || window
}

function labelDomainFromModel(
  personModel: AdapterPersonModel | undefined,
  domain?: string
): string {
  if (!domain) {
    return '-'
  }
  return personModel?.dimensions.find((item) => item.domain === domain)?.label || domain
}

function extractReportPayload(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') {
    return null
  }

  const root = data as Record<string, unknown>
  if (root.report && typeof root.report === 'object') {
    return root.report as Record<string, unknown>
  }

  const nestedData = root.data
  if (
    nestedData &&
    typeof nestedData === 'object' &&
    'report' in nestedData &&
    (nestedData as Record<string, unknown>).report &&
    typeof (nestedData as Record<string, unknown>).report === 'object'
  ) {
    return (nestedData as Record<string, unknown>).report as Record<string, unknown>
  }

  return null
}

function normalizeSections(rawSections: unknown): ReportSection[] {
  if (Array.isArray(rawSections)) {
    return rawSections
      .filter(
        (section): section is { title: unknown; content: unknown } =>
          !!section && typeof section === 'object'
      )
      .map((section) => ({
        title: String(section.title || '섹션'),
        content: String(section.content || ''),
      }))
      .filter((section) => section.content.trim().length > 0)
  }

  if (!rawSections || typeof rawSections !== 'object') {
    return []
  }

  return Object.entries(rawSections as Record<string, unknown>)
    .map(([key, value]) => {
      if (typeof value === 'string') {
        return { title: key, content: value }
      }
      if (Array.isArray(value)) {
        const content = value
          .filter((item): item is string => typeof item === 'string')
          .join('\n')
          .trim()
        return content ? { title: key, content } : null
      }
      if (value && typeof value === 'object' && 'content' in (value as Record<string, unknown>)) {
        const content = String((value as Record<string, unknown>).content || '').trim()
        return content ? { title: key, content } : null
      }
      return null
    })
    .filter((section): section is ReportSection => section !== null)
}

function buildReportData(
  payload: Record<string, unknown>,
  reportId: string,
  fallback: {
    type?: ReportData['type']
    createdAt?: string
    period?: string
    theme?: string
  } = {}
): ReportData {
  const fullData =
    payload.fullData && typeof payload.fullData === 'object'
      ? (payload.fullData as Record<string, unknown>)
      : payload

  let sections = normalizeSections(payload.sections)
  if (sections.length === 0) {
    sections = normalizeSections(fullData.sections)
  }
  if (sections.length === 0 && typeof payload.summary === 'string' && payload.summary.length > 0) {
    sections = [{ title: '요약', content: payload.summary }]
  }

  return {
    id: String(payload.id || reportId),
    type: (payload.type as ReportData['type']) || fallback.type || 'comprehensive',
    title: String(payload.title || 'AI 리포트'),
    summary: String(payload.summary || ''),
    createdAt: String(payload.createdAt || fallback.createdAt || new Date().toISOString()),
    period: (payload.period as string | undefined) || fallback.period,
    theme: (payload.theme as string | undefined) || fallback.theme,
    score: payload.score as number | undefined,
    grade: payload.grade as string | undefined,
    sections,
    keywords: payload.keywords as string[] | undefined,
    insights: payload.insights as Array<{ title: string; content: string }> | undefined,
    actionItems: payload.actionItems as string[] | undefined,
    qualityAudit:
      (payload.qualityAudit as QualityAudit | undefined) ||
      (fullData.qualityAudit as QualityAudit | undefined),
    calculationDetails:
      (payload.calculationDetails as CalculationDetails | undefined) ||
      (fullData.calculationDetails as CalculationDetails | undefined),
    graphRagEvidence:
      (payload.graphRagEvidence as GraphRAGEvidenceBundle | undefined) ||
      (fullData.graphRagEvidence as GraphRAGEvidenceBundle | undefined),
    singleSubjectView: isSingleSubjectView(payload.singleSubjectView)
      ? payload.singleSubjectView
      : isSingleSubjectView(fullData.singleSubjectView)
        ? fullData.singleSubjectView
        : undefined,
    personModel: isPersonModel(payload.personModel)
      ? payload.personModel
      : isPersonModel(fullData.personModel)
        ? fullData.personModel
        : undefined,
    fullData,
  }
}

export default function ReportResultPage() {
  const params = useParams()
  const router = useRouter()
  const { status } = useSession()
  const redirectedRef = useRef(false)

  const reportId = params?.id as string

  const [report, setReport] = useState<ReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadReport = useCallback(async () => {
    if (!reportId) {
      return
    }

    setError(null)
    const snapshot = readPremiumReportSnapshot(reportId)

    if (snapshot?.report) {
      setReport(
        buildReportData(snapshot.report, reportId, {
          type: snapshot.reportType,
          createdAt: snapshot.createdAt,
          period: snapshot.period,
          theme: snapshot.theme,
        })
      )
      setIsLoading(false)
    } else {
      setIsLoading(true)
    }

    try {
      let lastErrorMessage = '리포트를 불러오지 못했습니다.'

      for (let attempt = 0; attempt < REPORT_FETCH_MAX_RETRIES; attempt += 1) {
        const response = await fetch(`/api/reports/${reportId}`, { cache: 'no-store' })
        const data = await response.json().catch(() => ({}) as Record<string, unknown>)

        const success = Boolean((data as { success?: boolean }).success)
        const payload = extractReportPayload(data)

        if (response.ok && success && payload) {
          setReport(buildReportData(payload, reportId))
          return
        }

        const apiError = (data as { error?: { code?: string; message?: string } }).error
        const errorCode = apiError?.code
        if (apiError?.message) {
          lastErrorMessage = apiError.message
        }

        if ((response.status === 401 || errorCode === 'UNAUTHORIZED') && !redirectedRef.current) {
          redirectedRef.current = true
          router.push(`/auth/signin?callbackUrl=${encodeURIComponent(window.location.pathname)}`)
          return
        }

        if (response.status === 403 || errorCode === 'FORBIDDEN') {
          break
        }

        const shouldRetry =
          response.status === 404 ||
          response.status >= 500 ||
          errorCode === 'NOT_FOUND' ||
          errorCode === 'DATABASE_ERROR' ||
          errorCode === 'TIMEOUT'
        const hasNextAttempt = attempt < REPORT_FETCH_MAX_RETRIES - 1

        if (shouldRetry && hasNextAttempt) {
          await sleep(REPORT_FETCH_RETRY_MS)
          continue
        }

        break
      }

      if (!snapshot) {
        setError(lastErrorMessage)
      }
    } catch {
      if (!snapshot) {
        setError('리포트를 불러오지 못했습니다.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [reportId, router])

  useEffect(() => {
    if (status === 'unauthenticated' && !redirectedRef.current) {
      redirectedRef.current = true
      router.push('/auth/signin')
      return
    }

    if (status === 'authenticated') {
      redirectedRef.current = false
      void loadReport()
    }
  }, [status, router, loadReport])

  const downloadFile = (filename: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    window.URL.revokeObjectURL(url)
  }

  const handleDownloadPDF = async () => {
    try {
      const response = await fetch(`/api/destiny-matrix/ai-report?reportId=${reportId}&format=pdf`)
      if (!response.ok) {
        alert('PDF 다운로드에 실패했습니다.')
        return
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `destiny-report-${reportId}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      window.URL.revokeObjectURL(url)
      analytics.matrixPdfDownload()
    } catch {
      alert('PDF 다운로드 중 오류가 발생했습니다.')
    }
  }

  const handleDownloadQualityMarkdown = () => {
    if (!report?.qualityAudit) {
      return
    }
    const markdown = toQualityMarkdown({
      reportId: report.id,
      title: report.title,
      createdAt: report.createdAt,
      quality: report.qualityAudit,
    })
    downloadFile(`report-quality-${report.id}.md`, markdown, 'text/markdown;charset=utf-8')
  }

  const handleDownloadCalculationJson = () => {
    if (!report?.calculationDetails) {
      return
    }
    const json = JSON.stringify(report.calculationDetails, null, 2)
    downloadFile(`report-calculation-${report.id}.json`, json, 'application/json;charset=utf-8')
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: report?.title,
          text: report?.summary,
          url: window.location.href,
        })
      } catch {
        // user canceled
      }
      return
    }

    await navigator.clipboard.writeText(window.location.href)
    alert('링크가 복사되었습니다.')
  }

  if (status === 'loading' || isLoading) {
    return <UnifiedServiceLoading kind="aiReport" locale="ko" />
  }

  if (error || !report) {
    return (
      <PremiumPageScaffold accent="violet">
        <div className="flex min-h-[100svh] items-center justify-center px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-slate-900/60 p-6 text-center backdrop-blur-xl">
            <p className="mb-4 text-red-300">{error || '리포트를 찾을 수 없습니다.'}</p>
            <Link
              href="/premium-reports"
              className="font-semibold text-cyan-200 hover:text-cyan-100"
            >
              리포트 목록으로 돌아가기
            </Link>
          </div>
        </div>
      </PremiumPageScaffold>
    )
  }

  const showThemedDiagnostics = report.type === 'themed' && !!report.calculationDetails
  const normalizedTheme = normalizeReportTheme(report.theme)
  const themedHeadlineLines = report.type === 'themed' ? buildThemedHeadlineLines(report) : []
  const singleSubjectView = report.singleSubjectView
  const personModel = report.personModel
  const primaryWindow = personModel?.timeProfile.windows[0]
  const leadPortraits = personModel?.domainPortraits.slice(0, 4) || []
  const leadStates = personModel?.states.slice(0, 3) || []
  const leadBranches = personModel?.futureBranches.slice(0, 3) || []
  const leadInsights = report.insights?.slice(0, 3) || []
  const coherenceNotes = personModel?.evidenceLedger.coherenceNotes.slice(0, 3) || []
  const contradictionFlags = personModel?.evidenceLedger.contradictionFlags.slice(0, 3) || []

  return (
    <PremiumPageScaffold accent="cyan">
      <header className="px-4 pb-6 pt-8">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/premium-reports"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-slate-300 backdrop-blur-xl transition hover:border-cyan-300/45 hover:text-white"
          >
            <ArrowRight className="h-3.5 w-3.5 rotate-180" />
            리포트 목록으로
          </Link>

          <div className="mt-5 overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,14,24,0.94),rgba(6,10,18,0.88))] shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
            <div className="grid gap-8 px-6 py-7 lg:grid-cols-[1.55fr_0.95fr] lg:px-8 lg:py-8">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100/88">
                    <Sparkles className="h-3.5 w-3.5" />
                    {REPORT_TYPE_LABELS[report.type]}
                  </span>
                  {report.theme && normalizedTheme && (
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-slate-300">
                      {THEME_LABELS[normalizedTheme]} 테마
                    </span>
                  )}
                  {report.period && (
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-slate-300">
                      {report.period}
                    </span>
                  )}
                </div>

                <h1 className="mt-4 text-3xl font-black tracking-tight text-white md:text-4xl">
                  {report.title}
                </h1>
                <p className="mt-3 max-w-3xl whitespace-pre-line text-[15px] leading-7 text-slate-300">
                  {singleSubjectView?.directAnswer || personModel?.overview || report.summary}
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  {personModel?.structuralCore.focusDomain && (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        Focus Axis
                      </p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        {labelDomainFromModel(personModel, personModel.structuralCore.focusDomain)}
                      </p>
                    </div>
                  )}
                  {personModel?.structuralCore.actionFocusDomain && (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        Action Axis
                      </p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        {labelDomainFromModel(
                          personModel,
                          personModel.structuralCore.actionFocusDomain
                        )}
                      </p>
                    </div>
                  )}
                  {personModel?.timeProfile.currentWindow && (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        Current Window
                      </p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        {labelWindow(personModel.timeProfile.currentWindow)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="rounded-[24px] border border-cyan-300/18 bg-[linear-gradient(135deg,rgba(13,43,66,0.88),rgba(9,14,28,0.92))] p-5 shadow-[0_16px_50px_rgba(10,86,120,0.18)]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100/74">
                      Report Score
                    </p>
                    <div className="mt-3 flex items-end gap-3">
                      <p className="text-4xl font-black text-white">
                        {report.score !== undefined
                          ? `${report.score}점`
                          : formatRatioPercent(personModel?.timeProfile.confidence)}
                      </p>
                      {report.grade && (
                        <p className="pb-1 text-sm text-cyan-100/72">{report.grade}</p>
                      )}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      생성일 {new Date(report.createdAt).toLocaleDateString('ko-KR')}
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Execution Posture
                    </p>
                    <p className="mt-3 text-lg font-semibold text-white">
                      {personModel?.states[0]?.label ||
                        (primaryWindow ? labelWindow(primaryWindow.window) : '요약 모드')}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {singleSubjectView?.actionAxis.whyThisFirst ||
                        personModel?.timeProfile.timingNarrative ||
                        report.summary}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleDownloadPDF}
                    className="rounded-xl border border-cyan-300/28 bg-cyan-400/8 px-4 py-2.5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/14"
                  >
                    PDF 다운로드
                  </button>
                  <button
                    onClick={handleShare}
                    className="rounded-xl border border-white/12 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-white transition hover:border-cyan-300/35"
                  >
                    공유하기
                  </button>
                  {showThemedDiagnostics && report.qualityAudit && (
                    <button
                      onClick={handleDownloadQualityMarkdown}
                      className="rounded-xl border border-indigo-300/28 bg-indigo-500/10 px-4 py-2.5 text-sm font-medium text-indigo-100 transition hover:bg-indigo-500/16"
                    >
                      품질 리포트(.md)
                    </button>
                  )}
                  {showThemedDiagnostics && (
                    <button
                      onClick={handleDownloadCalculationJson}
                      className="rounded-xl border border-cyan-300/28 bg-cyan-500/10 px-4 py-2.5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/16"
                    >
                      계산 근거(.json)
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {report.type === 'themed' && themedHeadlineLines.length > 0 && (
        <div className="mx-auto mt-6 max-w-6xl px-4">
          <div className="rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-slate-900/90 via-slate-900/75 to-cyan-950/55 p-6 shadow-[0_18px_50px_rgba(8,145,178,0.18)] backdrop-blur-xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                  {normalizedTheme
                    ? `${THEME_LABELS[normalizedTheme]} 테마 핵심 결론`
                    : '테마 핵심 결론'}
                </div>
                <h2 className="text-xl font-bold text-white">먼저 봐야 할 핵심 3줄</h2>
              </div>
              <p className="text-sm text-slate-400">
                아래 섹션에서 근거와 실행안을 자세히 확인하세요.
              </p>
            </div>

            <div className="mt-5 grid gap-3">
              {themedHeadlineLines.map((line, index) => (
                <div
                  key={`${line.label}-${index}`}
                  className="rounded-xl border border-white/10 bg-slate-950/45 px-4 py-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/80">
                    {line.label}
                  </p>
                  <p className="mt-2 text-base font-medium leading-7 text-slate-100">{line.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {singleSubjectView && (
        <SingleSubjectViewSection view={singleSubjectView} personModel={personModel} />
      )}

      {personModel && (
        <>
          <PersonModelOverview personModel={personModel} className="mt-6" />

          {leadStates.length > 0 && (
            <section className="mx-auto mt-6 max-w-6xl px-4">
              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
                <div className="flex items-center gap-2 text-cyan-100">
                  <Target className="h-4 w-4" />
                  <h2 className="text-lg font-semibold text-white">상태 레이어</h2>
                </div>
                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                  {leadStates.map((state) => (
                    <article
                      key={state.key}
                      className="rounded-[22px] border border-white/10 bg-[#090f1b]/88 p-5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-base font-semibold text-white">{state.label}</p>
                        <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-slate-400">
                          {state.domains
                            .map((domain) => labelDomainFromModel(personModel, domain))
                            .join(' / ')}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-300">{state.summary}</p>
                      {state.drivers.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/70">
                            Drivers
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {state.drivers.map((driver) => (
                              <span
                                key={driver}
                                className="rounded-full border border-cyan-300/18 bg-cyan-400/8 px-3 py-1 text-xs text-cyan-100"
                              >
                                {driver}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {state.counterweights.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-amber-100/70">
                            Counterweights
                          </p>
                          <ul className="mt-2 space-y-1 text-sm text-slate-400">
                            {state.counterweights.slice(0, 3).map((item) => (
                              <li key={item}>• {item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            </section>
          )}

          {leadPortraits.length > 0 && (
            <section className="mx-auto mt-6 max-w-6xl px-4">
              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
                <div className="flex items-center gap-2 text-cyan-100">
                  <BadgeCheck className="h-4 w-4" />
                  <h2 className="text-lg font-semibold text-white">도메인별 발현</h2>
                </div>
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {leadPortraits.map((portrait) => (
                    <article
                      key={portrait.domain}
                      className="rounded-[22px] border border-white/10 bg-[#090f1b]/88 p-5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-white">{portrait.label}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {MODE_LABELS[portrait.mode]} ·{' '}
                            {portrait.timingWindow ? labelWindow(portrait.timingWindow) : '상시'}
                          </p>
                        </div>
                        <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-slate-400">
                          구조 {formatRatioPercent(portrait.structuralScore)}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-300">{portrait.summary}</p>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-emerald-300/12 bg-emerald-400/[0.05] p-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-emerald-100/70">
                            Allowed
                          </p>
                          <ul className="mt-2 space-y-1 text-sm text-slate-300">
                            {portrait.allowedActions.slice(0, 3).map((item) => (
                              <li key={item}>• {item}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="rounded-2xl border border-amber-300/12 bg-amber-400/[0.05] p-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-amber-100/70">
                            Blocked
                          </p>
                          <ul className="mt-2 space-y-1 text-sm text-slate-300">
                            {portrait.blockedActions.slice(0, 3).map((item) => (
                              <li key={item}>• {item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          )}

          <section className="mx-auto mt-6 grid max-w-6xl gap-4 px-4 lg:grid-cols-[1.15fr_0.85fr]">
            <article className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-cyan-100">
                <Briefcase className="h-4 w-4" />
                <h2 className="text-lg font-semibold text-white">커리어 프로필</h2>
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                {personModel.careerProfile.summary}
              </p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/70">
                    Suitable Lanes
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-slate-300">
                    {personModel.careerProfile.suitableLanes.slice(0, 4).map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/70">
                    Hiring Triggers
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-slate-300">
                    {personModel.careerProfile.hiringTriggers.slice(0, 4).map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>

            <article className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-cyan-100">
                <Heart className="h-4 w-4" />
                <h2 className="text-lg font-semibold text-white">관계 프로필</h2>
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                {personModel.relationshipProfile.summary}
              </p>
              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/70">
                    Partner Archetypes
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {personModel.relationshipProfile.partnerArchetypes.slice(0, 4).map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-300"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/70">
                    Commitment Conditions
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-slate-300">
                    {personModel.relationshipProfile.commitmentConditions
                      .slice(0, 3)
                      .map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                  </ul>
                </div>
              </div>
            </article>
          </section>

          {leadBranches.length > 0 && (
            <section className="mx-auto mt-6 max-w-6xl px-4">
              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
                <div className="flex items-center gap-2 text-cyan-100">
                  <Compass className="h-4 w-4" />
                  <h2 className="text-lg font-semibold text-white">미래 분기</h2>
                </div>
                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                  {leadBranches.map((branch) => (
                    <article
                      key={branch.id}
                      className="rounded-[22px] border border-white/10 bg-[#090f1b]/88 p-5"
                    >
                      <p className="text-base font-semibold text-white">{branch.label}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {branch.window ? labelWindow(branch.window) : '시기 미정'} · 가능성{' '}
                        {formatRatioPercent(branch.probability)}
                      </p>
                      <p className="mt-3 text-sm leading-6 text-slate-300">{branch.summary}</p>
                      {branch.conditions.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-emerald-100/70">
                            Conditions
                          </p>
                          <ul className="mt-2 space-y-1 text-sm text-slate-300">
                            {branch.conditions.slice(0, 3).map((item) => (
                              <li key={item}>• {item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {branch.blockers.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-amber-100/70">
                            Blockers
                          </p>
                          <ul className="mt-2 space-y-1 text-sm text-slate-400">
                            {branch.blockers.slice(0, 3).map((item) => (
                              <li key={item}>• {item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            </section>
          )}

          {(leadInsights.length > 0 ||
            coherenceNotes.length > 0 ||
            contradictionFlags.length > 0) && (
            <section className="mx-auto mt-6 grid max-w-6xl gap-4 px-4 lg:grid-cols-[1.2fr_0.8fr]">
              {leadInsights.length > 0 && (
                <ReportInsightCards
                  title="핵심 인사이트"
                  className="h-full"
                  items={leadInsights.map((item) => ({
                    title: item.title,
                    body: item.content,
                  }))}
                />
              )}

              {(coherenceNotes.length > 0 || contradictionFlags.length > 0) && (
                <article className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
                  <div className="flex items-center gap-2 text-cyan-100">
                    <ShieldAlert className="h-4 w-4" />
                    <h2 className="text-lg font-semibold text-white">해석 안정성</h2>
                  </div>
                  {coherenceNotes.length > 0 && (
                    <div className="mt-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-emerald-100/70">
                        Coherence Notes
                      </p>
                      <ul className="mt-2 space-y-2 text-sm text-slate-300">
                        {coherenceNotes.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {contradictionFlags.length > 0 && (
                    <div className="mt-5">
                      <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-amber-100/70">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Contradiction Flags
                      </p>
                      <ul className="mt-2 space-y-2 text-sm text-slate-400">
                        {contradictionFlags.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </article>
              )}
            </section>
          )}
        </>
      )}

      <div className="mx-auto mt-6 max-w-6xl px-4">
        <ReportSummarySection summary={report.summary} keywords={report.keywords} />
      </div>

      {showThemedDiagnostics && report.qualityAudit && (
        <div className="mx-auto mt-6 max-w-6xl px-4">
          <QualityAuditSection qualityAudit={report.qualityAudit} />
        </div>
      )}

      {showThemedDiagnostics && report.calculationDetails && (
        <div className="mx-auto mt-6 max-w-6xl px-4">
          <CalculationDetailsSection calculationDetails={report.calculationDetails} />
        </div>
      )}

      {report.graphRagEvidence && report.graphRagEvidence.anchors?.length > 0 && (
        <div className="mx-auto mt-6 max-w-6xl px-4">
          <GraphRagEvidenceSection evidence={report.graphRagEvidence} />
        </div>
      )}

      {report.sections.length > 0 && <ReportSectionReader sections={report.sections} />}

      {report.actionItems && report.actionItems.length > 0 && (
        <div className="mx-auto max-w-6xl px-4 pb-20">
          <ReportBulletListSection title="실천 가이드" items={report.actionItems} />
        </div>
      )}
    </PremiumPageScaffold>
  )
}
