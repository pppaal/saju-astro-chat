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
    '오늘 내 운세 어때요?',
    '올해 흐름은 어때?',
    '지금 이 시기의 의미?',
    '관계의 방향은?',
    '커리어는 어디로?',
    '지금 가장 큰 과제는?',
  ],
  en: [
    "How's my fortune today?",
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
  onClearFile?: () => void
  /** Chart/tarot/clarifier triggers — 사이드바에서 제거하고 입력창 도구로
   *  통일. 모바일/데스크탑 모두 입력창 옆 단일 진입점. */
  onOpenTarot?: () => void
  onOpenChart?: () => void
  /** 클래리파이어 버튼 props (useClarifierCard 의 buttonProps + buttonLabel). */
  clarifierButton?: {
    props: React.ButtonHTMLAttributes<HTMLButtonElement>
    label: string
  }
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
  onClearFile,
  onOpenTarot,
  onOpenChart,
  clarifierButton,
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

  // 타이핑하면 자라고, max-height(CSS .textarea max-height: 6rem) 넘으면
  // 스크롤. height='auto' 한 번 재설정 후 scrollHeight 로 측정해야 줄어들기도 함.
  React.useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [input])

  return (
    <div className={styles.inputArea}>
      <div className={styles.inputBox}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={(e) => {
            // 미리 채워진 후속질문을 탭하면 전체 선택 — 바로 보내거나 타이핑으로 덮어쓰기 쉽게.
            if (e.currentTarget.value.trim()) e.currentTarget.select()
          }}
          placeholder={animatedPlaceholder || tr.placeholder}
          aria-label={tr.placeholder}
          rows={1}
          className={styles.textarea}
          disabled={loading}
          maxLength={2000}
        />
        <div className={styles.inputBoxActions}>
          <div className={styles.inputBoxActionsLeft}>
            <label
              className={`${styles.attachButton} ${styles.toolWithLabel}`}
              aria-label={tr.uploadCv}
              title={tr.uploadCv}
            >
              <span aria-hidden="true">&#x1F4CE;</span>
              <span className={styles.toolLabel}>{lang === 'ko' ? '파일' : 'File'}</span>
              <input
                type="file"
                accept=".txt,.md,.csv,.pdf"
                className={styles.fileInput}
                onChange={onFileUpload}
              />
            </label>
            {/* Mobile-only chart/tarot entry — desktop has them in the
                sidebar footer (.historyRailFooter). Hidden on ≥1024px via
                .mobileOnlyTool to avoid double entry points. */}
            {onOpenTarot && (
              <button
                type="button"
                onClick={onOpenTarot}
                className={`${styles.attachButton} ${styles.toolWithLabel} ${styles.mobileOnlyTool}`}
                aria-label={lang === 'ko' ? '다음 질문 타로로 보기' : 'See next question in tarot'}
                title={
                  lang === 'ko' ? '다음 질문을 타로로 보기' : 'See your next question in tarot'
                }
              >
                <span aria-hidden="true">&#x1F0CF;</span>
                <span className={styles.toolLabel}>{lang === 'ko' ? '타로' : 'Tarot'}</span>
              </button>
            )}
            {onOpenChart && (
              <button
                type="button"
                onClick={onOpenChart}
                className={`${styles.attachButton} ${styles.toolWithLabel} ${styles.mobileOnlyTool}`}
                aria-label={lang === 'ko' ? '나의 운세 차트' : 'My destiny chart'}
                title={lang === 'ko' ? '나의 운세 차트' : 'My destiny chart'}
              >
                <span aria-hidden="true">&#x2728;</span>
                <span className={styles.toolLabel}>{lang === 'ko' ? '차트' : 'Chart'}</span>
              </button>
            )}
            {clarifierButton && (
              <button
                type="button"
                {...clarifierButton.props}
                className={`${styles.attachButton} ${styles.toolWithLabel} ${styles.mobileOnlyTool}`}
                aria-label={clarifierButton.label}
              >
                <span aria-hidden="true">{'🃏'}</span>
                <span className={styles.toolLabel}>{clarifierButton.label}</span>
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
                {onClearFile && (
                  <button
                    type="button"
                    onClick={onClearFile}
                    aria-label={lang === 'ko' ? '첨부 제거' : 'Remove attachment'}
                    title={lang === 'ko' ? '첨부 제거' : 'Remove attachment'}
                    style={{
                      marginLeft: 6,
                      border: 0,
                      background: 'transparent',
                      color: 'inherit',
                      cursor: 'pointer',
                      fontSize: '0.9em',
                      lineHeight: 1,
                      opacity: 0.7,
                    }}
                  >
                    ✕
                  </button>
                )}
              </span>
            )}
          </div>
          {input.trim() && !loading && (
            <button
              type="button"
              onClick={() => onInputChange('')}
              className={styles.clearButton}
              aria-label={lang === 'ko' ? '입력 지우기' : 'Clear input'}
              title={lang === 'ko' ? '입력 지우기' : 'Clear input'}
            >
              <span aria-hidden="true">&#x2715;</span>
            </button>
          )}
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
