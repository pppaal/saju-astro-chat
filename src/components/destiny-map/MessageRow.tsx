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

type CounselorSection = {
  title: string
  body: string
}

function parseCounselorSections(content: string): CounselorSection[] {
  const matches = Array.from(content.matchAll(/^##\s+(.+)$/gm))
  if (matches.length === 0) return []

  return matches
    .map((match, index) => {
      const title = match[1].trim()
      const start = (match.index ?? 0) + match[0].length
      const end = index + 1 < matches.length ? (matches[index + 1].index ?? content.length) : content.length
      const body = content.slice(start, end).trim()
      return { title, body }
    })
    .filter((section) => section.title && section.body)
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
  const structuredSections = isAssistant && !isStreaming ? parseCounselorSections(normalizedContent) : []
  const rowClass = `${s.messageRow} ${isAssistant ? s.assistantRow : s.userRow}`
  const messageClass = isAssistant ? s.assistantMessage : s.userMessage
  const hasFeedback = isAssistant && !isStreaming && message.content && message.id
  const hasEvidence =
    isAssistant &&
    !isStreaming &&
    (message.evidence?.title || message.evidence?.summary || message.evidence?.bullets?.length)

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
            isStreaming ? (
              <div className={s.streamingMessage}>{normalizedContent}</div>
            ) : structuredSections.length > 0 ? (
              <div className={s.counselorSections}>
                {structuredSections.map((section, sectionIndex) => {
                  const isLead = sectionIndex === 0
                  return (
                    <section
                      key={`${section.title}-${sectionIndex}`}
                      className={`${s.counselorSectionCard} ${isLead ? s.counselorLeadCard : ''}`}
                    >
                      <div className={s.counselorSectionTitle}>{section.title}</div>
                      <MarkdownMessage content={section.body} />
                    </section>
                  )
                })}
              </div>
            ) : (
              <MarkdownMessage content={normalizedContent} />
            )
          ) : (
            normalizedContent
          )}
        </div>

        {hasEvidence && (
          <details className={s.messageEvidencePanel}>
            <summary className={s.messageEvidenceSummary}>
              {message.evidence?.title || (lang === 'ko' ? '왜 이런 답변이 나왔는지' : 'Why this answer')}
            </summary>
            {message.evidence?.summary && (
              <p className={s.messageEvidenceLead}>
                {repairMojibakeText(message.evidence.summary)}
              </p>
            )}
            {message.evidence?.bullets && message.evidence.bullets.length > 0 && (
              <ul className={s.messageEvidenceList}>
                {message.evidence.bullets.map((bullet) => (
                  <li key={bullet}>{repairMojibakeText(bullet)}</li>
                ))}
              </ul>
            )}
          </details>
        )}

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
