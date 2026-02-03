/**
 * SharedMessageRow Component
 *
 * Reusable chat message row with markdown support and feedback buttons
 * Shared across SajuChat, AstrologyChat, and Destiny Chat
 */

'use client'

import React, { memo } from 'react'
import MarkdownMessage from '@/components/ui/MarkdownMessage'
import { useI18n } from '@/i18n/I18nProvider'

export type Message = {
  role: 'system' | 'user' | 'assistant'
  content: string
  id?: string
}

export type FeedbackType = 'up' | 'down' | null

interface SharedMessageRowProps {
  message: Message
  feedback: Record<string, FeedbackType>
  onFeedback: (id: string, type: FeedbackType) => void
  styles: Record<string, string>
}

export const SharedMessageRow = memo(
  ({ message, feedback, onFeedback, styles }: SharedMessageRowProps) => {
    const { t } = useI18n()

    return (
      <div
        key={message.id || message.content.slice(0, 20)}
        className={`${styles.message} ${styles[message.role]}`}
      >
        <div className={styles.messageContent}>
          {message.role === 'assistant' ? (
            <MarkdownMessage content={message.content} />
          ) : (
            message.content
          )}
        </div>
        {message.role === 'assistant' && message.content && (
          <div className={styles.feedbackButtons}>
            <button
              type="button"
              className={`${styles.feedbackBtn} ${feedback[message.id || ''] === 'up' ? styles.active : ''}`}
              onClick={() => onFeedback(message.id || '', 'up')}
              title={t('feedback.good')}
            >
              &#x1F44D;
            </button>
            <button
              type="button"
              className={`${styles.feedbackBtn} ${feedback[message.id || ''] === 'down' ? styles.active : ''}`}
              onClick={() => onFeedback(message.id || '', 'down')}
              title={t('feedback.needsImprovement')}
            >
              &#x1F44E;
            </button>
          </div>
        )}
      </div>
    )
  },
  // Custom comparison function - only re-render if message content or feedback changed
  (prevProps, nextProps) => {
    return (
      prevProps.message.content === nextProps.message.content &&
      prevProps.message.id === nextProps.message.id &&
      prevProps.message.role === nextProps.message.role &&
      prevProps.feedback[prevProps.message.id || ''] ===
        nextProps.feedback[nextProps.message.id || '']
    )
  }
)

SharedMessageRow.displayName = 'SharedMessageRow'
