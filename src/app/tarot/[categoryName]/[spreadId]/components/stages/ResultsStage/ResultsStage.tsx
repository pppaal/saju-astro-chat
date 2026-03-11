import React, { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import styles from '../../../tarot-reading.module.css'
import type { ReadingResponse, InterpretationResult } from '../../../types'
import type { DeckStyle } from '@/lib/Tarot/tarot.types'
import type { CardColor } from '../../../constants'
import {
  HorizontalCardsGrid,
  DetailedCardsSection,
  OverallMessageChat,
  CardInterpretationChat,
  ActionButtons,
} from '../../index'
import { ResultsHeader } from './ResultsHeader'
import { CombinationsSection } from './CombinationsSection'
import { FollowupSection } from './FollowupSection'

const PersonalityInsight = dynamic(() => import('@/components/personality/PersonalityInsight'), {
  ssr: false,
})

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
    return guidance
      .flatMap((item) => [item?.title || '', item?.detail || ''])
      .map((line) => line.trim())
      .filter(Boolean)
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
  const lowPatterns = [
    /낮/,
    /어려/,
    /힘들/,
    /지연/,
    /보류/,
    /불리/,
    /막히/,
    /경계/,
    /부정/,
    /risk/,
    /unlikely/,
    /difficult/,
    /delay/,
  ]
  const highPatterns = [
    /높/,
    /가능/,
    /유리/,
    /긍정/,
    /성사/,
    /순조/,
    /호전/,
    /good chance/,
    /likely/,
    /favorable/,
    /strong signal/,
  ]

  if (lowPatterns.some((pattern) => pattern.test(normalized))) return 'low'
  if (highPatterns.some((pattern) => pattern.test(normalized))) return 'high'
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

export function ResultsStage(props: ResultsStageProps) {
  const {
    readingResult,
    interpretation,
    selectedColor,
    selectedDeckStyle,
    revealedCards,
    expandedCard,
    detailedSectionRef,
    language,
    translate,
    userTopic,
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
  const hasOverallMessage = Boolean(insight?.overall_message?.trim())
  const hasCardInterpretations = Boolean(
    insight?.card_insights?.some(
      (entry) => typeof entry?.interpretation === 'string' && entry.interpretation.trim().length > 0
    )
  )
  const showInterpretationLoading =
    Boolean(insight?.fallback) && !hasOverallMessage && !hasCardInterpretations
  const [showLayer2Cards, setShowLayer2Cards] = useState(false)

  const quickSummary = useMemo(() => {
    if (!insight) return null

    const conclusion = firstSentence(insight.overall_message || '')
    const reasons = (insight.card_insights || [])
      .map((item) => firstSentence(item?.interpretation || ''))
      .filter((line) => line.length > 0)
      .slice(0, 3)
    const actionLine = extractActionLine(insight.guidance, language)
    const likelihoodLevel = inferLikelihoodLevel([conclusion, ...reasons].join(' '))
    const guidanceLines = normalizeGuidanceLines(insight.guidance)

    const reasonOneLine =
      reasons[0] ||
      (language === 'ko'
        ? '카드 흐름상 성급한 확정 대신 상황 확인이 우선입니다.'
        : 'The cards suggest checking context before forcing certainty.')

    const todayDo = firstSentence(guidanceLines[0] || actionLine)
    const avoidLine = firstSentence(
      guidanceLines[1] || fallbackAvoidLine(likelihoodLevel, language)
    )
    const attitudeLine = firstSentence(
      guidanceLines[2] || fallbackAttitudeLine(likelihoodLevel, language)
    )

    if (!conclusion && reasons.length === 0 && !actionLine) return null

    return {
      directAnswer:
        conclusion ||
        (language === 'ko'
          ? '카드 흐름상 지금은 서두르기보다 조건을 점검하는 단계입니다.'
          : 'Card flow suggests validating conditions before moving quickly.'),
      likelihoodLevel,
      likelihoodBadge: getLikelihoodBadge(likelihoodLevel, language),
      reasonOneLine,
      reasons:
        reasons.length > 0
          ? reasons
          : [
              language === 'ko'
                ? '현재 카드는 성급한 결정보다 기준 정리를 우선하라고 말합니다.'
                : 'The cards suggest prioritizing criteria clarity over rushing.',
            ],
      actionOneLine:
        actionLine ||
        (language === 'ko'
          ? '오늘 실행할 1단계를 정하고 바로 시작하세요.'
          : 'Pick one concrete step and execute it today.'),
      todayDo:
        todayDo ||
        (language === 'ko'
          ? '가볍게 확인 가능한 1단계 행동부터 시작하세요.'
          : 'Start with one light validation action.'),
      avoidLine,
      attitudeLine,
    }
  }, [insight, language])

  return (
    <div className={styles.resultsContainer}>
      <ResultsHeader
        readingResult={readingResult}
        userTopic={userTopic}
        language={language}
        translate={translate}
      />

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

      {revealedCards.length === readingResult.drawnCards.length && (
        <button
          className={styles.scrollToDetailsButton}
          onClick={() => {
            setShowLayer2Cards(true)
            scrollToDetails()
          }}
        >
          {translate('tarot.results.viewDetails', '원문 해석 보기')} ↓
        </button>
      )}

      {quickSummary && (
        <section className={styles.quickAnswerPanel}>
          <div className={styles.quickAnswerTopRow}>
            <div className={styles.quickAnswerHeader}>
              {language === 'ko' ? '질문 직접답' : 'Direct Answer'}
            </div>
            <span
              className={`${styles.likelihoodBadge} ${
                quickSummary.likelihoodLevel === 'high'
                  ? styles.likelihoodHigh
                  : quickSummary.likelihoodLevel === 'low'
                    ? styles.likelihoodLow
                    : styles.likelihoodMedium
              }`}
            >
              {quickSummary.likelihoodBadge}
            </span>
          </div>
          <p className={styles.quickAnswerConclusion}>
            <strong>{language === 'ko' ? '답변:' : 'Answer:'}</strong> {quickSummary.directAnswer}
          </p>
          <p className={styles.quickAnswerReason}>
            <strong>{language === 'ko' ? '한 줄 이유:' : 'One-line reason:'}</strong>{' '}
            {quickSummary.reasonOneLine}
          </p>
          <p className={styles.quickAnswerAction}>
            <strong>{language === 'ko' ? '행동 한 줄:' : 'One-line action:'}</strong>{' '}
            {quickSummary.actionOneLine}
          </p>
        </section>
      )}

      {quickSummary && (
        <section className={styles.quickReasonPanel}>
          <h3 className={styles.quickReasonTitle}>
            {language === 'ko' ? '왜 그렇게 보이는지 (근거 2~3줄)' : 'Why This Reading (2-3 lines)'}
          </h3>
          <div className={styles.quickAnswerReasons}>
            {quickSummary.reasons.map((reason, idx) => (
              <p key={`reason-${idx}`} className={styles.quickAnswerReason}>
                {language === 'ko' ? `이유 ${idx + 1}.` : `Reason ${idx + 1}.`} {reason}
              </p>
            ))}
          </div>
        </section>
      )}

      {insight?.fallback ? (
        <div className={styles.interpretationFallbackNotice} role="status" aria-live="polite">
          <div className={styles.interpretationNoticeHeader}>
            <strong>{language === 'ko' ? '임시 해석 모드' : 'Fallback interpretation mode'}</strong>
            <button
              type="button"
              className={styles.interpretationRetryButton}
              onClick={() => window.location.reload()}
            >
              {language === 'ko' ? 'AI 해석 다시 시도' : 'Retry AI interpretation'}
            </button>
          </div>
          <p>
            {language === 'ko'
              ? '현재 결과는 안정 모드 해석입니다. 잠시 후 다시 시도하면 질문 맞춤 AI 해석으로 확장됩니다.'
              : 'You are seeing a safe fallback interpretation. Retry shortly for a richer AI reading.'}
          </p>
        </div>
      ) : (
        <div className={styles.interpretationSuccessNotice}>
          {language === 'ko'
            ? '✅ 질문 맞춤 AI 해석이 정상 생성되었습니다.'
            : '✅ AI interpretation generated successfully.'}
        </div>
      )}

      <div className={styles.resultSectionTag}>
        {language === 'ko' ? '카드별 짧은 해석' : 'Card-by-Card Short Reading'}
      </div>
      <CardInterpretationChat
        readingResult={readingResult}
        interpretation={interpretation}
        language={language}
        revealedCards={revealedCards}
      />

      {quickSummary && (
        <section className={styles.actionGuidePanel}>
          <h3 className={styles.actionGuideTitle}>
            {language === 'ko' ? '실천 조언' : 'Practical Guidance'}
          </h3>
          <p className={styles.actionGuideItem}>
            <strong>{language === 'ko' ? '오늘 하면 좋은 것:' : 'Do today:'}</strong>{' '}
            {quickSummary.todayDo}
          </p>
          <p className={styles.actionGuideItem}>
            <strong>{language === 'ko' ? '피해야 할 것:' : 'Avoid:'}</strong>{' '}
            {quickSummary.avoidLine}
          </p>
          <p className={styles.actionGuideItem}>
            <strong>{language === 'ko' ? '지금 맞는 태도:' : 'Best attitude now:'}</strong>{' '}
            {quickSummary.attitudeLine}
          </p>
        </section>
      )}

      <details
        className={styles.layer2Details}
        open={showLayer2Cards}
        onToggle={(event) => {
          setShowLayer2Cards((event.currentTarget as HTMLDetailsElement).open)
        }}
      >
        <summary className={styles.layer2Summary}>
          {language === 'ko'
            ? '원문 해석 펼치기 (카드/정역방향/상세)'
            : 'Expand Raw Interpretation (Cards / Upright-Reversed / Details)'}
        </summary>
        <div className={styles.resultSectionTag}>
          {language === 'ko' ? '원문 종합 해석' : 'Raw Overall Interpretation'}
        </div>
        <OverallMessageChat
          message={insight?.overall_message}
          isLoading={showInterpretationLoading}
          language={language}
          mode="full"
        />
        <div className={styles.resultSectionTag}>
          {language === 'ko' ? '카드 원문 해석 (기본/상세)' : 'Raw Card Meanings (Base / Detailed)'}
        </div>
        <DetailedCardsSection
          readingResult={readingResult}
          interpretation={interpretation}
          language={language}
          selectedDeckStyle={selectedDeckStyle}
          revealedCards={revealedCards}
          expandedCard={expandedCard}
          onToggleExpand={toggleCardExpand}
          detailedSectionRef={detailedSectionRef}
          translate={translate}
        />
      </details>

      {insight?.combinations && insight.combinations.length > 0 && (
        <CombinationsSection combinations={insight.combinations} translate={translate} />
      )}

      {insight?.followup_questions && insight.followup_questions.length > 0 && (
        <FollowupSection questions={insight.followup_questions} translate={translate} />
      )}

      <ErrorBoundary>
        <PersonalityInsight lang={language} compact className={styles.personalityInsight} />
      </ErrorBoundary>

      {saveMessage && (
        <div className={styles.saveMessage} role="status" aria-live="polite">
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
  )
}
