'use client'

import React from 'react'
import MarkdownMessage from '@/components/ui/MarkdownMessage'
import type { Message, FeedbackType } from './chat-constants'
import { repairMojibakeText } from '@/lib/text/mojibake'

interface MessageRowProps {
  message: Message
  index: number
  feedback: Record<string, FeedbackType>
  lang: string
  onFeedback: (id: string, type: FeedbackType) => void
  styles: Record<string, string>
}

const MessageRow = React.memo(function MessageRow({
  message,
  index,
  feedback,
  lang,
  onFeedback,
  styles: s,
}: MessageRowProps) {
  const isAssistant = message.role === 'assistant'
  const isStreaming = Boolean(message.streaming)
  const normalizedContent = repairMojibakeText(message.content || '')
  const rowClass = `${s.messageRow} ${isAssistant ? s.assistantRow : s.userRow}`
  const messageClass = isAssistant ? s.assistantMessage : s.userMessage
  const hasFeedback = isAssistant && !isStreaming && message.content && message.id

  return (
    <div
      key={message.id || index}
      className={rowClass}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {isAssistant && <div className={s.counselorAvatar} />}

      <div className={s.messageBubble}>
        <div className={messageClass}>
          {isAssistant ? (
            <MarkdownMessage content={normalizedContent} />
          ) : (
            normalizedContent
          )}
        </div>

        {hasFeedback && (
          <div className={s.feedbackButtons}>
            <button
              type="button"
              className={`${s.feedbackBtn} ${feedback[message.id!] === 'up' ? s.feedbackActive : ''}`}
              onClick={() => onFeedback(message.id!, 'up')}
              title={lang === 'ko' ? '도움이 됐어요' : 'Helpful'}
              aria-label={lang === 'ko' ? '도움이 됐어요' : 'Helpful'}
            >
              {'\u{1F44D}'}
            </button>
            <button
              type="button"
              className={`${s.feedbackBtn} ${feedback[message.id!] === 'down' ? s.feedbackActive : ''}`}
              onClick={() => onFeedback(message.id!, 'down')}
              title={lang === 'ko' ? '아쉬워요' : 'Not helpful'}
              aria-label={lang === 'ko' ? '아쉬워요' : 'Not helpful'}
            >
              {'\u{1F44E}'}
            </button>
          </div>
        )}
      </div>

      {!isAssistant && (
        <div className={s.avatar}>
          <span className={s.avatarIcon}>{'\u{1F464}'}</span>
        </div>
      )}
    </div>
  )
})

export default MessageRow
export type { MessageRowProps }
