import React from 'react'
import styles from '../../../tarot-reading.module.css'
import type { ReadingResponse } from '../../../types'
import type { TarotQuestionAnalysisSnapshot } from '@/lib/Tarot/questionFlow'

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
  const directAnswer = questionAnalysis?.direct_answer?.trim()
  const questionSummary = questionAnalysis?.question_summary?.trim()

  return (
    <div className={styles.resultsHeader}>
      <h1 className={styles.resultsTitle}>
        {directAnswer ||
          (language === 'ko' ? '질문에 대한 핵심 답변' : 'Direct Answer to Your Question')}
      </h1>
      <p className={styles.resultsSubtitle}>
        {questionSummary || translate('tarot.results.subtitle', 'Card Interpretation')}
      </p>
      {userTopic && (
        <div className={styles.userTopicDisplay}>
          <span className={styles.topicIcon}>Q.</span>
          <span className={styles.topicText}>{userTopic}</span>
        </div>
      )}
      <p className={styles.resultsSubtitle}>
        {language === 'ko'
          ? `해석 스프레드: ${readingResult.spread.titleKo || readingResult.spread.title}`
          : `Reading spread: ${readingResult.spread.title}`}
      </p>
    </div>
  )
}
