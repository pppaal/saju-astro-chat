import React from 'react'
import Link from 'next/link'
import { MessageCircle, Loader2 } from 'lucide-react'
import type { TarotQuestionAnalysisSnapshot } from '@/lib/tarot/questionFlow'
import type { ReadingResponse, InterpretationResult } from '../../../types'
import type { DeckStyle } from '@/lib/tarot/tarot.types'
import type { CardColor } from '../../../constants'
import { HorizontalCardsGrid, DetailedCardsSection, ActionButtons } from '../../index'
import { ResultsHeader } from './ResultsHeader'
import { GuidanceSection } from './GuidanceSection'
import { CombinationsSection } from './CombinationsSection'

export interface ResultsStageProps {
  readingResult: ReadingResponse
  interpretation: InterpretationResult | null
  selectedColor: CardColor
  selectedDeckStyle: DeckStyle
  revealedCards: number[]
  detailedSectionRef: React.RefObject<HTMLDivElement | null>
  language: string
  translate: (key: string, fallback: string) => string
  userTopic: string
  questionAnalysis: TarotQuestionAnalysisSnapshot | null
  isGuestUser: boolean
  signInUrl: string
  handleCardReveal: (index: number) => void
  canRevealCard: (index: number) => boolean
  isCardRevealed: (index: number) => boolean
  isSaving: boolean
  isSaved: boolean
  saveMessage: string
  handleSaveReading: () => Promise<void>
  handleReset: () => void
}

export function ResultsStage(props: ResultsStageProps) {
  const {
    readingResult,
    interpretation,
    selectedColor,
    selectedDeckStyle,
    revealedCards,
    detailedSectionRef,
    language,
    translate,
    userTopic,
    questionAnalysis,
    isGuestUser,
    signInUrl,
    handleCardReveal,
    canRevealCard,
    isCardRevealed,
    isSaving,
    isSaved,
    saveMessage,
    handleSaveReading,
    handleReset,
  } = props

  const isKo = language === 'ko'
  const insight = interpretation
  const aiPending = insight?.fallback === true
  const hasGuidance =
    insight?.guidance &&
    (Array.isArray(insight.guidance)
      ? insight.guidance.length > 0
      : insight.guidance.trim().length > 0)

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 font-sans">
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex justify-center">
        <div className="w-96 h-96 bg-indigo-900 rounded-full blur-3xl opacity-20 mt-10" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 md:px-6 py-10 md:py-14 space-y-8">
        {/* ① 질문 */}
        <ResultsHeader
          readingResult={readingResult}
          userTopic={userTopic}
          language={language}
          translate={translate}
          questionAnalysis={questionAnalysis}
        />

        {isGuestUser && (
          <section className="rounded-2xl bg-amber-500/5 border border-amber-500/20 p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <p className="text-sm text-amber-200/90">
              {isKo
                ? '이번 무료 1회 리딩은 완료되었습니다. 추가 질문과 다음 리딩은 로그인 후 이어서 볼 수 있습니다.'
                : 'Your free guest reading is complete. Sign in to continue with more questions and another reading.'}
            </p>
            <Link
              href={signInUrl}
              className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-100 text-sm font-medium transition-colors whitespace-nowrap"
            >
              {isKo ? '로그인하고 계속 보기' : 'Sign In To Continue'}
            </Link>
          </section>
        )}

        {/* ② 카드 펼치기 */}
        <HorizontalCardsGrid
          readingResult={readingResult}
          selectedColor={selectedColor}
          selectedDeckStyle={selectedDeckStyle}
          language={language}
          revealedCards={revealedCards}
          onCardReveal={handleCardReveal}
          canRevealCard={canRevealCard}
          isCardRevealed={isCardRevealed}
          translate={translate}
        />

        {/* ③ 전체 해석 — LLM overall_message (loading placeholder until ready) */}
        {(insight?.overall_message || aiPending) && (
          <section className="rounded-2xl bg-slate-900/50 border border-indigo-500/20 shadow-[0_0_24px_rgba(99,102,241,0.08)] p-5 md:p-6">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-medium text-indigo-300 tracking-wider uppercase">
                {isKo ? '전체 해석 (AI)' : 'Overall Reading (AI)'}
              </h2>
            </div>
            {insight?.overall_message ? (
              <p className="text-base md:text-[17px] text-slate-100 leading-relaxed whitespace-pre-wrap">
                {insight.overall_message}
              </p>
            ) : (
              <div className="flex items-center gap-2 text-sm text-indigo-200/80 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>
                  {isKo
                    ? 'AI가 펼친 카드 전체를 당신의 질문에 맞춰 읽고 있어요…'
                    : 'AI is reading the full spread for your question…'}
                </span>
              </div>
            )}
          </section>
        )}

        {/* ④ 카드별 해석 — 우리 카드 의미 + LLM 해석 + 실천 팁 */}
        <DetailedCardsSection
          readingResult={readingResult}
          interpretation={interpretation}
          language={language}
          selectedDeckStyle={selectedDeckStyle}
          revealedCards={revealedCards}
          detailedSectionRef={detailedSectionRef}
          translate={translate}
        />

        {insight?.fallback && (
          <div
            className="rounded-xl bg-slate-900/70 border border-slate-700 p-4 flex items-center justify-between gap-3"
            role="status"
            aria-live="polite"
          >
            <strong className="text-sm text-slate-200">
              {isKo ? '임시 해석 모드' : 'Fallback interpretation mode'}
            </strong>
            <button
              type="button"
              className="px-3 py-1.5 rounded-full bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-200 text-xs font-medium transition-colors"
              onClick={() => window.location.reload()}
            >
              {isKo ? 'AI 해석 다시 시도' : 'Retry AI interpretation'}
            </button>
          </div>
        )}

        {/* ⑤ 카드 조합 (LLM combinations) */}
        <CombinationsSection combinations={insight?.combinations} language={language} />

        {/* ⑥ 조언과 예측 */}
        {hasGuidance && <GuidanceSection guidance={insight!.guidance!} language={language} />}

        {saveMessage && (
          <div
            className="rounded-xl bg-slate-900/60 border border-slate-700 px-4 py-3 text-sm text-slate-300"
            role="status"
            aria-live="polite"
          >
            {saveMessage}
          </div>
        )}

        <ActionButtons
          language={language}
          isSaved={isSaved}
          isSaving={isSaving}
          onSave={handleSaveReading}
          onReset={handleReset}
        />
      </div>
    </div>
  )
}
