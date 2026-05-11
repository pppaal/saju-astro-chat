import React from 'react'
import Link from 'next/link'
import type { TarotQuestionAnalysisSnapshot } from '@/lib/tarot/questionFlow'
import styles from '../../../tarot-reading.module.css'
import type { ReadingResponse, InterpretationResult } from '../../../types'
import type { DeckStyle } from '@/lib/tarot/tarot.types'
import type { CardColor } from '../../../constants'
import { HorizontalCardsGrid, DetailedCardsSection, ActionButtons } from '../../index'
import { ResultsHeader } from './ResultsHeader'
import { GuidanceSection } from './GuidanceSection'

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

  const insight = interpretation
  const hasGuidance =
    insight?.guidance &&
    (Array.isArray(insight.guidance)
      ? insight.guidance.length > 0
      : insight.guidance.trim().length > 0)

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
        translate={translate}
      />

      {/* ③ 답변 — LLM 전체 응답 */}
      {insight?.overall_message && (
        <section className={styles.quickAnswerPanel}>
          <div className={styles.quickAnswerTopRow}>
            <div className={styles.quickAnswerHeader}>{language === 'ko' ? '답변' : 'Answer'}</div>
          </div>
          <p className={styles.quickAnswerConclusion}>{insight.overall_message}</p>
        </section>
      )}

      {/* ④ 카드별 정보 — 펼쳐보기 없이 전부 표시 */}
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

      {/* ⑤ 조언 — LLM guidance, 토글 없이 마지막에 인라인 */}
      {hasGuidance && <GuidanceSection guidance={insight!.guidance!} language={language} />}

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
