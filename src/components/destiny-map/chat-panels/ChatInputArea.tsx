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
  autoFocus = false,
}: ChatInputAreaProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  // Pop the soft keyboard the moment the chat is ready. iOS Safari
  // restricts programmatic focus outside a user gesture, so this is a
  // best-effort: works on desktop + Android; on iOS it places the cursor
  // and waits for the user to tap.
  React.useEffect(() => {
    if (autoFocus) {
      textareaRef.current?.focus()
    }
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
          <label
            className={styles.attachButton}
            aria-label={tr.uploadCv}
            title={tr.uploadCv}
          >
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
