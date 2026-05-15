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

/**
 * The counselor is a conversation, not a report. The LLM occasionally
 * slips and uses markdown — `## headings`, `**bold**`, tables, numbered
 * "1️⃣" labels — which the rich `MarkdownMessage` renderer then surfaces
 * as colored, bordered sections that flip the reading from "chat" to
 * "report" mid-message (purple gradient bold, left-border section
 * blocks, etc.). Strip those structural cues so the message reads as a
 * single flow regardless of the LLM's formatting choices.
 *
 * Keeps the *content*; removes only the syntactic envelope.
 */
function stripReportMarkdown(input: string): string {
  let text = input
  // Headings — keep heading text, drop the `#` prefix.
  text = text.replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, '')
  // Markdown table separator row (`|---|---|`). Match an *entire line*
  // and replace with empty. Important: use `[ \t]` not `\s` so the
  // pattern never devours adjacent newlines (which would otherwise glue
  // the rows on either side together).
  text = text.replace(
    /^[ \t]*\|?[ \t]*:?-{2,}:?(?:[ \t]*\|[ \t]*:?-{2,}:?)+[ \t]*\|?[ \t]*$\n?/gm,
    ''
  )
  // Pipe-delimited row → "cell · cell" prose. Again `[ \t]` only.
  text = text.replace(/^[ \t]*\|(.+)\|[ \t]*$/gm, (_m, row: string) => {
    const cells = row
      .split('|')
      .map((cell) => cell.trim())
      .filter((cell) => cell.length > 0)
    return cells.join(' · ')
  })
  // Bold / italic — strip markers, keep the inner text.
  text = text.replace(/\*\*([^*\n]+)\*\*/g, '$1')
  text = text.replace(/(?<!\*)\*(?!\*)([^*\n]+?)(?<!\*)\*(?!\*)/g, '$1')
  // Bullet / numbered list markers at line start → comma-joined sentence
  // fragments don't read well in prose; demote bullets to plain lines.
  text = text.replace(/^\s*[-*+]\s+/gm, '')
  text = text.replace(/^\s*\d+\.\s+/gm, '')
  // Inline backticks rarely matter for chat; drop the ticks.
  text = text.replace(/`([^`\n]+)`/g, '$1')
  // Collapse the 3+ blank lines introduced by stripped blocks.
  text = text.replace(/\n{3,}/g, '\n\n')
  return text.trim()
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
  const repaired = repairMojibakeText(message.content || '')
  // Assistant messages: strip report-style markdown so the bubble reads
  // like a chat reply. User messages are passed through unchanged.
  const normalizedContent = isAssistant ? stripReportMarkdown(repaired) : repaired
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
