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
      {/* 사용자 질문 — 가장 위, 가운데 정렬. GlobalHeader (fixed top-4, ≈ 60px 높이) 와
          겹치지 않게 mt-20 (80px) 으로 충분히 띄움. */}
      {userTopic && (
        <div className="mt-20 md:mt-16 rounded-2xl bg-gradient-to-br from-[rgba(212,181,114,0.15)] to-[rgba(193,155,86,0.1)] border border-[rgba(212,181,114,0.3)] px-5 py-4 md:px-6 md:py-5">
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[rgba(212,181,114,0.25)] border border-[rgba(212,181,114,0.4)] text-[#fff8e1] text-base font-semibold">
              Q
            </span>
            <p className="text-2xl md:text-3xl text-slate-50 leading-snug font-semibold">
              {userTopic}
            </p>
          </div>
        </div>
      )}

      {/* 핵심 답변 + 보조 메타 */}
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <div className="p-3 bg-[rgba(212,181,114,0.1)] rounded-full border border-[rgba(212,181,114,0.2)] shadow-[0_0_24px_rgba(212,181,114,0.18)]">
            <MoonStar className="w-7 h-7 text-[#d4b572]" />
          </div>
        </div>
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-100">
          {directAnswer || (isKo ? '카드가 전하는 답변' : 'The Answer From the Cards')}
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
