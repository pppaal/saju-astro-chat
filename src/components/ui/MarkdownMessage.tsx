// src/components/ui/MarkdownMessage.tsx
// Markdown renderer for chat messages with beautiful styling

'use client'

import React, { memo } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import styles from './MarkdownMessage.module.css'

interface MarkdownMessageProps {
  content: string
  className?: string
  // Default styling targets dark chat bubbles. Counselor pages render on a
  // white surface where the default heading/quote colors are invisible —
  // pass 'light' there.
  theme?: 'light' | 'dark'
}

// ReactMarkdown components를 컴포넌트 외부로 이동 (재생성 방지)

const MARKDOWN_COMPONENTS: Components = {
  strong: ({ children }) => <strong className={styles.strong}>{children}</strong>,
  em: ({ children }) => <em className={styles.em}>{children}</em>,
  p: ({ children }) => <p className={styles.paragraph}>{children}</p>,
  ul: ({ children }) => <ul className={styles.list}>{children}</ul>,
  ol: ({ children }) => <ol className={styles.orderedList}>{children}</ol>,
  li: ({ children }) => <li className={styles.listItem}>{children}</li>,
  code: ({ children }) => <code className={styles.code}>{children}</code>,
  a: ({ children, href }) => (
    <a href={href} className={styles.link} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  h1: ({ children }) => <h1 className={styles.heading1}>{children}</h1>,
  h2: ({ children }) => <h2 className={styles.heading2}>{children}</h2>,
  h3: ({ children }) => <h3 className={styles.heading3}>{children}</h3>,
  blockquote: ({ children }) => <blockquote className={styles.blockquote}>{children}</blockquote>,
  hr: () => <hr className={styles.hr} />,
  // 이미지 — 타로 카드 등 채팅 안에서 카드 그림 표시. max-width 로 폭 제한,
  // rounded corner + subtle shadow 로 챗 버블 안에 자연스럽게 녹아들도록.
  img: ({ src, alt }) =>
    src ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt || ''}
        loading="lazy"
        className={styles.cardImage}
      />
    ) : null,
}

const MarkdownMessage = memo(function MarkdownMessage({
  content,
  className,
  theme = 'dark',
}: MarkdownMessageProps) {
  return (
    <div
      className={`${styles.markdown} ${theme === 'light' ? styles.light : ''} ${className || ''}`}
    >
      <ReactMarkdown components={MARKDOWN_COMPONENTS}>{content}</ReactMarkdown>
    </div>
  )
})

export default MarkdownMessage
