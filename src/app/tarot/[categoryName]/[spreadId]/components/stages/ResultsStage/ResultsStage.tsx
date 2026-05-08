import React, { useState } from 'react'
import Link from 'next/link'
import type { TarotQuestionAnalysisSnapshot } from '@/lib/Tarot/questionFlow'
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
          </div>
          <p className={styles.quickAnswerConclusion}>{insight.overall_message}</p>
        </section>
      )}

      {/* ④ 카드별 간단 설명 — LLM card_insights, 토글 없이 바로 */}
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

      {/* ⑤ 더 자세히 보기 — guidance + combinations + followup (전부 LLM) */}
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

        {insight?.guidance &&
          (Array.isArray(insight.guidance) ? insight.guidance.length > 0 : insight.guidance.trim().length > 0) && (
            <GuidanceSection guidance={insight.guidance} language={language} />
          )}
        {insight?.combinations && insight.combinations.length > 0 && (
          <CombinationsSection combinations={insight.combinations} translate={translate} />
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
