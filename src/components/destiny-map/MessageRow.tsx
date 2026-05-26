'use client'

import React from 'react'
import MarkdownMessage from '@/components/ui/MarkdownMessage'
import type { Message } from './chat-constants'
import { repairMojibakeText } from '@/lib/text/mojibake'
import { stripReportMarkdown } from '@/lib/text/stripReportMarkdown'

interface MessageRowProps {
  message: Message
  index: number
  lang: string
  styles: Record<string, string>
}

const MessageRow = React.memo(function MessageRow({
  message,
  index,
  lang: _lang,
  styles: s,
}: MessageRowProps) {
  const isAssistant = message.role === 'assistant'
  const repaired = repairMojibakeText(message.content || '')
  // Assistant messages: strip report-style markdown so the bubble reads
  // like a chat reply. User messages: pass through unchanged.
  const normalizedContent = isAssistant ? stripReportMarkdown(repaired) : repaired
  // 사용자 메시지에 markdown 이 포함된 경우 (예: 🃏 클래리파이어 카드 — 이미지
  // 마크다운 + 굵은 카드명) 도 렌더링되도록. 일반 평문 입력은 markdown 토큰이
  // 거의 없어 시각 영향 없음. ReactMarkdown 은 HTML 을 통과시키지 않으므로
  // XSS 위험은 없음.
  const userLooksLikeMarkdown =
    /!\[[^\]]*\]\([^)]+\)|\*\*[^*]+\*\*|^#{1,3}\s|\n[*-]\s/.test(normalizedContent)
  const renderAsMarkdown = isAssistant || userLooksLikeMarkdown
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
          {renderAsMarkdown ? <MarkdownMessage content={normalizedContent} /> : normalizedContent}
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
