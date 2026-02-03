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
  if (!isLoading && !message) {
    return null
  }

  return (
    <ChatMessage
      avatar="🔮"
      name={language === 'ko' ? '타로 상담사' : 'Tarot Counselor'}
      isLoading={isLoading}
    >
      <p className={styles.chatText}>{message}</p>
    </ChatMessage>
  )
}
