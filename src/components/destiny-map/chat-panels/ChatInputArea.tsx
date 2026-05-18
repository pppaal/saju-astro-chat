'use client'

import React from 'react'
import type { Copy, LangKey } from '../chat-i18n'
import { useTypewriterPlaceholder } from '@/hooks/useTypewriterPlaceholder'

// Short rotating prompts that take the place of the static placeholder
// from chat-i18n. The original "언제, 왜, 무엇이 궁금한지 구체적으로
// 적어주세요." wraps to two lines on mobile and feels prescriptive;
// these stay on one line and double as suggestion hints. Keep entries
// under ~16 chars (KO) / ~28 chars (EN) so they don't wrap.
const TYPEWRITER_PROMPTS: Record<LangKey, readonly string[]> = {
  ko: [
    '올해 흐름은 어때?',
    '지금 이 시기의 의미?',
    '관계의 방향은?',
    '커리어는 어디로?',
    '지금 가장 큰 과제는?',
  ],
  en: [
    "What's this year's flow?",
    'What does this season mean?',
    'Where is the relationship heading?',
    'Where is my career going?',
    "What's my biggest challenge now?",
  ],
  ja: [
    '今年の流れは？',
    'この時期の意味は？',
    '関係の方向性は？',
    'キャリアはどこへ？',
    '今の大きな課題は？',
  ],
  zh: [
    '今年的运势如何？',
    '这个时期意味着什么？',
    '关系将走向何方？',
    '事业将走向何方？',
    '现在最大的课题是？',
  ],
  es: [
    '¿Cómo es este año?',
    '¿Qué significa esta etapa?',
    '¿Hacia dónde va la relación?',
    '¿Hacia dónde va mi carrera?',
    '¿Cuál es mi mayor reto ahora?',
  ],
  fr: [
    "Quel est le flux de l'année ?",
    'Que signifie cette période ?',
    'Où va la relation ?',
    'Où va ma carrière ?',
    'Quel est mon plus grand défi ?',
  ],
  de: [
    'Wie ist der Fluss dieses Jahr?',
    'Was bedeutet diese Phase?',
    'Wohin geht die Beziehung?',
    'Wohin geht meine Karriere?',
    'Was ist meine größte Aufgabe?',
  ],
  pt: [
    'Qual é o fluxo deste ano?',
    'O que significa esta fase?',
    'Para onde vai a relação?',
    'Para onde vai minha carreira?',
    'Qual é meu maior desafio?',
  ],
  ru: [
    'Каков поток этого года?',
    'Что значит этот период?',
    'Куда идут наши отношения?',
    'Куда идёт моя карьера?',
    'Какая моя главная задача?',
  ],
}

interface ChatInputAreaProps {
  input: string
  loading: boolean
  cvName: string
  parsingPdf: boolean
  usedFallback: boolean
  tr: Copy
  lang: LangKey
  onInputChange: (value: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onSend: () => void
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  onOpenTarot: () => void
  onOpenChart?: () => void
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
  lang,
  onInputChange,
  onKeyDown,
  onSend,
  onFileUpload,
  onOpenTarot,
  onOpenChart,
  styles,
  autoFocus = false,
}: ChatInputAreaProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const animatedPlaceholder = useTypewriterPlaceholder(
    TYPEWRITER_PROMPTS[lang] ?? TYPEWRITER_PROMPTS.en
  )

  // Pop the soft keyboard the moment the chat is ready. iOS Safari
  // restricts programmatic focus outside a user gesture, so this is a
  // best-effort: works on desktop + Android; on iOS it places the cursor
  // and waits for the user to tap.
  React.useEffect(() => {
    if (autoFocus) {
      textareaRef.current?.focus()
    }
  }, [autoFocus])

  const isKo = lang === 'ko'
  const chartLabel = isKo ? '내 차트 보기' : 'View my chart'

  return (
    <div className={styles.inputArea}>
      <div className={styles.inputBox}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={animatedPlaceholder || tr.placeholder}
          aria-label={tr.placeholder}
          rows={3}
          className={styles.textarea}
          disabled={loading}
          maxLength={2000}
        />
        <div className={styles.inputBoxActions}>
          <div className={styles.inputBoxActionsLeft}>
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
            <button
              type="button"
              onClick={onOpenTarot}
              className={styles.attachButton}
              aria-label={tr.tarotButton}
              title={tr.tarotButton}
            >
              <span aria-hidden="true">&#x1F0CF;</span>
            </button>
            {onOpenChart && (
              <button
                type="button"
                onClick={onOpenChart}
                className={styles.attachButton}
                aria-label={chartLabel}
                title={chartLabel}
              >
                <span aria-hidden="true">&#x2728;</span>
              </button>
            )}
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
          </div>
          <button
            type="button"
            onClick={onSend}
            disabled={loading || !input.trim()}
            className={styles.sendButton}
            aria-label={tr.send}
            title={tr.send}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
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
