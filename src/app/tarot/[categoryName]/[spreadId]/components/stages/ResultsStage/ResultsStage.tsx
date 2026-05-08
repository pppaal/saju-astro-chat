import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  getQuestionIntent,
  type TarotQuestionAnalysisSnapshot,
} from '@/lib/Tarot/questionFlow'
import styles from '../../../tarot-reading.module.css'
import type { ReadingResponse, InterpretationResult } from '../../../types'
import type { DeckStyle } from '@/lib/Tarot/tarot.types'
import type { CardColor } from '../../../constants'
import {
  HorizontalCardsGrid,
  DetailedCardsSection,
  ActionButtons,
} from '../../index'
import { ResultsHeader } from './ResultsHeader'
import { CombinationsSection } from './CombinationsSection'
import { GuidanceSection } from './GuidanceSection'
import { FollowupSection } from './FollowupSection'
import SpreadSynthesisCard from '../../foundation/SpreadSynthesisCard'
import ComboPatternsCard from '../../foundation/ComboPatternsCard'
import TarotTimingCard from '../../foundation/TarotTimingCard'
import { synthesizeTarotSpread } from '@/lib/Tarot/foundation/synthesis'
import { detectComboPatterns } from '@/lib/Tarot/foundation/combinations'
import { buildTarotTiming } from '@/lib/Tarot/foundation/timing'

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
    return guidance
      .map((item) => (item?.detail || item?.title || '').trim())
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
  const [showLayer2Cards, setShowLayer2Cards] = useState(false)
  const questionIntent = useMemo<QuestionIntent>(
    () => getQuestionIntent(userTopic, questionAnalysis),
    [userTopic, questionAnalysis]
  )

  const tarotSynthesis = useMemo(
    () => (readingResult.drawnCards.length > 0 ? synthesizeTarotSpread(readingResult.drawnCards) : null),
    [readingResult.drawnCards]
  )
  const comboHits = useMemo(
    () => (readingResult.drawnCards.length > 0 ? detectComboPatterns(readingResult.drawnCards) : []),
    [readingResult.drawnCards]
  )
  const tarotTiming = useMemo(
    () => buildTarotTiming(readingResult.drawnCards),
    [readingResult.drawnCards]
  )

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
      answerHeader:
        questionIntent === 'flow'
          ? language === 'ko'
            ? '흐름 요약'
            : 'Flow Summary'
          : questionIntent === 'yesNo'
            ? language === 'ko'
              ? '질문 직접답'
              : 'Direct Answer'
            : language === 'ko'
              ? '핵심 요약'
              : 'Key Summary',
      directAnswer:
        conclusion ||
        firstSentence(questionAnalysis?.direct_answer || '') ||
        (language === 'ko'
          ? '카드 흐름상 지금은 서두르기보다 조건을 점검하는 단계입니다.'
          : 'Card flow suggests validating conditions before moving quickly.'),
      showLikelihood: questionIntent === 'yesNo',
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
  }, [insight, language, questionIntent, questionAnalysis?.direct_answer])

  const handleCardSelect = (index: number) => {
    setShowLayer2Cards(true)
    if (expandedCard !== index) {
      toggleCardExpand(index)
    }
    scrollToDetails()
  }

  return (
    <div className={styles.resultsContainer}>
      {/* ① 질문 */}
      <ResultsHeader
        readingResult={readingResult}
        userTopic={userTopic}
        language={language}
        translate={translate}
        questionAnalysis={questionAnalysis}
      />

      {isGuestUser && (
        <section className={styles.guestResultsBanner}>
          <p className={styles.guestResultsText}>
            {language === 'ko'
              ? '이번 무료 1회 리딩은 완료되었습니다. 추가 질문과 다음 리딩은 로그인 후 이어서 볼 수 있습니다.'
              : 'Your free guest reading is complete. Sign in to continue with more questions and another reading.'}
          </p>
          <Link href={signInUrl} className={styles.guestResultsLink}>
            {language === 'ko' ? '로그인하고 계속 보기' : 'Sign In To Continue'}
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
        onCardSelect={handleCardSelect}
        translate={translate}
      />

      {/* ③ 답변 — LLM 전체 응답 */}
      {insight?.overall_message && (
        <section className={styles.quickAnswerPanel}>
          <div className={styles.quickAnswerTopRow}>
            <div className={styles.quickAnswerHeader}>
              {language === 'ko' ? '답변' : 'Answer'}
            </div>
            {quickSummary?.showLikelihood && (
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
            )}
          </div>
          <p className={styles.quickAnswerConclusion}>{insight.overall_message}</p>
        </section>
      )}

      {/* ④ 카드별 간단 설명 — 토글 없이 바로 표시 */}
      <DetailedCardsSection
        readingResult={readingResult}
        interpretation={interpretation}
        language={language}
        selectedDeckStyle={selectedDeckStyle}
        revealedCards={revealedCards}
        expandedCard={expandedCard}
        onToggleExpand={toggleCardExpand}
        translate={translate}
        mode="summary"
      />

      {insight?.fallback && (
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
        </div>
      )}

      {/* ⑤ 더 자세히 보기 — 카드 풀텍스트 + 행동가이드 + foundation + AI 보조 */}
      <details
        className={styles.layer2Details}
        open={showLayer2Cards}
        onToggle={(event) => {
          setShowLayer2Cards((event.currentTarget as HTMLDetailsElement).open)
        }}
      >
        <summary className={styles.layer2Summary}>
          {language === 'ko' ? '더 자세히 보기' : 'See Detailed Analysis'}
        </summary>

        {/* 행동 가이드 */}
        {quickSummary && (
          <section className={styles.actionGuidePanel}>
            <h3 className={styles.actionGuideTitle}>
              {language === 'ko' ? '실천 조언' : 'Practical Guidance'}
            </h3>
            <p className={styles.actionGuideItem}>
              <strong>{language === 'ko' ? '오늘 할 것:' : 'Do today:'}</strong> {quickSummary.todayDo}
            </p>
            <p className={styles.actionGuideItem}>
              <strong>{language === 'ko' ? '피할 것:' : 'Avoid:'}</strong> {quickSummary.avoidLine}
            </p>
            <p className={styles.actionGuideItem}>
              <strong>{language === 'ko' ? '태도:' : 'Attitude:'}</strong> {quickSummary.attitudeLine}
            </p>
          </section>
        )}

        {/* 카드별 풀텍스트 */}
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

        {/* 카드 흐름 진단 (foundation) */}
        {tarotSynthesis && <SpreadSynthesisCard data={tarotSynthesis} />}
        {comboHits.length > 0 && <ComboPatternsCard hits={comboHits} />}
        {tarotTiming && <TarotTimingCard data={tarotTiming} />}

        {/* AI 해석 보조 */}
        {insight?.combinations && insight.combinations.length > 0 && (
          <CombinationsSection combinations={insight.combinations} translate={translate} />
        )}
        {insight?.guidance &&
          (Array.isArray(insight.guidance) ? insight.guidance.length > 0 : insight.guidance.trim().length > 0) && (
            <GuidanceSection guidance={insight.guidance} language={language} />
          )}
        {insight?.followup_questions && insight.followup_questions.length > 0 && (
          <FollowupSection questions={insight.followup_questions} translate={translate} />
        )}
      </details>

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
