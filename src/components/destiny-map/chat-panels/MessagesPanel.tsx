'use client'

import React from 'react'
import type { Message } from '../chat-constants'
import type { Copy } from '../chat-i18n'
import MessageRow from '../MessageRow'
import { repairMojibakeText } from '@/lib/text/mojibake'
import { pickGreeting } from '@/lib/counselor/greetingTemplates'
import HexDPLogo from '@/components/branding/HexDPLogo'
import { ToolHint } from '@/components/chat/ToolHint'
import { FollowUpChips } from '@/components/chat/FollowUpChips'

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
  /** 응답 직후 보이는 "🃏 카드 한 장 더 뽑기" 액션 — 한 대화당 한 번. */
  onOpenClarifier?: () => void
  clarifierUsed?: boolean
  /** 커스텀 empty state — compat 같이 다른 hero (💕 + 두 사람) 가 필요할 때.
   *  미지정 시 destiny 기본 (HexDPLogo + pickGreeting). */
  customEmptyState?: React.ReactNode
  /** 입력창 도구 (파일/타로/차트) 안내 힌트 노출 여부. 호출자가 user 턴 수와
   *  localStorage dismiss 상태 기준으로 결정해 넘겨준다. */
  showToolHint?: boolean
  onDismissToolHint?: () => void
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
  onOpenClarifier,
  clarifierUsed,
  customEmptyState,
  showToolHint,
  onDismissToolHint,
}: MessagesPanelProps) {
  const lastMessage =
    visibleMessages.length > 0 ? visibleMessages[visibleMessages.length - 1] : null
  const lastMessageIsAssistant = lastMessage?.role === 'assistant'
  // 마지막 메시지가 타로 결과(🃏 ...) 일 때만 "한 장 더 뽑기" 노출. 일반 채팅
  // 응답 뒤엔 안 보임 (사용자 요청 — 위치 어색했음).
  const lastMessageIsTarotResult =
    lastMessageIsAssistant && (lastMessage?.content || '').trimStart().startsWith('🃏')
  const showClarifierAction =
    !loading && lastMessageIsTarotResult && !clarifierUsed && typeof onOpenClarifier === 'function'
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

      {visibleMessages.length === 0 &&
        !loading &&
        (customEmptyState ? (
          <>{customEmptyState}</>
        ) : (
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
        ))}

      {visibleMessages.map((m, i) => (
        <MessageRow key={m.id || i} message={m} index={i} lang={effectiveLang} styles={styles} />
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

      {/* Follow-up Questions \u2014 \uACF5\uC6A9 FollowUpChips \uCEF4\uD3EC\uB10C\uD2B8. */}
      {!loading && visibleMessages.length > 0 && (
        <FollowUpChips
          questions={followUpQuestions}
          lang={effectiveLang}
          onPick={onFollowUp}
          styles={styles as never}
        />
      )}

      {showClarifierAction && (
        <div className={styles.postAnswerActions}>
          <button type="button" className={styles.clarifierActionBtn} onClick={onOpenClarifier}>
            <span className={styles.clarifierActionIcon} aria-hidden="true">
              {'\u{1F0CF}'}
            </span>
            {effectiveLang === 'ko'
              ? '\uCE74\uB4DC \uD55C \uC7A5 \uB354 \uBF51\uAE30'
              : 'Draw one more card'}
          </button>
        </div>
      )}

      {/* 도구 안내 — Chat.tsx 가 user 턴 수 + localStorage 기준 판단 후 prop 으로 보냄. */}
      {showToolHint && onDismissToolHint && (
        <ToolHint lang={effectiveLang} variant="destiny" onDismiss={onDismissToolHint} />
      )}

      <div ref={messagesEndRef} />
    </div>
  )
})
