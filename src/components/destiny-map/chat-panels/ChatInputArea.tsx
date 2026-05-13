'use client'

import React from 'react'
import type { Copy } from '../chat-i18n'

interface ChatInputAreaProps {
  input: string
  loading: boolean
  cvName: string
  parsingPdf: boolean
  usedFallback: boolean
  tr: Copy
  onInputChange: (value: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onSend: () => void
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  styles: Record<string, string>
  /** Auto-focus the textarea on mount (opens mobile keyboard immediately). */
  autoFocus?: boolean
}

export const ChatInputArea = React.memo(function ChatInputArea({
  input,
  loading,
  cvName,
  parsingPdf,
  usedFallback,
  tr,
  onInputChange,
  onKeyDown,
  onSend,
  onFileUpload,
  styles,
  autoFocus,
}: ChatInputAreaProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    if (!autoFocus) return
    // Defer slightly so layout settles, then focus to surface the mobile
    // keyboard right when the chat opens.
    const id = window.setTimeout(() => textareaRef.current?.focus(), 120)
    return () => window.clearTimeout(id)
  }, [autoFocus])

  return (
    <div className={styles.inputArea}>
      <div className={styles.inputBox}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={tr.placeholder}
          aria-label={tr.placeholder}
          rows={2}
          className={styles.textarea}
          disabled={loading}
          maxLength={2000}
        />
        <div className={styles.inputBoxActions}>
          <label className={styles.attachButton} aria-label={tr.uploadCv} title={tr.uploadCv}>
            <span aria-hidden="true">&#x1F4CE;</span>
            <input
              type="file"
              accept=".txt,.md,.csv,.pdf"
              className={styles.fileInput}
              onChange={onFileUpload}
            />
          </label>
          {parsingPdf && (
            <span className={styles.fileName}>
              <span className={styles.loadingSpinner} />
              {tr.parsingPdf}
            </span>
          )}
          {cvName && !parsingPdf && (
            <span className={styles.fileName}>
              <span className={styles.fileIcon}>&#x2713;</span>
              {cvName}
            </span>
          )}
          <button
            type="button"
            onClick={onSend}
            disabled={loading || !input.trim()}
            className={styles.sendButton}
          >
            <span className={styles.sendIcon}>&#x2728;</span>
            <span className={styles.sendText}>{tr.send}</span>
          </button>
        </div>
      </div>

      {usedFallback && (
        <div className={styles.fallbackNote}>
          <span className={styles.fallbackIcon}>&#x2139;&#xFE0F;</span>
          {tr.fallbackNote}
        </div>
      )}
    </div>
  )
})
