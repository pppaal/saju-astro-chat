'use client'

import { Gauge } from 'lucide-react'

interface ComprehensiveScoreLike {
  overall?: number
  grade?: string
  summary?: string
  strengths?: string[]
  weaknesses?: string[]
  recommendations?: string[]
}

interface Props {
  score?: ComprehensiveScoreLike | null
  isKo: boolean
}

const GRADE_COLOR: Record<string, string> = {
  S: 'text-amber-300 border-amber-400/50 bg-amber-500/10',
  A: 'text-emerald-300 border-emerald-400/40 bg-emerald-500/10',
  B: 'text-cyan-300 border-cyan-400/40 bg-cyan-500/10',
  C: 'text-slate-300 border-slate-400/40 bg-slate-500/10',
  D: 'text-orange-300 border-orange-400/40 bg-orange-500/10',
  F: 'text-rose-300 border-rose-400/40 bg-rose-500/10',
}

export default function SajuComprehensiveScoreCard({ score, isKo }: Props) {
  if (!score || typeof score.overall !== 'number') return null
  const grade = (score.grade || '').trim()
  const gradeTone = GRADE_COLOR[grade] || 'text-white border-white/20 bg-white/5'

  const hasLists =
    (score.strengths?.length ?? 0) > 0 ||
    (score.weaknesses?.length ?? 0) > 0 ||
    (score.recommendations?.length ?? 0) > 0

  if (!hasLists && !score.summary) return null

  return (
    <section className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-800/40 p-5 md:p-6">
      <div className="flex items-center gap-2 mb-3">
        <Gauge className="w-4 h-4 text-fuchsia-300" />
        <h3 className="text-sm font-bold text-white">
          {isKo ? '사주 종합 점수' : 'Saju Comprehensive Score'}
        </h3>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-white">{score.overall}</span>
            <span className="text-sm text-slate-400">/100</span>
          </div>
          <div className="h-2 mt-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-fuchsia-400 to-amber-400"
              style={{ width: `${Math.max(0, Math.min(100, score.overall))}%` }}
            />
          </div>
        </div>
        {grade && (
          <div
            className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl border ${gradeTone}`}
          >
            <span className="text-xs font-mono uppercase">{isKo ? '등급' : 'Grade'}</span>
            <span className="text-2xl font-bold">{grade}</span>
          </div>
        )}
      </div>

      {score.summary && (
        <p className="text-sm md:text-base text-slate-300 leading-relaxed mb-3">
          {score.summary}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(score.strengths?.length ?? 0) > 0 && (
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-3">
            <div className="text-[11px] font-mono uppercase tracking-widest text-emerald-300 mb-1.5">
              {isKo ? '강점' : 'Strengths'}
            </div>
            <ul className="space-y-1">
              {score.strengths!.map((s, i) => (
                <li key={i} className="text-sm text-slate-200 flex gap-1.5">
                  <span className="text-emerald-400">+</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {(score.weaknesses?.length ?? 0) > 0 && (
          <div className="rounded-xl border border-rose-400/20 bg-rose-500/5 p-3">
            <div className="text-[11px] font-mono uppercase tracking-widest text-rose-300 mb-1.5">
              {isKo ? '약점' : 'Weaknesses'}
            </div>
            <ul className="space-y-1">
              {score.weaknesses!.map((s, i) => (
                <li key={i} className="text-sm text-slate-200 flex gap-1.5">
                  <span className="text-rose-400">!</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {(score.recommendations?.length ?? 0) > 0 && (
          <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-3">
            <div className="text-[11px] font-mono uppercase tracking-widest text-cyan-300 mb-1.5">
              {isKo ? '권고' : 'Recommendations'}
            </div>
            <ul className="space-y-1">
              {score.recommendations!.map((s, i) => (
                <li key={i} className="text-sm text-slate-200 flex gap-1.5">
                  <span className="text-cyan-400">→</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
