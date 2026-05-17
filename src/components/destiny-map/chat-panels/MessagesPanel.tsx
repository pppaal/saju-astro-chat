'use client'

import React from 'react'
import type { Message, FeedbackType } from '../chat-constants'
import type { Copy } from '../chat-i18n'
import MessageRow from '../MessageRow'
import { repairMojibakeText } from '@/lib/text/mojibake'

interface MessagesPanelProps {
  visibleMessages: Message[]
  loading: boolean
  retryCount: number
  notice: string | null
  showSuggestions: boolean
  suggestedQs: string[]
  followUpQuestions: string[]
  feedback: Record<string, FeedbackType>
  effectiveLang: 'ko' | 'en'
  tr: Copy
  messagesEndRef: React.RefObject<HTMLDivElement | null>
  onSuggestion: (question: string) => void
  onFeedback: (msgId: string, type: FeedbackType) => Promise<void>
  onFollowUp: (question: string) => void
  styles: Record<string, string>
}

export const MessagesPanel = React.memo(function MessagesPanel({
  visibleMessages,
  loading,
  retryCount,
  notice,
  showSuggestions: _showSuggestions,
  suggestedQs: _suggestedQs,
  followUpQuestions,
  feedback,
  effectiveLang,
  tr,
  messagesEndRef,
  onSuggestion: _onSuggestion,
  onFeedback,
  onFollowUp,
  styles,
}: MessagesPanelProps) {
  return (
    <div className={styles.messagesPanel} role="log" aria-live="polite" aria-label="Chat messages">
      {notice && (
        <div className={styles.noticeBar}>
          <span className={styles.noticeIcon}>&#x26A0;&#xFE0F;</span>
          <span>{repairMojibakeText(notice)}</span>
        </div>
      )}

      {visibleMessages.length === 0 && !loading && (
        <div className={styles.emptyState}>
          {/* Small spark glyph — Claude.ai uses an orange asterisk-burst.
              We use ✦ in the same accent color for the same role: a
              minimal hero ornament without the kitschy crystal-ball that
              made the empty state read as a fortune-app placeholder. */}
          <div className={styles.emptyIcon} aria-hidden="true">
            &#x2734;
          </div>
          <p className={styles.emptyText}>{tr.empty}</p>
          {/* Suggestion chips removed per user request — "나는 어떤
              사람이에요? ✨" / "올해 무슨 일이 생길까요?" / "행운의
              숫자/색깔 알려줘" felt like a fortune-app catalog when
              the rest of the UI moved to a chat-first layout. */}
        </div>
      )}

      {visibleMessages.map((m, i) => (
        <MessageRow
          key={m.id || i}
          message={m}
          index={i}
          feedback={feedback}
          lang={effectiveLang}
          onFeedback={onFeedback}
          styles={styles}
        />
      ))}

      {loading && (
        <div className={`${styles.messageRow} ${styles.assistantRow}`}>
          <div className={`${styles.counselorAvatar} ${styles.counselorThinking}`} />
          <div className={styles.messageBubble}>
            <div className={styles.thinkingMessage}>
              <div className={styles.typingDots}>
                <span className={styles.typingDot} />
                <span className={styles.typingDot} />
                <span className={styles.typingDot} />
              </div>
              <span className={styles.thinkingText}>
                {retryCount > 0 ? `${tr.thinking} (Retry ${retryCount}/3)` : tr.thinking}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Follow-up Questions */}
      {!loading && followUpQuestions.length > 0 && visibleMessages.length > 0 && (
        <div className={styles.followUpContainer}>
          <span className={styles.followUpLabel}>
            {effectiveLang === 'ko'
              ? '\uC774\uC5B4\uC11C \uBB3C\uC5B4\uBCF4\uAE30'
              : 'Continue asking'}
          </span>
          <div className={styles.followUpButtons}>
            {followUpQuestions.map((q, idx) => (
              <button
                key={idx}
                type="button"
                className={styles.followUpChip}
                onClick={() => onFollowUp(q)}
              >
                <span className={styles.followUpIcon}>&#x1F4AC;</span>
                {repairMojibakeText(q)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  )
})
