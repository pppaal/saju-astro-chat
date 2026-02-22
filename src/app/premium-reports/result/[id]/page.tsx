'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { analytics } from '@/components/analytics/GoogleAnalytics'
import UnifiedServiceLoading from '@/components/ui/UnifiedServiceLoading'
import PremiumPageScaffold from '@/app/premium-reports/_components/PremiumPageScaffold'
import {
  toQualityMarkdown,
  type QualityAudit,
  type CalculationDetails,
} from '@/lib/destiny-matrix/ai-report/qualityAudit'

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
  fullData?: Record<string, unknown>
}

export default function ReportResultPage() {
  const params = useParams()
  const router = useRouter()
  const { status } = useSession()

  const reportId = params?.id as string

  const [report, setReport] = useState<ReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState(0)
  const [showRawJson, setShowRawJson] = useState(false)

  const loadReport = useCallback(async () => {
    if (!reportId) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/reports/${reportId}`)
      const data = await response.json()

      if (!data.success) {
        setError(data.error?.message || '리포트를 불러오지 못했습니다.')
        return
      }

      const apiReport = data.report
      const fullData = apiReport.fullData || {}

      let sections: ReportSection[] = []
      if (Array.isArray(apiReport.sections) && apiReport.sections.length > 0) {
        sections = apiReport.sections
      } else if (Array.isArray(fullData.sections) && fullData.sections.length > 0) {
        sections = fullData.sections as ReportSection[]
      } else if (apiReport.summary) {
        sections = [{ title: '요약', content: apiReport.summary }]
      }

      setReport({
        id: apiReport.id,
        type: apiReport.type,
        title: apiReport.title,
        summary: apiReport.summary,
        createdAt: apiReport.createdAt,
        period: apiReport.period,
        theme: apiReport.theme,
        score: apiReport.score,
        grade: apiReport.grade,
        sections,
        keywords: apiReport.keywords,
        insights: apiReport.insights,
        actionItems: apiReport.actionItems,
        qualityAudit: apiReport.qualityAudit || (fullData.qualityAudit as QualityAudit | undefined),
        calculationDetails:
          apiReport.calculationDetails ||
          (fullData.calculationDetails as CalculationDetails | undefined),
        graphRagEvidence:
          apiReport.graphRagEvidence ||
          (fullData.graphRagEvidence as GraphRAGEvidenceBundle | undefined),
        fullData,
      })
    } catch {
      setError('리포트를 불러오지 못했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [reportId])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (status === 'authenticated') {
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

  return (
    <PremiumPageScaffold accent="cyan">
      <header className="border-b border-white/10 px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <Link
            href="/premium-reports"
            className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-slate-900/60 px-3 py-1 text-sm text-slate-300 backdrop-blur-xl hover:border-cyan-300/60 hover:text-white"
          >
            리포트 목록으로
          </Link>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">{report.title}</h1>
              <p className="text-gray-400 text-sm mt-1">
                생성일: {new Date(report.createdAt).toLocaleDateString('ko-KR')}
              </p>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleDownloadPDF}
                className="rounded-lg border border-cyan-300/35 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-400/20"
              >
                PDF 다운로드
              </button>
              <button
                onClick={handleShare}
                className="rounded-lg border border-white/20 bg-slate-900/70 px-4 py-2 text-sm text-white transition hover:border-cyan-300/60"
              >
                공유하기
              </button>
              {showThemedDiagnostics && report.qualityAudit && (
                <button
                  onClick={handleDownloadQualityMarkdown}
                  className="rounded-lg border border-indigo-300/40 bg-indigo-500/20 px-4 py-2 text-sm text-indigo-100 transition hover:bg-indigo-500/35"
                >
                  품질 리포트(.md)
                </button>
              )}
              {showThemedDiagnostics && (
                <button
                  onClick={handleDownloadCalculationJson}
                  className="rounded-lg border border-cyan-300/40 bg-cyan-500/20 px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-500/35"
                >
                  계산 근거(.json)
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {report.score !== undefined && (
        <div className="max-w-5xl mx-auto px-4 mt-6">
          <div className="rounded-2xl border border-white/15 bg-gradient-to-r from-cyan-500/75 to-indigo-500/75 p-6 shadow-[0_16px_44px_rgba(14,165,233,0.35)]">
            <p className="text-white/80 text-sm">운세 점수</p>
            <p className="text-4xl font-bold text-white">{report.score}점</p>
            {report.grade && <p className="text-white/80 text-sm mt-1">등급: {report.grade}</p>}
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 mt-6">
        <div className="rounded-2xl border border-white/15 bg-slate-900/55 p-6 backdrop-blur-xl">
          <h2 className="text-lg font-bold text-white mb-3">핵심 요약</h2>
          <p className="text-gray-300 whitespace-pre-line">{report.summary}</p>
          {report.keywords && report.keywords.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {report.keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-sm text-cyan-100"
                >
                  #{keyword}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {showThemedDiagnostics && report.qualityAudit && (
        <div className="max-w-5xl mx-auto px-4 mt-6">
          <div className="rounded-2xl border border-white/15 bg-slate-900/55 p-6 backdrop-blur-xl">
            <h2 className="text-lg font-bold text-white mb-4">품질 점검</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
              <div className="bg-slate-900/60 rounded p-3 text-slate-200">
                Overall: {report.qualityAudit.overallQualityScore}
              </div>
              <div className="bg-slate-900/60 rounded p-3 text-slate-200">
                완성도: {report.qualityAudit.completenessScore}
              </div>
              <div className="bg-slate-900/60 rounded p-3 text-slate-200">
                교차근거: {report.qualityAudit.crossEvidenceScore}
              </div>
              <div className="bg-slate-900/60 rounded p-3 text-slate-200">
                실행성: {report.qualityAudit.actionabilityScore}
              </div>
              <div className="bg-slate-900/60 rounded p-3 text-slate-200">
                명확성: {report.qualityAudit.clarityScore}
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mt-4">
              <div>
                <h3 className="text-sm font-semibold text-green-300 mb-2">Strengths</h3>
                <ul className="text-xs text-slate-300 space-y-1">
                  {report.qualityAudit.strengths.map((item, idx) => (
                    <li key={`${item}-${idx}`}>• {item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-amber-300 mb-2">Issues</h3>
                <ul className="text-xs text-slate-300 space-y-1">
                  {report.qualityAudit.issues.map((item, idx) => (
                    <li key={`${item}-${idx}`}>• {item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-cyan-300 mb-2">Recommendations</h3>
                <ul className="text-xs text-slate-300 space-y-1">
                  {report.qualityAudit.recommendations.map((item, idx) => (
                    <li key={`${item}-${idx}`}>• {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {showThemedDiagnostics && report.calculationDetails && (
        <div className="max-w-5xl mx-auto px-4 mt-6">
          <div className="rounded-2xl border border-white/15 bg-slate-900/55 p-6 backdrop-blur-xl">
            <h2 className="text-lg font-bold text-white mb-4">사주/점성 계산 근거 전체 상세</h2>

            <details className="mb-3">
              <summary className="cursor-pointer text-slate-200">입력 스냅샷 (사주 + 점성)</summary>
              <pre className="mt-2 text-xs text-slate-300 overflow-auto bg-slate-900/60 p-3 rounded">
                {JSON.stringify(report.calculationDetails.inputSnapshot, null, 2)}
              </pre>
            </details>

            <details className="mb-3">
              <summary className="cursor-pointer text-slate-200">타이밍 데이터</summary>
              <pre className="mt-2 text-xs text-slate-300 overflow-auto bg-slate-900/60 p-3 rounded">
                {JSON.stringify(report.calculationDetails.timingData, null, 2)}
              </pre>
            </details>

            <details className="mb-3" open>
              <summary className="cursor-pointer text-slate-200">Matrix Summary</summary>
              <pre className="mt-2 text-xs text-slate-300 overflow-auto bg-slate-900/60 p-3 rounded">
                {JSON.stringify(report.calculationDetails.matrixSummary, null, 2)}
              </pre>
            </details>

            <details className="mb-3">
              <summary className="cursor-pointer text-slate-200">Top Insights + Sources</summary>
              <pre className="mt-2 text-xs text-slate-300 overflow-auto bg-slate-900/60 p-3 rounded">
                {JSON.stringify(report.calculationDetails.topInsightsWithSources, null, 2)}
              </pre>
            </details>

            <button
              onClick={() => setShowRawJson((prev) => !prev)}
              className="mt-2 px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 text-xs text-white"
            >
              {showRawJson ? 'Raw JSON 숨기기' : 'Raw JSON 전체 보기'}
            </button>

            {showRawJson && (
              <pre className="mt-3 text-xs text-slate-300 overflow-auto bg-slate-900/60 p-3 rounded max-h-[420px]">
                {JSON.stringify(report.calculationDetails, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}

      {report.graphRagEvidence && report.graphRagEvidence.anchors?.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 mt-6">
          <div className="rounded-2xl border border-white/15 bg-slate-900/55 p-6 backdrop-blur-xl">
            <h2 className="text-lg font-bold text-white mb-2">GraphRAG 교차 근거</h2>
            <p className="text-xs text-slate-400 mb-4">
              mode: {report.graphRagEvidence.mode}
              {report.graphRagEvidence.theme ? ` / theme: ${report.graphRagEvidence.theme}` : ''}
              {report.graphRagEvidence.period ? ` / period: ${report.graphRagEvidence.period}` : ''}
            </p>

            <div className="space-y-3">
              {report.graphRagEvidence.anchors.map((anchor) => (
                <details
                  key={anchor.id}
                  className="rounded-lg border border-white/15 bg-slate-950/45 p-3"
                >
                  <summary className="cursor-pointer text-sm font-semibold text-slate-200">
                    [{anchor.id}] {anchor.section}
                  </summary>
                  <div className="mt-3 space-y-2 text-xs leading-relaxed">
                    <div>
                      <p className="text-amber-300 font-semibold">Saju Basis</p>
                      <p className="text-slate-300">{anchor.sajuEvidence}</p>
                    </div>
                    <div>
                      <p className="text-cyan-300 font-semibold">Astrology Basis</p>
                      <p className="text-slate-300">{anchor.astrologyEvidence}</p>
                    </div>
                    <div>
                      <p className="text-emerald-300 font-semibold">Cross Conclusion</p>
                      <p className="text-slate-300">{anchor.crossConclusion}</p>
                    </div>
                    {Array.isArray(anchor.crossEvidenceSets) &&
                      anchor.crossEvidenceSets.length > 0 && (
                        <div>
                          <p className="text-violet-300 font-semibold mb-2">
                            Paired Cross Evidence Sets
                          </p>
                          <div className="space-y-2">
                            {anchor.crossEvidenceSets.map((set) => (
                              <div
                                key={`${anchor.id}-${set.id}`}
                                className="rounded border border-violet-300/20 bg-violet-900/20 p-2"
                              >
                                <p className="text-violet-200 font-semibold">
                                  {set.id}
                                  {typeof set.overlapScore === 'number'
                                    ? ` · overlap ${Math.round(set.overlapScore * 100)}%`
                                    : ''}
                                </p>
                                <p className="text-cyan-200 mt-1">
                                  Astrology (angle/orb): {set.astrologyEvidence}
                                </p>
                                <p className="text-amber-200 mt-1">
                                  Saju 대응 근거: {set.sajuEvidence}
                                </p>
                                {set.overlapDomains && set.overlapDomains.length > 0 && (
                                  <p className="text-slate-300 mt-1">
                                    Overlap domains: {set.overlapDomains.join(', ')}
                                  </p>
                                )}
                                {set.combinedConclusion && (
                                  <p className="text-emerald-200 mt-1">{set.combinedConclusion}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>
      )}

      {report.sections.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 mt-6">
          <div className="flex overflow-x-auto gap-2 pb-2">
            {report.sections.map((section, index) => (
              <button
                key={`${section.title}-${index}`}
                onClick={() => setActiveSection(index)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                  activeSection === index
                    ? 'bg-cyan-500 text-white'
                    : 'bg-slate-700/70 text-gray-300 hover:bg-slate-600'
                }`}
              >
                {section.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {report.sections.length > 0 && (
        <main className="max-w-5xl mx-auto px-4 py-6 pb-20">
          <div className="rounded-2xl border border-white/15 bg-slate-900/55 p-6 backdrop-blur-xl">
            <h2 className="text-xl font-bold text-white mb-4">
              {report.sections[activeSection].title}
            </h2>
            <div className="text-gray-300 whitespace-pre-line leading-relaxed">
              {report.sections[activeSection].content}
            </div>
          </div>
        </main>
      )}

      {report.actionItems && report.actionItems.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 pb-20">
          <div className="rounded-2xl border border-white/15 bg-slate-900/55 p-6 backdrop-blur-xl">
            <h2 className="text-lg font-bold text-white mb-4">실천 가이드</h2>
            <ul className="space-y-2">
              {report.actionItems.map((item, index) => (
                <li key={`${item}-${index}`} className="text-gray-300">
                  • {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </PremiumPageScaffold>
  )
}
