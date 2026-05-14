import React from 'react'
import { MoonStar } from 'lucide-react'
import type { ReadingResponse } from '../../../types'
import type { TarotQuestionAnalysisSnapshot } from '@/lib/tarot/questionFlow'

interface ResultsHeaderProps {
  readingResult: ReadingResponse
  userTopic: string
  language: string
  translate: (key: string, fallback: string) => string
  questionAnalysis: TarotQuestionAnalysisSnapshot | null
}

export function ResultsHeader({
  readingResult,
  userTopic,
  language,
  translate,
  questionAnalysis,
}: ResultsHeaderProps) {
  const isKo = language === 'ko'
  const directAnswer = questionAnalysis?.direct_answer?.trim()
  const questionSummary = questionAnalysis?.question_summary?.trim()
  const spreadTitle = isKo
    ? readingResult.spread.titleKo || readingResult.spread.title
    : readingResult.spread.title

  return (
    <section className="space-y-4">
      {/* 사용자 질문 — 가장 위, 가장 크게. 우리가 답하고 있는 게 뭔지 한눈에. */}
      {userTopic && (
        <div className="rounded-2xl bg-gradient-to-br from-indigo-500/15 to-violet-500/10 border border-indigo-500/30 px-5 py-4 md:px-6 md:py-5">
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500/25 border border-indigo-500/40 text-indigo-100 text-base font-semibold shrink-0">
              Q
            </span>
            <p className="text-lg md:text-xl text-slate-50 leading-snug font-medium">
              {userTopic}
            </p>
          </div>
        </div>
      )}

      {/* 핵심 답변 + 보조 메타 */}
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <div className="p-3 bg-indigo-500/10 rounded-full border border-indigo-500/20 shadow-[0_0_24px_rgba(99,102,241,0.18)]">
            <MoonStar className="w-7 h-7 text-indigo-400" />
          </div>
        </div>
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-100">
          {directAnswer || (isKo ? '카드가 전하는 핵심 답변' : 'Direct Answer From the Cards')}
        </h1>
        {questionSummary && (
          <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto">
            {questionSummary || translate('tarot.results.subtitle', 'Card Interpretation')}
          </p>
        )}
        <p className="text-xs text-slate-500">
          {isKo ? `해석 스프레드 · ${spreadTitle}` : `Reading spread · ${spreadTitle}`}
        </p>
      </div>
    </section>
  )
}
