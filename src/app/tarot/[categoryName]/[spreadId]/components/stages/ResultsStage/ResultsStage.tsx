import React from 'react'
import Link from 'next/link'
import { MessageCircle, Loader2, AlertCircle, History, RotateCcw } from 'lucide-react'
import type { TarotQuestionAnalysisSnapshot } from '@/lib/tarot/questionFlow'
import type { ReadingResponse, InterpretationResult } from '../../../types'
import type { DeckStyle } from '@/lib/tarot/tarot.types'
import type { CardColor } from '../../../constants'
import { HorizontalCardsGrid, DetailedCardsSection, ActionButtons } from '../../index'
import { ResultsHeader } from './ResultsHeader'
import { GuidanceSection } from './GuidanceSection'
import { FollowupChat } from './FollowupChat'
import { renderHighlighted } from '../../ResultsView/highlight'

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
  interpretationFailed?: boolean
  handleRetryInterpretation?: () => void
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
    interpretationFailed = false,
    handleRetryInterpretation,
  } = props

  const isKo = language === 'ko'
  const insight = interpretation
  const aiPending = insight?.fallback === true && !interpretationFailed
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

        {/* ③ 전체 해석 — LLM overall_message (스트리밍이면 부분 텍스트 + 타이핑 인디케이터) */}
        {(insight?.overall_message || aiPending) && (
          <section className="rounded-2xl bg-slate-900/50 border border-indigo-500/20 shadow-[0_0_24px_rgba(99,102,241,0.08)] p-5 md:p-6">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-medium text-indigo-300 tracking-wider uppercase">
                {isKo ? '전체 해석' : 'Overall Reading'}
              </h2>
              {aiPending && insight?.overall_message && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-[10px] text-indigo-200">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {isKo ? '타이핑 중' : 'typing'}
                </span>
              )}
            </div>
            {insight?.overall_message ? (
              <p className="text-lg md:text-[19px] text-slate-100 leading-relaxed whitespace-pre-wrap">
                {renderHighlighted(insight.overall_message)}
                {aiPending && (
                  <span className="inline-block w-1.5 h-4 ml-0.5 bg-indigo-300/80 align-middle animate-pulse" />
                )}
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

        {interpretationFailed && (
          <div
            className="rounded-2xl bg-rose-500/5 border border-rose-500/30 p-4 md:p-5 flex flex-col sm:flex-row sm:items-center gap-3"
            role="alert"
          >
            <div className="flex items-start gap-3 flex-1">
              <AlertCircle className="w-5 h-5 text-rose-300 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-rose-100">
                  {isKo ? 'AI 해석을 받지 못했어요' : 'AI reading could not be loaded'}
                </div>
                <div className="text-xs text-rose-200/70 mt-0.5 leading-snug">
                  {isKo
                    ? '네트워크 또는 서버가 잠시 응답하지 않았어요. 다시 시도해 주세요.'
                    : 'Network or server briefly unavailable. Please try again.'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRetryInterpretation}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-100 text-sm font-medium transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {isKo ? '다시 시도' : 'Retry'}
            </button>
          </div>
        )}

        {/* ⑤ 조언과 예측 */}
        {hasGuidance && <GuidanceSection guidance={insight!.guidance!} language={language} />}

        {/* ⑦ Follow-up 채팅 — AI 응답이 도착한 후에만 노출 */}
        {!aiPending && insight?.overall_message && (
          <FollowupChat
            readingResult={readingResult}
            interpretation={interpretation}
            userTopic={userTopic}
            language={language}
          />
        )}

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

        {/* 저장된 리딩은 어디서? — 사용자 동선 회복 */}
        {!isGuestUser && (
          <div className="flex justify-center">
            <Link
              href="/tarot/history"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-sm text-slate-300 hover:text-slate-100 transition-colors"
            >
              <History className="w-4 h-4" />
              {isKo ? '내 리딩 보기' : 'View my readings'}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
