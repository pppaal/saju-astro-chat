'use client'

import React from 'react'
import ChatBubbleContent from '@/components/chat/ChatBubbleContent'
import type { Message } from './chat-constants'

interface MessageRowProps {
  message: Message
  index: number
  lang: string
  styles: Record<string, string>
}

// 말풍선 내부 콘텐츠는 공통 ChatBubbleContent (Phase 2 리팩토링) — 카드
// 이미지 추출 + markdown 처리는 거기서 단일 출처. 외부 wrapper (row class /
// avatar / bubble container) 는 destiny 디자인을 그대로 유지.
const MessageRow = React.memo(function MessageRow({
  message,
  index,
  lang: _lang,
  styles: s,
}: MessageRowProps) {
  const isAssistant = message.role === 'assistant'
  const rowClass = `${s.messageRow} ${isAssistant ? s.assistantRow : s.userRow}`
  const messageClass = isAssistant ? s.assistantMessage : s.userMessage

  return (
    <div
      key={message.id || index}
      className={rowClass}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {isAssistant && <div className={s.counselorAvatar} />}

      <div className={s.messageBubble}>
        <div className={messageClass}>
          <ChatBubbleContent role={message.role} content={message.content} theme="dark" />
        </div>
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
