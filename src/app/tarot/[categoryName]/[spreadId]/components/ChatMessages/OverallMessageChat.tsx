'use client'

import React from 'react'
import { ChatMessage } from './ChatMessage'
import { splitReadableText } from './splitReadableText'
import styles from '../../tarot-reading.module.css'

interface OverallMessageChatProps {
  message?: string
  isLoading?: boolean
  language: string
}

/**
 * Overall reading message from the tarot counselor
 */
export function OverallMessageChat({ message, isLoading, language }: OverallMessageChatProps) {
  const normalizedMessage = message?.trim() || ''
  const sections = splitReadableText(normalizedMessage)

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
        {sections.map((section, idx) => (
          <p
            key={`${idx}-${section.slice(0, 24)}`}
            className={`${styles.chatText} ${styles.chatParagraph} ${idx === 0 ? styles.chatLead : ''}`}
          >
            {section}
          </p>
        ))}
      </div>
    </ChatMessage>
  )
}
