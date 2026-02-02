'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface ReportSection {
  title: string
  content: string
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
        setError(data.error?.message || '리포트를 불러오는데 실패했습니다.')
        return
      }

      // API 응답을 ReportData 형식으로 변환
      const apiReport = data.report
      const fullData = apiReport.fullData || {}

      // sections 변환 (다양한 형식 지원)
      let sections: ReportSection[] = []

      if (Array.isArray(apiReport.sections) && apiReport.sections.length > 0) {
        sections = apiReport.sections
      } else if (fullData.sections && Array.isArray(fullData.sections)) {
        sections = fullData.sections
      } else {
        // 리포트 데이터에서 섹션 추출 시도
        const possibleSections = ['overview', 'analysis', 'timing', 'advice', 'summary']
        for (const key of possibleSections) {
          if (fullData[key] && typeof fullData[key] === 'string') {
            sections.push({ title: getSectionTitle(key), content: fullData[key] as string })
          } else if (fullData[key] && typeof fullData[key] === 'object') {
            const obj = fullData[key] as Record<string, unknown>
            if (obj.content) {
              sections.push({
                title: (obj.title as string) || getSectionTitle(key),
                content: obj.content as string,
              })
            }
          }
        }

        // 여전히 섹션이 없으면 기본 섹션 생성
        if (sections.length === 0 && apiReport.summary) {
          sections.push({ title: '요약', content: apiReport.summary })
        }
      }

      // keywords 추출
      let keywords: string[] = apiReport.keywords || []
      if (keywords.length === 0 && fullData.keywords) {
        keywords = fullData.keywords as string[]
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
        keywords,
        insights: apiReport.insights,
        actionItems: apiReport.actionItems,
        fullData,
      });
    } catch {
      setError('리포트를 불러오는데 실패했습니다.')
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
      loadReport()
    }
  }, [status, router, loadReport])

  const getSectionTitle = (key: string): string => {
    const titles: Record<string, string> = {
      overview: '총평',
      analysis: '상세 분석',
      timing: '시기 분석',
      advice: '조언',
      summary: '요약',
    }
    return titles[key] || key
  }

  const handleDownloadPDF = async () => {
    try {
      const response = await fetch(`/api/destiny-matrix/ai-report?reportId=${reportId}&format=pdf`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `destiny-report-${reportId}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert('PDF 다운로드에 실패했습니다.')
      }
    } catch {
      alert('PDF 다운로드 중 오류가 발생했습니다.')
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: report?.title,
          text: report?.summary,
          url: window.location.href,
        });
      } catch {
        // 사용자가 공유를 취소한 경우
      }
    } else {
      await navigator.clipboard.writeText(window.location.href)
      alert('링크가 복사되었습니다.')
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <div
        className="min-h-[100svh] bg-slate-900 flex items-center justify-center"
        aria-busy="true"
      >
        <div className="text-center" role="status" aria-live="polite">
          <div
            className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"
            aria-hidden="true"
          />
          <p className="text-white">리포트 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-[100svh] bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || '리포트를 찾을 수 없습니다.'}</p>
          <Link href="/premium-reports" className="text-purple-400 hover:text-purple-300">
            리포트 목록으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100svh] bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="py-8 px-4 border-b border-slate-700/50">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/premium-reports"
            className="text-gray-400 hover:text-white text-sm mb-4 inline-flex items-center gap-1"
          >
            ← 리포트 목록으로
          </Link>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">{report.title}</h1>
              <p className="text-gray-400 text-sm mt-1">
                생성일: {new Date(report.createdAt).toLocaleDateString('ko-KR')}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleDownloadPDF}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                PDF 다운로드
              </button>
              <button
                onClick={handleShare}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                공유하기
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Score Card */}
      {report.score && (
        <div className="max-w-4xl mx-auto px-4 -mt-6">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">운세 점수</p>
                <p className="text-4xl font-bold text-white">{report.score}점</p>
                {report.grade && <p className="text-white/80 text-sm mt-1">등급: {report.grade}</p>}
              </div>
              <div className="text-6xl">
                {report.score >= 90
                  ? '🌟'
                  : report.score >= 80
                    ? '⭐'
                    : report.score >= 70
                      ? '✨'
                      : report.score >= 60
                        ? '💫'
                        : '🌙'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="max-w-4xl mx-auto px-4 mt-6">
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <h2 className="text-lg font-bold text-white mb-3">핵심 요약</h2>
          <p className="text-gray-300">{report.summary}</p>

          {report.keywords && report.keywords.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {report.keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-sm"
                >
                  #{keyword}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Section Navigation */}
      {report.sections.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 mt-6">
          <div
            className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide"
            role="tablist"
            aria-label="리포트 섹션"
          >
            {report.sections.map((section, index) => (
              <button
                key={index}
                onClick={() => setActiveSection(index)}
                role="tab"
                aria-selected={activeSection === index}
                aria-controls={`section-panel-${index}`}
                id={`section-tab-${index}`}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
                  activeSection === index
                    ? 'bg-purple-500 text-white'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                {section.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Section Content */}
      {report.sections.length > 0 && (
        <main className="max-w-4xl mx-auto px-4 py-6 pb-20">
          <div
            className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50"
            role="tabpanel"
            id={`section-panel-${activeSection}`}
            aria-labelledby={`section-tab-${activeSection}`}
          >
            <h2 className="text-xl font-bold text-white mb-4">
              {report.sections[activeSection].title}
            </h2>
            <div className="text-gray-300 whitespace-pre-line leading-relaxed">
              {report.sections[activeSection].content}
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-6">
            <button
              onClick={() => setActiveSection((prev) => Math.max(0, prev - 1))}
              disabled={activeSection === 0}
              className={`px-4 py-2 rounded-lg focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
                activeSection === 0
                  ? 'bg-slate-700 text-gray-500 cursor-not-allowed'
                  : 'bg-slate-700 text-white hover:bg-slate-600'
              }`}
            >
              ← 이전
            </button>
            <button
              onClick={() =>
                setActiveSection((prev) => Math.min(report.sections.length - 1, prev + 1))
              }
              disabled={activeSection === report.sections.length - 1}
              className={`px-4 py-2 rounded-lg focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
                activeSection === report.sections.length - 1
                  ? 'bg-slate-700 text-gray-500 cursor-not-allowed'
                  : 'bg-slate-700 text-white hover:bg-slate-600'
              }`}
            >
              다음 →
            </button>
          </div>
        </main>
      )}

      {/* Action Items */}
      {report.actionItems && report.actionItems.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 pb-20">
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
            <h2 className="text-lg font-bold text-white mb-4">실천 가이드</h2>
            <ul className="space-y-2">
              {report.actionItems.map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-300">
                  <span className="text-purple-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
