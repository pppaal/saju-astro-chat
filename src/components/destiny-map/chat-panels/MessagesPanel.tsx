'use client'

import React from 'react'
import type { Message, FeedbackType } from '../chat-constants'
import type { Copy } from '../chat-i18n'
import MessageRow from '../MessageRow'

interface MessagesPanelProps {
  visibleMessages: Message[]
  loading: boolean
  retryCount: number
  notice: string | null
  showSuggestions: boolean
  suggestedQs: string[]
  followUpQuestions: string[]
  showTarotPrompt: boolean
  feedback: Record<string, FeedbackType>
  effectiveLang: 'ko' | 'en'
  tr: Copy
  messagesEndRef: React.RefObject<HTMLDivElement | null>
  onSuggestion: (question: string) => void
  onFeedback: (msgId: string, type: FeedbackType) => Promise<void>
  onFollowUp: (question: string) => void
  onGoToTarot: () => void
  styles: Record<string, string>
}

export const MessagesPanel = React.memo(function MessagesPanel({
  visibleMessages,
  loading,
  retryCount,
  notice,
  showSuggestions,
  suggestedQs,
  followUpQuestions,
  showTarotPrompt,
  feedback,
  effectiveLang,
  tr,
  messagesEndRef,
  onSuggestion,
  onFeedback,
  onFollowUp,
  onGoToTarot,
  styles,
}: MessagesPanelProps) {
  return (
    <div className={styles.messagesPanel} role="log" aria-live="polite" aria-label="Chat messages">
      {notice && (
        <div className={styles.noticeBar}>
          <span className={styles.noticeIcon}>&#x26A0;&#xFE0F;</span>
          <span>{notice}</span>
        </div>
      )}

      {visibleMessages.length === 0 && !loading && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>&#x1F52E;</div>
          <p className={styles.emptyText}>{tr.empty}</p>

          {showSuggestions && (
            <div className={styles.suggestionsContainer}>
              {suggestedQs.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={styles.suggestionChip}
                  onClick={() => onSuggestion(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          )}
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
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tarot Transition Card */}
      {showTarotPrompt && !loading && (
        <div className={styles.tarotPromptCard}>
          <div className={styles.tarotPromptIcon}>&#x1F0CF;</div>
          <div className={styles.tarotPromptContent}>
            <h4 className={styles.tarotPromptTitle}>{tr.tarotPrompt}</h4>
            <p className={styles.tarotPromptDesc}>{tr.tarotDesc}</p>
          </div>
          <button type="button" onClick={onGoToTarot} className={styles.tarotPromptButton}>
            <span>&#x2728;</span>
            <span>{tr.tarotButton}</span>
          </button>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  )
})
