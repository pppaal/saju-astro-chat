'use client'

import React from 'react'
import styles from '../../tarot-reading.module.css'

interface ChatMessageProps {
  avatar: string
  name: string | React.ReactNode
  children: React.ReactNode
  className?: string
  isLoading?: boolean
}

/**
 * Base chat message component with avatar and bubble
 * Used for all counselor/advisor chat messages
 */
export function ChatMessage({ avatar, name, children, className, isLoading }: ChatMessageProps) {
  return (
    <div className={`${styles.counselorChat} ${className || ''}`}>
      <div className={styles.chatMessage}>
        <div className={styles.chatAvatar}>{avatar}</div>
        <div className={styles.chatContent}>
          <div className={styles.chatName}>{name}</div>
          <div className={styles.chatBubble}>
            {isLoading ? (
              <div className={styles.typingIndicator}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            ) : (
              children
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
