import React from 'react'
import { Sparkles } from 'lucide-react'
import type { AdviceItem } from '../../../types'

interface GuidanceSectionProps {
  guidance: string | AdviceItem[]
  language: string
}

function normalizeGuidance(guidance: string | AdviceItem[]): AdviceItem[] {
  if (Array.isArray(guidance)) {
    return guidance
      .map((item) => ({
        title: (item?.title || '').trim(),
        detail: (item?.detail || '').trim(),
      }))
      .filter((item) => item.title || item.detail)
  }
  const text = guidance.trim()
  if (!text) return []
  return [{ title: '', detail: text }]
}

export function GuidanceSection({ guidance, language }: GuidanceSectionProps) {
  const items = normalizeGuidance(guidance)
  if (items.length === 0) return null

  const isKo = language === 'ko'

  return (
    <section className="rounded-2xl bg-slate-900/50 border border-indigo-500/20 shadow-[0_0_24px_rgba(99,102,241,0.08)] p-5 md:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-indigo-400" />
        <h2 className="text-sm font-medium text-indigo-300 tracking-wider uppercase">
          {isKo ? '실천 조언과 예측' : 'Action Advice & Prediction'}
        </h2>
      </div>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="rounded-xl bg-slate-800/40 border border-slate-700/50 p-4">
            {item.title && (
              <div className="text-sm font-medium text-slate-200 mb-1.5">{item.title}</div>
            )}
            {item.detail && (
              <p className="text-sm md:text-[15px] text-slate-300 leading-relaxed whitespace-pre-wrap">
                {item.detail}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
