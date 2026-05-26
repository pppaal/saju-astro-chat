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
  // like a chat reply. User messages are passed through unchanged.
  const normalizedContent = isAssistant ? stripReportMarkdown(repaired) : repaired
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
          {isAssistant ? <MarkdownMessage content={normalizedContent} /> : normalizedContent}
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
