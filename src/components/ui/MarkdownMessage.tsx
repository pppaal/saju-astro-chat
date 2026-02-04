// src/components/ui/MarkdownMessage.tsx
// Markdown renderer for chat messages with beautiful styling

'use client'

import React, { memo } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import styles from './MarkdownMessage.module.css'

interface MarkdownMessageProps {
  content: string
  className?: string
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
}

const MarkdownMessage = memo(function MarkdownMessage({
  content,
  className,
}: MarkdownMessageProps) {
  return (
    <div className={`${styles.markdown} ${className || ''}`}>
      <ReactMarkdown components={MARKDOWN_COMPONENTS}>{content}</ReactMarkdown>
    </div>
  )
})

export default MarkdownMessage
