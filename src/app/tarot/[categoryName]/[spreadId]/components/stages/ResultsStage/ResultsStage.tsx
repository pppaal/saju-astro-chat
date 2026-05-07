'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, MoreHorizontal, Sparkles, Star } from 'lucide-react'
import {
  getQuestionIntent,
  type TarotQuestionAnalysisSnapshot,
} from '@/lib/Tarot/questionFlow'
import { getCardImagePath, type DeckStyle, type DrawnCard } from '@/lib/Tarot/tarot.types'
import type { ReadingResponse, InterpretationResult } from '../../../types'
import type { CardColor } from '../../../constants'
import { HorizontalCardsGrid } from '../../index'
import { CombinationsSection } from './CombinationsSection'

export interface ResultsStageProps {
  readingResult: ReadingResponse
  interpretation: InterpretationResult | null
  selectedColor: CardColor
  selectedDeckStyle: DeckStyle
  revealedCards: number[]
  expandedCard: number | null
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
  scrollToDetails: () => void
  toggleCardExpand: (index: number) => void
  isSaving: boolean
  isSaved: boolean
  saveMessage: string
  handleSaveReading: () => Promise<void>
  handleReset: () => void
}

type LikelihoodLevel = 'high' | 'medium' | 'low'
type QuestionIntent = 'yesNo' | 'flow' | 'open'

function firstSentence(text: string): string {
  const cleaned = (text || '').replace(/\s+/g, ' ').trim()
  if (!cleaned) return ''
  const match = cleaned.match(/[^.!?\n]+[.!?]?/)
  return (match?.[0] || cleaned).trim()
}

function extractActionLine(
  guidance: InterpretationResult['guidance'] | undefined,
  language: string
): string {
  if (!guidance) {
    return language === 'ko'
      ? '오늘 실행할 1단계를 정하고 바로 시작하세요.'
      : 'Pick one action and do it today.'
  }
  if (Array.isArray(guidance)) {
    const firstDetail = guidance.find((item) => item?.detail?.trim())?.detail || ''
    return firstSentence(firstDetail)
  }
  return firstSentence(guidance)
}

function normalizeGuidanceLines(guidance: InterpretationResult['guidance'] | undefined): string[] {
  if (!guidance) return []
  if (Array.isArray(guidance)) {
    return guidance.map((item) => (item?.detail || item?.title || '').trim()).filter(Boolean)
  }
  return guidance
    .split(/\n+/)
    .map((line) => line.replace(/^\d+\s*[\).:-]?\s*/, '').trim())
    .filter(Boolean)
    .map((line) => {
      const colonMatch = line.match(/^([^:：]{1,30})\s*[:：]\s*(.+)$/)
      return colonMatch ? colonMatch[2].trim() : line
    })
}

function inferLikelihoodLevel(text: string): LikelihoodLevel {
  const normalized = (text || '').toLowerCase()
  const lowPatterns = [/낮/, /어려/, /힘들/, /지연/, /보류/, /불리/, /막히/, /경계/, /부정/, /risk/, /unlikely/, /difficult/, /delay/]
  const highPatterns = [/높/, /가능/, /유리/, /긍정/, /성사/, /순조/, /호전/, /good chance/, /likely/, /favorable/, /strong signal/]
  if (lowPatterns.some((p) => p.test(normalized))) return 'low'
  if (highPatterns.some((p) => p.test(normalized))) return 'high'
  return 'medium'
}

function getLikelihoodBadge(level: LikelihoodLevel, language: string): string {
  if (language === 'ko') {
    if (level === 'high') return '가능성 높음'
    if (level === 'low') return '가능성 낮음'
    return '가능성 보통'
  }
  if (level === 'high') return 'High'
  if (level === 'low') return 'Low'
  return 'Medium'
}

function fallbackAvoidLine(level: LikelihoodLevel, language: string): string {
  if (language === 'ko') {
    if (level === 'high') return '성급한 확답 요구나 과한 압박은 피하세요.'
    if (level === 'low') return '감정 섞인 압박과 결과 집착은 피하세요.'
    return '결론을 서두르거나 단정하는 말은 피하세요.'
  }
  if (level === 'high') return 'Avoid pushing for certainty too quickly.'
  if (level === 'low') return 'Avoid emotional pressure and result obsession.'
  return 'Avoid rushing to a fixed conclusion.'
}

