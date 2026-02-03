import React from 'react'
import styles from '../../../tarot-reading.module.css'
import type { ReadingResponse } from '../../../types'

interface ResultsHeaderProps {
  readingResult: ReadingResponse
  userTopic: string
  language: string
  translate: (key: string, fallback: string) => string
}

export function ResultsHeader({
  readingResult,
  userTopic,
  language,
  translate,
}: ResultsHeaderProps) {
  return (
    <div className={styles.resultsHeader}>
      <h1 className={styles.resultsTitle}>
        {language === 'ko'
          ? readingResult.spread.titleKo || readingResult.spread.title
          : readingResult.spread.title}
      </h1>
      <p className={styles.resultsSubtitle}>
        {translate('tarot.results.subtitle', 'Card Interpretation')}
      </p>
      {userTopic && (
        <div className={styles.userTopicDisplay}>
          <span className={styles.topicIcon}>Q.</span>
          <span className={styles.topicText}>{userTopic}</span>
        </div>
      )}
    </div>
  )
}
