// src/components/ui/MarkdownMessage.tsx
// Markdown renderer for chat messages with beautiful styling

'use client'

import React, { useMemo, memo } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import styles from './MarkdownMessage.module.css'

interface MarkdownMessageProps {
  content: string
  className?: string
}

// ReactMarkdown components를 컴포넌트 외부로 이동 (재생성 방지)

const MARKDOWN_COMPONENTS: Components = {
  strong: (props: any) => <strong className={styles.strong}>{props.children}</strong>,
  em: (props: any) => <em className={styles.em}>{props.children}</em>,
  p: (props: any) => <p className={styles.paragraph}>{props.children}</p>,
  ul: (props: any) => <ul className={styles.list}>{props.children}</ul>,
  ol: (props: any) => <ol className={styles.orderedList}>{props.children}</ol>,
  li: (props: any) => <li className={styles.listItem}>{props.children}</li>,
  code: (props: any) => <code className={styles.code}>{props.children}</code>,
  a: (props: any) => (
    <a href={props.href} className={styles.link} target="_blank" rel="noopener noreferrer">
      {props.children}
    </a>
  ),
  h1: (props: any) => <h1 className={styles.heading1}>{props.children}</h1>,
  h2: (props: any) => <h2 className={styles.heading2}>{props.children}</h2>,
  h3: (props: any) => <h3 className={styles.heading3}>{props.children}</h3>,
  blockquote: (props: any) => (
    <blockquote className={styles.blockquote}>{props.children}</blockquote>
  ),
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
