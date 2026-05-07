'use client'

import { useEffect, useMemo, useState } from 'react'
import { Sparkles, Clock } from 'lucide-react'
import { runMainSaju } from '@/lib/main-saju'
import { buildExtendedAnalysisFromMain } from '@/lib/Saju/extendedAnalysis'
import type { ExtendedAnalysis } from '@/lib/Saju/extendedAnalysis'
import ExtendedAnalysisSection from './ExtendedAnalysisSection'

const AI_SECTIONS: Array<{ key: string; label: string }> = [
  { key: 'introduction', label: '인트로 — 전체 운명 요약' },
  { key: 'personalityDeep', label: '성격 심층 분석' },
  { key: 'careerPath', label: '커리어 경로 & 적성' },
  { key: 'relationshipDynamics', label: '관계 역학' },
  { key: 'spouseProfile', label: '배우자상' },
  { key: 'wealthPotential', label: '재물운 & 재테크' },
  { key: 'healthGuidance', label: '건강 가이드' },
  { key: 'lifeMission', label: '인생 사명' },
  { key: 'lifeStages', label: '시기별 흐름' },
  { key: 'turningPoints', label: '주요 변곡점' },
  { key: 'futureOutlook', label: '향후 3~5년 전망' },
  { key: 'timingAdvice', label: '타이밍 조언' },
  { key: 'actionPlan', label: '실천 가이드' },
  { key: 'conclusion', label: '마무리 메시지' },
]

interface GeneratingPreviewProps {
  birth: {
    birthDate: string
    birthTime?: string
    gender?: 'M' | 'F' | 'male' | 'female' | string
    timezone?: string
  }
}

/**
 * Shown while the premium AI report is generating. Computes the
 * deterministic ExtendedAnalysis client-side from the user's birth info
 * and renders it immediately, while the LLM-backed sections show as
 * shimmer skeletons. Replaces the old fullscreen black spinner with
 * something the user can actually read during the 60~120s wait.
 */
export default function GeneratingPreview({ birth }: GeneratingPreviewProps) {
  // Run the saju engine + extended analysis client-side. Pure functions
  // (calculateSajuData uses korean-lunar-calendar; no fetch / DB).
  const analysis: ExtendedAnalysis | null = useMemo(() => {
    if (!birth.birthDate) return null
    try {
      const gender =
        String(birth.gender || '').toLowerCase().startsWith('f') ? 'female' : 'male'
      const main = runMainSaju({
        birthDate: birth.birthDate,
        birthTime: birth.birthTime || '12:00',
        gender,
        timezone: birth.timezone || 'Asia/Seoul',
      })
      const koreanAge =
        new Date().getFullYear() - parseInt(birth.birthDate.slice(0, 4), 10) + 1
      return buildExtendedAnalysisFromMain(main, { koreanAge })
    } catch {
      return null
    }
  }, [birth.birthDate, birth.birthTime, birth.gender, birth.timezone])

  // Elapsed timer to give the user a sense of progress.
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [])
  const expectedSeconds = 75
  const progress = Math.min(100, Math.round((elapsed / expectedSeconds) * 100))

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,#1a1c2e_0%,#0a0a14_60%)] text-slate-100 pb-20">
      <div className="mx-auto max-w-5xl px-6 pt-12 sm:pt-16">
        {/* Generating banner */}
        <div className="rounded-2xl border border-fuchsia-400/30 bg-gradient-to-br from-fuchsia-500/10 via-purple-500/5 to-transparent p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-fuchsia-300 animate-pulse" />
              <span className="text-sm font-semibold text-white">AI가 리포트를 작성 중입니다</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
              <Clock className="w-3 h-3" />
              {elapsed}s / ~{expectedSeconds}s
            </div>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mb-2">
            <div
              className="h-full bg-gradient-to-r from-fuchsia-500 to-purple-500 transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-300/80">
            결정론적 사주 분석은 아래에 즉시 표시됩니다. AI가 작성하는 14개 섹션은 아래에 차례로 채워집니다.
          </p>
        </div>

        {/* Deterministic preview */}
        {analysis ? (
          <ExtendedAnalysisSection analysis={analysis} />
        ) : (
          <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 text-center text-slate-400">
            출생 정보를 불러오는 중…
          </div>
        )}

        {/* AI section skeletons */}
        <section className="mx-auto mt-8 max-w-4xl px-4">
          <div className="mb-3">
            <h3 className="text-lg font-bold text-white">AI 작성 중인 섹션 (14개)</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              완성되면 이 화면이 자동으로 결과 페이지로 이동합니다
            </p>
          </div>
          <div className="space-y-3">
            {AI_SECTIONS.map((s, i) => {
              const elapsedRatio = elapsed / expectedSeconds
              const sectionRatio = (i + 1) / AI_SECTIONS.length
              const isLikelyDone = elapsedRatio >= sectionRatio
              return (
                <div
                  key={s.key}
                  className={`rounded-xl border p-4 transition-colors ${
                    isLikelyDone
                      ? 'border-emerald-400/20 bg-emerald-500/5'
                      : 'border-white/10 bg-slate-900/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">{s.label}</span>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                      {isLikelyDone ? '✓ 추정' : '작성 중…'}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className={`h-full ${
                          isLikelyDone ? 'bg-emerald-400/40' : 'bg-fuchsia-400/30 animate-pulse'
                        }`}
                        style={{ width: isLikelyDone ? '100%' : '60%' }}
                      />
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className={`h-full ${
                          isLikelyDone ? 'bg-emerald-400/40' : 'bg-fuchsia-400/20 animate-pulse'
                        }`}
                        style={{ width: isLikelyDone ? '100%' : '85%' }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
