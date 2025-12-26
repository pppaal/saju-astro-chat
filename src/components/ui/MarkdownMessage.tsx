// src/components/ui/MarkdownMessage.tsx
// Markdown renderer for chat messages with beautiful styling

"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import styles from "./MarkdownMessage.module.css";

interface MarkdownMessageProps {
  content: string;
  className?: string;
}

export default function MarkdownMessage({ content, className }: MarkdownMessageProps) {
  return (
    <div className={`${styles.markdown} ${className || ""}`}>
      <ReactMarkdown
        components={{
          // 굵은 텍스트
          strong: ({ children }) => (
            <strong className={styles.strong}>{children}</strong>
          ),
          // 기울임
          em: ({ children }) => (
            <em className={styles.em}>{children}</em>
          ),
          // 단락
          p: ({ children }) => (
            <p className={styles.paragraph}>{children}</p>
          ),
          // 리스트
          ul: ({ children }) => (
            <ul className={styles.list}>{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className={styles.orderedList}>{children}</ol>
          ),
          li: ({ children }) => (
            <li className={styles.listItem}>{children}</li>
          ),
          // 코드
          code: ({ children }) => (
            <code className={styles.code}>{children}</code>
          ),
          // 링크
          a: ({ href, children }) => (
            <a href={href} className={styles.link} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          // 헤딩 (사용 시)
          h1: ({ children }) => (
            <h1 className={styles.heading1}>{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className={styles.heading2}>{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className={styles.heading3}>{children}</h3>
          ),
          // 인용구
          blockquote: ({ children }) => (
            <blockquote className={styles.blockquote}>{children}</blockquote>
          ),
          // 구분선
          hr: () => <hr className={styles.hr} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
