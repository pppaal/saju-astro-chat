'use client'

import React from 'react'
import { ChatMessage } from './ChatMessage'
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

  if (!isLoading && !normalizedMessage) {
    return null
  }

  return (
    <ChatMessage
      avatar="🔮"
      name={language === 'ko' ? '질문 기반 종합 해석' : 'Question-based Summary'}
      isLoading={Boolean(isLoading && !normalizedMessage)}
    >
      <p className={styles.chatText}>{normalizedMessage}</p>
    </ChatMessage>
  )
}
