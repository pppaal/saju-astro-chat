'use client'

import React from 'react'
import type { Message } from '../chat-constants'
import type { Copy } from '../chat-i18n'
import MessageRow from '../MessageRow'
import { repairMojibakeText } from '@/lib/text/mojibake'
import { pickGreeting } from '@/lib/counselor/greetingTemplates'
import HexDPLogo from '@/components/branding/HexDPLogo'

interface MessagesPanelProps {
  visibleMessages: Message[]
  loading: boolean
  retryCount: number
  notice: string | null
  followUpQuestions: string[]
  effectiveLang: 'ko' | 'en'
  tr: Copy
  messagesEndRef: React.RefObject<HTMLDivElement | null>
  onFollowUp: (question: string) => void
  styles: Record<string, string>
  /** 빈 채팅 hero 인사 개인화용. 없으면 generic 인사로 폴백. */
  userName?: string
}

export const MessagesPanel = React.memo(function MessagesPanel({
  visibleMessages,
  loading,
  retryCount,
  notice,
  followUpQuestions,
  effectiveLang,
  tr,
  messagesEndRef,
  onFollowUp,
  styles,
  userName,
}: MessagesPanelProps) {
  // 시간대 + (있으면) 이름 기반으로 풀에서 한 문구 픽. 같은 방문 안에선 안정,
  // 새 방문/언어/이름 변경 시 다시 픽. tr.empty 는 어떤 이유로 풀이 비었을
  // 때만 폴백.
  const heroGreeting = React.useMemo(
    () => pickGreeting({ lang: effectiveLang, name: userName }) || tr.empty,
    [effectiveLang, userName, tr.empty]
  )
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
          <div className={styles.emptyIcon} aria-hidden="true">
            <HexDPLogo size={64} />
          </div>
          <p className={styles.emptyText}>{heroGreeting}</p>
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
          lang={effectiveLang}
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
