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

// 사용자 메시지에 markdown 이미지(`![alt](src)`) 가 들어있으면 — 클래리파이어
// 카드가 대표적인 경우 — MarkdownMessage 내부 img 렌더에만 의존하지 말고
// MessageRow 가 직접 src/alt 를 추출해서 말풍선 안에 큼지막한 카드 그림을
// 그려준다. (배포·캐시·CSS 어디에서 막혀도 카드는 보이도록 우회 경로 확보.)
// 추출한 이미지 마크다운은 본문에서 잘라내고 텍스트만 markdown 으로 렌더해
// 같은 이미지가 중복 표시되지 않도록 한다.
const IMAGE_PATTERN = /!\[([^\]]*)\]\(([^)]+)\)/

const MessageRow = React.memo(function MessageRow({
  message,
  index,
  lang: _lang,
  styles: s,
}: MessageRowProps) {
  const isAssistant = message.role === 'assistant'
  const repaired = repairMojibakeText(message.content || '')
  const normalizedContent = isAssistant ? stripReportMarkdown(repaired) : repaired

  const imageMatch = !isAssistant ? normalizedContent.match(IMAGE_PATTERN) : null
  const inlineImage = imageMatch ? { alt: imageMatch[1] || '', src: imageMatch[2] } : null
  const textContent = inlineImage
    ? normalizedContent.replace(IMAGE_PATTERN, '').trim()
    : normalizedContent

  const userLooksLikeMarkdown =
    /\*\*[^*]+\*\*|^#{1,3}\s|\n[*-]\s/.test(textContent)
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
          {textContent &&
            (renderAsMarkdown ? <MarkdownMessage content={textContent} /> : textContent)}
          {inlineImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={inlineImage.src}
              alt={inlineImage.alt}
              loading="lazy"
              style={{
                display: 'block',
                maxWidth: '180px',
                width: '70%',
                aspectRatio: '5 / 8.5',
                objectFit: 'cover',
                borderRadius: '10px',
                marginTop: textContent ? '10px' : 0,
                boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
                background: 'rgba(255,255,255,0.06)',
              }}
            />
          )}
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
