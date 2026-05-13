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
    <section className="text-center space-y-4">
      <div className="flex justify-center">
        <div className="p-3.5 bg-indigo-500/10 rounded-full border border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
          <MoonStar className="w-9 h-9 text-indigo-400" />
        </div>
      </div>
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-100">
        {directAnswer || (isKo ? '질문에 대한 핵심 답변' : 'Direct Answer to Your Question')}
      </h1>
      {questionSummary && (
        <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto">
          {questionSummary || translate('tarot.results.subtitle', 'Card Interpretation')}
        </p>
      )}
      {userTopic && (
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900/60 border border-slate-800 rounded-full text-sm text-slate-300">
          <span className="text-indigo-400 font-medium">Q.</span>
          <span className="truncate max-w-md">{userTopic}</span>
        </div>
      )}
      <p className="text-xs text-slate-500">
        {isKo ? `해석 스프레드 · ${spreadTitle}` : `Reading spread · ${spreadTitle}`}
      </p>
    </section>
  )
}
