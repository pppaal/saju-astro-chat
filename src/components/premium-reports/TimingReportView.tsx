'use client'

import { useState } from 'react'

interface DomainAnalysis {
  career: string
  love: string
  wealth: string
  health: string
}

export interface TimingReportData {
  id: string
  period: 'daily' | 'monthly' | 'yearly'
  targetDate: string
  score: number
  overview: string
  energy: string
  opportunities: string
  cautions: string
  domains: DomainAnalysis
  actionPlan: string
  keywords: string[]
  createdAt: string
}

interface TimingReportViewProps {
  report: TimingReportData
  onDownloadPDF?: () => void
  onShare?: () => void
}

const PERIOD_LABELS = {
  daily: '오늘',
  monthly: '이번 달',
  yearly: '올해',
}

const DOMAIN_INFO = {
  career: { label: '커리어', emoji: '💼', color: 'from-blue-500 to-indigo-500' },
  love: { label: '사랑', emoji: '💕', color: 'from-pink-500 to-rose-500' },
  wealth: { label: '재물', emoji: '💰', color: 'from-yellow-500 to-amber-500' },
  health: { label: '건강', emoji: '🏥', color: 'from-green-500 to-emerald-500' },
}

export function TimingReportView({ report, onDownloadPDF, onShare }: TimingReportViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'domains' | 'action'>('overview')

  const getScoreEmoji = (score: number) => {
    if (score >= 80) {
      return '🌟'
    }
    if (score >= 60) {
      return '✨'
    }
    if (score >= 40) {
      return '💫'
    }
    return '🌙'
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) {
      return 'from-yellow-400 to-orange-500'
    }
    if (score >= 60) {
      return 'from-green-400 to-emerald-500'
    }
    if (score >= 40) {
      return 'from-blue-400 to-cyan-500'
    }
    return 'from-purple-400 to-indigo-500'
  }

  return (
    <div className="space-y-6">
      {/* Score Card */}
      <div className={`bg-gradient-to-r ${getScoreColor(report.score)} rounded-2xl p-6 shadow-lg`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm">{PERIOD_LABELS[report.period]}의 운세 점수</p>
            <p className="text-5xl font-bold text-white mt-1">{report.score}점</p>
          </div>
          <div className="text-6xl">{getScoreEmoji(report.score)}</div>
        </div>
      </div>

      {/* Keywords */}
      {report.keywords && report.keywords.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {report.keywords.map((keyword, index) => (
            <span
              key={index}
              className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-sm"
            >
              #{keyword}
            </span>
          ))}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 p-1 bg-slate-800 rounded-xl">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'overview' ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          총평
        </button>
        <button
          onClick={() => setActiveTab('domains')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'domains' ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          영역별
        </button>
        <button
          onClick={() => setActiveTab('action')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'action' ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          실천 가이드
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Overview */}
            <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <span>📋</span> 총평
              </h3>
              <p className="text-gray-300 leading-relaxed">{report.overview}</p>
            </div>

            {/* Energy */}
            <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <span>⚡</span> 에너지 흐름
              </h3>
              <p className="text-gray-300 leading-relaxed">{report.energy}</p>
            </div>

            {/* Opportunities & Cautions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-500/10 rounded-xl p-5 border border-green-500/30">
                <h3 className="text-lg font-bold text-green-400 mb-3 flex items-center gap-2">
                  <span>🎯</span> 기회 시기
                </h3>
                <p className="text-gray-300 leading-relaxed">{report.opportunities}</p>
              </div>
              <div className="bg-orange-500/10 rounded-xl p-5 border border-orange-500/30">
                <h3 className="text-lg font-bold text-orange-400 mb-3 flex items-center gap-2">
                  <span>⚠️</span> 주의 시기
                </h3>
                <p className="text-gray-300 leading-relaxed">{report.cautions}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'domains' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(Object.entries(report.domains) as [keyof DomainAnalysis, string][]).map(
              ([key, content]) => (
                <div
                  key={key}
                  className={`bg-gradient-to-br ${DOMAIN_INFO[key].color} bg-opacity-10 rounded-xl p-5 border border-slate-700/50`}
                >
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <span>{DOMAIN_INFO[key].emoji}</span>
                    {DOMAIN_INFO[key].label}
                  </h3>
                  <p className="text-gray-300 leading-relaxed text-sm">{content}</p>
                </div>
              )
            )}
          </div>
        )}

        {activeTab === 'action' && (
          <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span>✅</span> {PERIOD_LABELS[report.period]} 실천 가이드
            </h3>
            <div className="text-gray-300 leading-relaxed whitespace-pre-line">
              {report.actionPlan}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-slate-700/50">
        {onDownloadPDF && (
          <button
            onClick={onDownloadPDF}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium transition-colors flex items-center justify-center gap-2"
          >
            📄 PDF 다운로드
          </button>
        )}
        {onShare && (
          <button
            onClick={onShare}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium transition-colors flex items-center justify-center gap-2"
          >
            🔗 공유하기
          </button>
        )}
      </div>
    </div>
  )
}