function fallbackAttitudeLine(level: LikelihoodLevel, language: string): string {
  if (language === 'ko') {
    if (level === 'high') return '기대는 유지하되, 상대 템포를 존중하며 진행하세요.'
    if (level === 'low') return '기대를 낮추고 반응을 관찰하는 태도가 유리합니다.'
    return '중립적으로 상황을 관찰하고 작은 신호를 확인하세요.'
  }
  if (level === 'high') return "Stay positive, but respect the other person's pace."
  if (level === 'low') return 'Lower expectations and observe responses calmly.'
  return 'Stay neutral and validate small signals first.'
}

function todayLabel(language: string): string {
  const now = new Date()
  if (language === 'ko') {
    return `${now.getFullYear()}년 ${now.getMonth() + 1}월`
  }
  return `${now
    .toLocaleString('en-US', { month: 'long' })
    .toUpperCase()} ${now.getFullYear()}`
}

export function ResultsStage(props: ResultsStageProps) {
  const {
    readingResult,
    interpretation,
    selectedColor,
    selectedDeckStyle,
    revealedCards,
    expandedCard,
    language,
    translate,
    userTopic,
    questionAnalysis,
    isGuestUser,
    signInUrl,
    handleCardReveal,
    canRevealCard,
    isCardRevealed,
    scrollToDetails,
    toggleCardExpand,
    isSaving,
    isSaved,
    saveMessage,
    handleSaveReading,
    handleReset,
  } = props

  const insight = interpretation
  const questionIntent = useMemo<QuestionIntent>(
    () => getQuestionIntent(userTopic, questionAnalysis),
    [userTopic, questionAnalysis]
  )

  const summary = useMemo(() => {
    if (!insight) return null
    const conclusion = firstSentence(insight.overall_message || '')
    const reasons = (insight.card_insights || [])
      .map((item) => firstSentence(item?.interpretation || ''))
      .filter((line) => line.length > 0)
      .slice(0, 3)
    const actionLine = extractActionLine(insight.guidance, language)
    const likelihoodLevel = inferLikelihoodLevel([conclusion, ...reasons].join(' '))
    const guidanceLines = normalizeGuidanceLines(insight.guidance)

    const overallMessage = (insight.overall_message || '').trim()
    const todayDo = firstSentence(guidanceLines[0] || actionLine)
    const avoidLine = firstSentence(guidanceLines[1] || fallbackAvoidLine(likelihoodLevel, language))
    const attitudeLine = firstSentence(
      guidanceLines[2] || fallbackAttitudeLine(likelihoodLevel, language)
    )

    if (!conclusion && reasons.length === 0 && !actionLine) return null

    return {
      overallMessage,
      conclusion,
      reasons,
      actionLine,
      todayDo,
      avoidLine,
      attitudeLine,
      likelihoodLevel,
      likelihoodBadge: getLikelihoodBadge(likelihoodLevel, language),
      showLikelihood: questionIntent === 'yesNo',
    }
  }, [insight, language, questionIntent])

  const handleCardSelect = (index: number) => {
    if (expandedCard !== index) {
      toggleCardExpand(index)
    }
    scrollToDetails()
  }

  const dateLabel = useMemo(() => todayLabel(language), [language])
  const directAnswer = (questionAnalysis?.direct_answer || '').trim()

  return (
    <div className="relative min-h-[100svh] bg-slate-950 text-slate-200 font-sans pb-32">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl mix-blend-screen" />
      <div className="pointer-events-none absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl mix-blend-screen" />

      <div className="relative z-10 mx-auto max-w-2xl px-5 pt-4">
        {/* Header */}
        <header className="flex items-center justify-between py-3">
          <Link
            href="/tarot"
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
            aria-label={language === 'ko' ? '뒤로' : 'Back'}
          >
            <ArrowLeft className="w-5 h-5 text-slate-300" strokeWidth={1.5} />
          </Link>
          <span className="text-xs font-semibold tracking-widest text-slate-400 uppercase">
            {language === 'ko' ? '타로 리딩' : 'Tarot Reading'}
          </span>
          <button
            type="button"
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
            aria-label="More"
          >
            <MoreHorizontal className="w-5 h-5 text-slate-300" strokeWidth={1.5} />
          </button>
        </header>

        {/* Question + date */}
        <section className="text-center py-8 space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium tracking-widest">
            <Sparkles className="w-3 h-3" />
            {dateLabel}
          </div>
          <h1
            className="text-xl md:text-2xl font-light text-white leading-relaxed"
            style={{ wordBreak: 'keep-all' }}
          >
            {directAnswer || (userTopic ? `“${userTopic}”` : language === 'ko' ? '리딩 결과' : 'Your Reading')}
          </h1>
          {userTopic && directAnswer && (
            <p className="text-sm text-slate-400 break-keep">
              <span className="text-slate-500 font-mono mr-2">Q.</span>
              {userTopic}
            </p>
          )}
          <p className="text-xs text-slate-500">
            {language === 'ko'
              ? `${readingResult.spread.titleKo || readingResult.spread.title} 스프레드`
              : `${readingResult.spread.title} spread`}
          </p>
        </section>

        {/* Guest banner */}
        {isGuestUser && (
          <div className="mb-6 rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4 text-sm text-indigo-100 backdrop-blur-md">
            <p className="leading-relaxed mb-2">
              {language === 'ko'
                ? '이번 무료 1회 리딩은 완료되었습니다. 추가 질문과 다음 리딩은 로그인 후 이어서 볼 수 있습니다.'
                : 'Your free guest reading is complete. Sign in to continue with more questions and another reading.'}
            </p>
            <Link href={signInUrl} className="text-indigo-200 underline hover:text-white">
              {language === 'ko' ? '로그인하고 계속 보기 →' : 'Sign In To Continue →'}
            </Link>
          </div>
        )}

        {/* Cards grid */}
        <section className="mb-8">
          <HorizontalCardsGrid
            readingResult={readingResult}
            selectedColor={selectedColor}
            selectedDeckStyle={selectedDeckStyle}
            language={language}
            revealedCards={revealedCards}
            onCardReveal={handleCardReveal}
            canRevealCard={canRevealCard}
            isCardRevealed={isCardRevealed}
            onCardSelect={handleCardSelect}
            translate={translate}
          />
        </section>

        {/* AI Insight (overall, long-form) */}
        {summary && (
          <section className="mb-8 p-6 md:p-7 rounded-3xl bg-white/5 backdrop-blur-lg border border-white/10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-500 opacity-50" />
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-semibold tracking-widest text-white uppercase">
                AI Insight
              </h3>
              {summary.showLikelihood && (
                <span
                  className={`ml-auto inline-block px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest rounded border ${
                    summary.likelihoodLevel === 'high'
                      ? 'bg-emerald-500/15 text-emerald-200 border-emerald-500/40'
                      : summary.likelihoodLevel === 'low'
                        ? 'bg-rose-500/15 text-rose-200 border-rose-500/40'
                        : 'bg-amber-500/15 text-amber-200 border-amber-500/40'
                  }`}
                >
                  {summary.likelihoodBadge}
                </span>
              )}
            </div>
            <div className="space-y-3 text-sm leading-loose text-slate-300 font-light break-keep">
              {summary.overallMessage && <p>{summary.overallMessage}</p>}
              {summary.reasons.length > 0 && (
                <p>
                  <span className="text-purple-300 font-medium">
                    {language === 'ko' ? '카드 흐름' : 'Card flow'} —{' '}
                  </span>
                  {summary.reasons.join(' ')}
                </p>
              )}
              {summary.actionLine && (
                <p>
                  <span className="text-indigo-300 font-medium">
                    {language === 'ko' ? '행동' : 'Action'} —{' '}
                  </span>
                  {summary.actionLine}
                </p>
              )}
            </div>
          </section>
        )}

        {/* Per-card blocks */}
        <section className="space-y-4 mb-8">
          {readingResult.drawnCards.map((drawnCard: DrawnCard, index: number) => (
            <PerCardBlock
              key={index}
              index={index}
              drawnCard={drawnCard}
              positionTitle={
                (language === 'ko'
                  ? readingResult.spread.positions[index]?.titleKo ||
                    readingResult.spread.positions[index]?.title
                  : readingResult.spread.positions[index]?.title) || `Card ${index + 1}`
              }
              cardInsight={insight?.card_insights?.[index]}
              language={language}
              selectedDeckStyle={selectedDeckStyle}
              translate={translate}
            />
          ))}
        </section>

        {/* Final advice */}
        {summary && (
          <section className="mb-8 p-6 rounded-3xl bg-white/5 backdrop-blur-lg border border-white/10">
            <h3 className="text-sm font-semibold tracking-widest text-white uppercase mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-300" />
              {language === 'ko' ? '마지막 조언' : 'Final Advice'}
            </h3>
            <ul className="space-y-3 text-sm leading-relaxed text-slate-300 font-light break-keep">
              <li>
                <span className="text-emerald-300 font-medium mr-2">
                  {language === 'ko' ? '오늘 할 것' : 'Do today'}
                </span>
                {summary.todayDo}
              </li>
              <li>
                <span className="text-rose-300 font-medium mr-2">
                  {language === 'ko' ? '피할 것' : 'Avoid'}
                </span>
                {summary.avoidLine}
              </li>
              <li>
                <span className="text-amber-300 font-medium mr-2">
                  {language === 'ko' ? '지금 맞는 태도' : 'Best attitude'}
                </span>
                {summary.attitudeLine}
              </li>
            </ul>
          </section>
        )}

        {/* Combinations */}
        {insight?.combinations && insight.combinations.length > 0 && (
          <section className="mb-8 p-6 rounded-3xl bg-white/5 backdrop-blur-lg border border-white/10">
            <CombinationsSection combinations={insight.combinations} translate={translate} />
          </section>
        )}

        {/* Followup chips */}
        {insight?.followup_questions && insight.followup_questions.length > 0 && (
          <section className="mb-8">
            <h3 className="text-xs font-semibold tracking-widest text-slate-400 uppercase mb-3 px-1">
              {language === 'ko' ? '이런 질문도 해보세요' : 'You might also ask'}
            </h3>
            <div className="flex flex-wrap gap-2">
              {insight.followup_questions.slice(0, 6).map((q, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300 hover:bg-white/10 hover:border-white/20 transition-colors break-keep"
                >
                  {q}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Save / interpretation status */}
        {insight?.fallback && (
          <div
            className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-100"
            role="status"
            aria-live="polite"
          >
            <strong className="block mb-1">
              {language === 'ko' ? '임시 해석 모드' : 'Fallback interpretation mode'}
            </strong>
            <p className="leading-relaxed mb-2">
              {language === 'ko'
                ? '현재 결과는 안정 모드 해석입니다. 잠시 후 다시 시도하면 질문 맞춤 AI 해석으로 확장됩니다.'
                : 'You are seeing a safe fallback interpretation. Retry shortly for a richer AI reading.'}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-amber-200 underline hover:text-white"
            >
              {language === 'ko' ? 'AI 해석 다시 시도 →' : 'Retry AI interpretation →'}
            </button>
          </div>
        )}

        {saveMessage && (
          <div
            className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-slate-200 text-center"
            role="status"
            aria-live="polite"
          >
            {saveMessage}
          </div>
        )}

        {/* PersonalityInsight intentionally removed in the premium glass redesign. */}
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 px-5 pb-5">
        <div className="mx-auto max-w-2xl flex items-center justify-between gap-3 rounded-2xl bg-slate-900/70 backdrop-blur-xl border border-white/10 p-3 shadow-[0_0_30px_rgba(0,0,0,0.4)]">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
          >
            {language === 'ko' ? '다시 시작' : 'Start over'}
          </button>
          <button
            type="button"
            onClick={handleSaveReading}
            disabled={isSaved || isSaving}
            className="flex-1 px-5 py-3 rounded-xl bg-white text-slate-900 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-200 transition-all shadow-[0_0_24px_rgba(255,255,255,0.18)] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSaved
              ? language === 'ko'
                ? '✓ 저장됨'
                : '✓ Saved'
              : isSaving
                ? language === 'ko'
                  ? '저장 중...'
                  : 'Saving...'
                : language === 'ko'
                  ? '리포트 저장하기'
                  : 'Save Reading'}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Per-card block: shows position label + card name + reversed flag + keywords +
 * the engine's base meaning AND the AI's contextual interpretation, both long.
 * Replaces the old DetailedCardItem (which re-rendered the card image — we
 * already have those above in HorizontalCardsGrid).
 */
function PerCardBlock({
  index,
  drawnCard,
  positionTitle,
  cardInsight,
  language,
  selectedDeckStyle,
  translate,
}: {
  index: number
  drawnCard: DrawnCard
  positionTitle: string
  cardInsight: InterpretationResult['card_insights'][number] | undefined
  language: string
  selectedDeckStyle: DeckStyle
  translate: (key: string, fallback: string) => string
}) {
  const meaning = drawnCard.isReversed ? drawnCard.card.reversed : drawnCard.card.upright
  const baseMeaning = language === 'ko' ? meaning.meaningKo || meaning.meaning : meaning.meaning
  const keywords =
    (language === 'ko' ? meaning.keywordsKo || meaning.keywords : meaning.keywords) || []
  const aiInterpretation = cardInsight?.interpretation?.trim() || ''
  const hasAI =
    aiInterpretation.length > 0 &&
    aiInterpretation !== meaning.meaning &&
    aiInterpretation !== meaning.meaningKo

  const cardName =
    language === 'ko' ? drawnCard.card.nameKo || drawnCard.card.name : drawnCard.card.name

  return (
    <article className="rounded-3xl bg-white/5 backdrop-blur-lg border border-white/10 p-5 md:p-6 space-y-4">
      <header className="flex items-start gap-4">
        <div className="relative w-14 h-20 shrink-0 rounded-lg overflow-hidden border border-white/10 bg-black/40">
          <Image
            src={getCardImagePath(drawnCard.card.id, selectedDeckStyle)}
            alt={cardName}
            fill
            sizes="56px"
            className="object-cover"
          />
          {drawnCard.isReversed && (
            <span className="absolute bottom-0 inset-x-0 text-[8px] font-bold text-white bg-black/70 text-center py-0.5 tracking-widest uppercase">
              {translate('tarot.results.reversed', 'Reversed')}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[10px] font-bold tracking-widest text-indigo-300 uppercase">
              {positionTitle}
            </span>
            <span className="text-xs text-slate-500 font-mono">#{index + 1}</span>
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                drawnCard.isReversed
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
              }`}
            >
              {drawnCard.isReversed
                ? language === 'ko'
                  ? '역방향'
                  : 'Reversed'
                : language === 'ko'
                  ? '정방향'
                  : 'Upright'}
            </span>
          </div>
          <h3
            className="text-base md:text-lg font-medium text-white"
            style={{ wordBreak: 'keep-all' }}
          >
            {cardName}
          </h3>
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {keywords.slice(0, 6).map((kw, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-slate-400"
                >
                  {kw}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      {baseMeaning && (
        <div className="rounded-2xl bg-black/30 border border-white/5 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-base">🎴</span>
            <span className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">
              {language === 'ko' ? '카드 의미' : 'Card meaning'}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-slate-300 font-light break-keep">
            {baseMeaning}
          </p>
        </div>
      )}

      {hasAI && (
        <div className="rounded-2xl bg-indigo-500/5 border border-indigo-500/20 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            <span className="text-[11px] font-bold tracking-widest text-indigo-200 uppercase">
              {language === 'ko' ? 'AI 해석' : 'AI Insight'}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-slate-200 font-light break-keep">
            {aiInterpretation}
          </p>
          {cardInsight?.spirit_animal && (
            <p className="text-xs text-slate-400 leading-relaxed border-t border-white/5 pt-2 break-keep">
              <span className="text-indigo-300 font-medium">
                {language === 'ko' ? '동물령' : 'Spirit animal'} ·{' '}
              </span>
              <span className="text-slate-300">{cardInsight.spirit_animal.name}</span> —{' '}
              {cardInsight.spirit_animal.message || cardInsight.spirit_animal.meaning}
            </p>
          )}
          {cardInsight?.chakra && (
            <p className="text-xs text-slate-400 leading-relaxed border-t border-white/5 pt-2 break-keep">
              <span className="text-indigo-300 font-medium">
                {language === 'ko' ? '차크라' : 'Chakra'} ·{' '}
              </span>
              <span className="text-slate-300">{cardInsight.chakra.name}</span> —{' '}
              {cardInsight.chakra.guidance}
            </p>
          )}
        </div>
      )}
    </article>
  )
}
