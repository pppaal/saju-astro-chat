'use client'

import React from 'react'
import { ChatMessage } from './ChatMessage'
import { splitReadableText } from './splitReadableText'
import styles from '../../tarot-reading.module.css'

interface OverallMessageChatProps {
  message?: string
  isLoading?: boolean
  language: string
  mode?: 'compact' | 'full'
}

/**
 * Overall reading message from the tarot counselor.
 * compact: show lead + expandable details
 * full: show all sections directly
 */
export function OverallMessageChat({
  message,
  isLoading,
  language,
  mode = 'compact',
}: OverallMessageChatProps) {
  const normalizedMessage = message?.trim() || ''
  const sections = splitReadableText(normalizedMessage)
  const [leadSection, ...detailSections] = sections

  if (!isLoading && !normalizedMessage) {
    return null
  }

  return (
    <ChatMessage
      avatar="🔮"
      name={language === 'ko' ? '질문 기반 종합 해석' : 'Question-based Summary'}
      isLoading={Boolean(isLoading && !normalizedMessage)}
    >
      <div className={styles.chatTextGroup}>
        {leadSection && (
          <p className={`${styles.chatText} ${styles.chatParagraph} ${styles.chatLead}`}>
            {leadSection}
          </p>
        )}

        {detailSections.length > 0 && mode === 'compact' && (
          <details className={styles.layer2InlineDetails}>
            <summary className={styles.layer2InlineSummary}>
              {language === 'ko' ? '원문 해석 펼치기' : 'Expand full interpretation'}
            </summary>
            <div className={styles.chatTextGroup}>
              {detailSections.map((section, idx) => (
                <p
                  key={`${idx}-${section.slice(0, 24)}`}
                  className={`${styles.chatText} ${styles.chatParagraph}`}
                >
                  {section}
                </p>
              ))}
            </div>
          </details>
        )}

        {detailSections.length > 0 && mode === 'full' && (
          <div className={styles.chatTextGroup}>
            {detailSections.map((section, idx) => (
              <p
                key={`${idx}-${section.slice(0, 24)}`}
                className={`${styles.chatText} ${styles.chatParagraph}`}
              >
                {section}
              </p>
            ))}
          </div>
        )}
      </div>
    </ChatMessage>
  )
}
