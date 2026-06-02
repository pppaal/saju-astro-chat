'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { LangKey } from '../chat-i18n'
import { useTypewriterPlaceholder } from '@/hooks/useTypewriterPlaceholder'
import internalStyles from './ChatInputArea.module.css'

// 운명 상담사 default 타이프라이터 프롬프트. compat / 외부 호출자는
// placeholderPrompts 로 자기 콘텍스트에 맞는 prompt 리스트를 넘길 수 있다.
const DEFAULT_TYPEWRITER_PROMPTS: Record<LangKey, readonly string[]> = {
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

export interface ChatInputAreaLabels {
  /** 텍스트영역 placeholder (타이프라이터 가 비어 있을 때 fallback). */
  placeholder: string
  send: string
  uploadCv: string
  parsingPdf: string
  fallbackNote?: string
  /** 첨부 파일 X 버튼 aria-label. */
  removeAttachment?: string
  /** 입력창 ✕ 버튼 aria-label. */
  clearInput?: string
}

export interface ChatInputAreaToolOverride {
  /** 화면에 보이는 라벨 텍스트 (.toolLabel). 없으면 '타로'/'차트' 기본. */
  label?: string
  ariaLabel?: string
  title?: string
}

interface ChatInputAreaProps {
  input: string
  loading: boolean
  cvName: string
  parsingPdf: boolean
  usedFallback: boolean
  labels: ChatInputAreaLabels
  lang: LangKey
  onInputChange: (value: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onSend: () => void
  /** 파일 첨부 핸들러. 미지정 시 ⋮ 메뉴에 '파일' 항목 미노출 (예: 메인
   *  랜딩 입력창처럼 첨부할 대화가 없는 곳). */
  onFileUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void | Promise<void>
  onClearFile?: () => void
  /** Chart/tarot 진입점 — 사이드바 푸터(데스크탑) 와 동일 동선. */
  onOpenTarot?: () => void
  onOpenChart?: () => void
  /** 타로/차트 비활성 조건 — 궁합 상담사에서 인물 < 2 / 차트 데이터 없음 등. */
  tarotDisabled?: boolean
  chartDisabled?: boolean
  /** 타로/차트 라벨·aria·툴팁 오버라이드 — 궁합("궁합차트")처럼 콘텍스트별 문구. */
  tarot?: ChatInputAreaToolOverride
  chart?: ChatInputAreaToolOverride
  /** 타이프라이터 프롬프트 오버라이드. 기본은 운명 상담사용 lang별 리스트. */
  placeholderPrompts?: readonly string[]
  /** input[type=file] accept 확장자. 기본 txt/md/csv/pdf. */
  fileAccept?: string
  /**
   * (legacy) 호출자 CSS 모듈에서 동일 class 이름으로 스타일을 덮으려고
   * 넘기는 styles override. 미지정 시 컴포넌트 co-located CSS 그대로.
   * 새 호출자는 가급적 넘기지 말 것 — 양 상담사 간 드리프트 원인.
   */
  styles?: Record<string, string>
  autoFocus?: boolean
  /** 값이 바뀔 때마다 textarea 에 다시 focus — "새 채팅" / send 직후 refocus 등. */
  focusToken?: unknown
  /** 'dark' (운명 — 어두운 배경 페이지) / 'light' (궁합 — 흰 배경 페이지). 기본 'dark'. */
  theme?: 'dark' | 'light'
  /**
   * 호출자가 이미 박스(배경+테두리)를 그리고 그 안에 입력창을 끼워 넣을 때 true.
   * 입력창 자체의 sticky/배경/테두리/그림자를 모두 끄고 레이아웃만 남겨, 부모
   * 박스와 한 덩어리처럼 보이게 한다(메인 홈: 생년월일 칩 + 입력을 한 박스로).
   */
  embedded?: boolean
  /**
   * 입력 박스(.inputBox) 안쪽 최상단(textarea 위)에 끼워 넣을 노드. 메인 홈에서
   * 생년월일 칩을 입력창 바깥 위가 아니라 textarea 와 같은 박스 안 좌상단에
   * 넣기 위해 사용. 미지정 시 아무것도 렌더하지 않는다.
   */
  topSlot?: React.ReactNode
  /**
   * 입력 박스(.inputBox)에 부여할 CSS view-transition-name. 메인 홈 입력창과
   * 운명 상담사 입력창에 같은 이름을 주면, 라우트 전환 시 브라우저 View
   * Transitions API 가 두 박스를 하나로 이어(morph) 애니메이션한다. 한 페이지에
   * 같은 이름이 둘 이상이면 전환이 무효화되므로, 입력창이 하나뿐인 곳에서만
   * 넘길 것(타로/궁합 인라인처럼 여러 개면 넘기지 말 것).
   */
  viewTransitionName?: string
}

export const ChatInputArea = React.memo(function ChatInputArea({
  input,
  loading,
  cvName,
  parsingPdf,
  usedFallback,
  labels,
  lang,
  onInputChange,
  onKeyDown,
  onSend,
  onFileUpload,
  onClearFile,
  onOpenTarot,
  onOpenChart,
  tarotDisabled = false,
  chartDisabled = false,
  tarot,
  chart,
  placeholderPrompts,
  fileAccept = '.txt,.md,.csv,.pdf',
  styles: stylesOverride,
  autoFocus = false,
  focusToken,
  theme = 'dark',
  embedded = false,
  topSlot,
  viewTransitionName,
}: ChatInputAreaProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const styles = stylesOverride ?? internalStyles
  const animatedPlaceholder = useTypewriterPlaceholder(
    placeholderPrompts ?? DEFAULT_TYPEWRITER_PROMPTS[lang] ?? DEFAULT_TYPEWRITER_PROMPTS.en
  )

  // 좌상단 ⋮ 도구 메뉴 — 파일/타로/차트를 인라인 아이콘 줄 대신 하나의
  // 케밥 버튼으로 접어둔다(ChatGPT/Claude 식). 클릭 시 팝오버, 바깥 클릭/
  // 항목 선택 시 닫힘.
  const [toolsOpen, setToolsOpen] = React.useState(false)
  const toolsRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (!toolsOpen) return
    const handler = (e: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setToolsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [toolsOpen])

  // iOS Safari restricts programmatic focus outside a user gesture so the
  // textarea won't pop the soft keyboard automatically — desktop / Android only.
  React.useEffect(() => {
    if (autoFocus) {
      textareaRef.current?.focus()
    }
  }, [autoFocus])

  // 부모가 focusToken 을 갱신하면 (= 새 채팅 / 전송 직후) 다시 focus.
  React.useEffect(() => {
    if (focusToken !== undefined) {
      textareaRef.current?.focus()
    }
  }, [focusToken])

  // textarea auto-grow (Claude 식) — 내용 높이만큼 위로 늘리되, CSS max-height
  // (40vh) 를 넘으면 거기서 멈추고 내부 스크롤. height 를 auto 로 리셋한 뒤
  // scrollHeight 를 읽어야 줄을 지웠을 때 다시 줄어든다.
  React.useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const max = Math.round(window.innerHeight * 0.4) // 40vh — CSS max-height 와 일치
    const next = Math.min(el.scrollHeight, max)
    el.style.height = `${next}px`
    el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden'
  }, [input])

  const tarotLabel = tarot?.label ?? (lang === 'ko' ? '타로' : 'Tarot')
  const tarotAria =
    tarot?.ariaLabel ?? (lang === 'ko' ? '다음 질문 타로로 보기' : 'See next question in tarot')
  const tarotTitle =
    tarot?.title ?? (lang === 'ko' ? '다음 질문을 타로로 보기' : 'See your next question in tarot')
  const chartLabel = chart?.label ?? (lang === 'ko' ? '차트' : 'Chart')
  const chartAria = chart?.ariaLabel ?? (lang === 'ko' ? '나의 운세 차트' : 'My destiny chart')
  const chartTitle = chart?.title ?? (lang === 'ko' ? '나의 운세 차트' : 'My destiny chart')

  return (
    <div className={styles.inputArea} data-theme={theme} data-embedded={embedded || undefined}>
      <div
        className={styles.inputBox}
        style={viewTransitionName ? { viewTransitionName } : undefined}
      >
        {topSlot ? <div className={styles.inputBoxTop}>{topSlot}</div> : null}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={(e) => {
            if (e.currentTarget.value.trim()) e.currentTarget.select()
          }}
          placeholder={animatedPlaceholder || labels.placeholder}
          aria-label={labels.placeholder}
          rows={1}
          className={styles.textarea}
          disabled={loading}
          maxLength={2000}
        />
        <div className={styles.inputBoxActions}>
          <div className={styles.inputBoxActionsLeft}>
            {/* 좌상단 ⋮ 도구 메뉴 — 파일/타로/차트를 한 버튼으로 접음. 도구가
                하나도 없으면(메인 랜딩 입력창) 버튼 자체를 숨긴다. */}
            {(onFileUpload || onOpenTarot || onOpenChart) && (
            <div className={styles.toolMenu} ref={toolsRef}>
              <button
                type="button"
                className={styles.attachButton}
                onClick={() => setToolsOpen((o) => !o)}
                aria-label={lang === 'ko' ? '도구' : 'Tools'}
                aria-haspopup="menu"
                aria-expanded={toolsOpen}
                title={lang === 'ko' ? '도구' : 'Tools'}
              >
                <span aria-hidden="true">&#x22EE;</span>
              </button>
              <AnimatePresence>
              {toolsOpen && (
                <motion.div
                  role="menu"
                  className={styles.toolMenuPopover}
                  initial={{ opacity: 0, scale: 0.96, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 6 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  style={{ transformOrigin: 'bottom left' }}
                >
                  {onFileUpload && (
                  <label
                    role="menuitem"
                    className={styles.toolMenuItem}
                    aria-label={labels.uploadCv}
                    title={labels.uploadCv}
                  >
                    <span aria-hidden="true" className={styles.toolMenuIcon}>
                      &#x1F4CE;
                    </span>
                    <span className={styles.toolMenuText}>
                      <span className={styles.toolMenuLabel}>
                        {lang === 'ko' ? '파일' : 'File'}
                      </span>
                      <span className={styles.toolMenuDesc}>
                        {lang === 'ko' ? '이력서·문서 첨부해 분석' : 'Attach a CV or document'}
                      </span>
                    </span>
                    <input
                      type="file"
                      accept={fileAccept}
                      className={styles.fileInput}
                      onChange={(e) => {
                        setToolsOpen(false)
                        void onFileUpload(e)
                      }}
                    />
                  </label>
                  )}
                  {onOpenTarot && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setToolsOpen(false)
                        onOpenTarot()
                      }}
                      disabled={tarotDisabled || loading}
                      className={styles.toolMenuItem}
                      aria-label={tarotAria}
                      title={tarotTitle}
                    >
                      <span aria-hidden="true" className={styles.toolMenuIcon}>
                        &#x1F0CF;
                      </span>
                      <span className={styles.toolMenuText}>
                        <span className={styles.toolMenuLabel}>{tarotLabel}</span>
                        <span className={styles.toolMenuDesc}>
                          {lang === 'ko'
                            ? '다음 질문을 타로 카드로 보기'
                            : 'See your next question as tarot'}
                        </span>
                      </span>
                    </button>
                  )}
                  {onOpenChart && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setToolsOpen(false)
                        onOpenChart()
                      }}
                      disabled={chartDisabled}
                      className={styles.toolMenuItem}
                      aria-label={chartAria}
                      title={chartTitle}
                    >
                      {/* ☯ 음양 — 사주/동양 전통의 차트 정체성. */}
                      <span aria-hidden="true" className={styles.toolMenuIcon}>
                        &#x262F;
                      </span>
                      <span className={styles.toolMenuText}>
                        <span className={styles.toolMenuLabel}>{chartLabel}</span>
                        <span className={styles.toolMenuDesc}>
                          {chart?.title ??
                            (lang === 'ko' ? '내 사주·운세 차트 보기' : 'View your destiny chart')}
                        </span>
                      </span>
                    </button>
                  )}
                </motion.div>
              )}
              </AnimatePresence>
            </div>
            )}
            {parsingPdf && (
              <span className={styles.fileName}>
                <span className={styles.loadingSpinner} />
                {labels.parsingPdf}
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
                    aria-label={labels.removeAttachment ?? (lang === 'ko' ? '첨부 제거' : 'Remove attachment')}
                    title={labels.removeAttachment ?? (lang === 'ko' ? '첨부 제거' : 'Remove attachment')}
                    className={styles.fileNameClear || ''}
                    style={
                      styles.fileNameClear
                        ? undefined
                        : {
                            marginLeft: 6,
                            border: 0,
                            background: 'transparent',
                            color: 'inherit',
                            cursor: 'pointer',
                            fontSize: '0.9em',
                            lineHeight: 1,
                            opacity: 0.7,
                          }
                    }
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
              aria-label={labels.clearInput ?? (lang === 'ko' ? '입력 지우기' : 'Clear input')}
              title={labels.clearInput ?? (lang === 'ko' ? '입력 지우기' : 'Clear input')}
            >
              <span aria-hidden="true">&#x2715;</span>
            </button>
          )}
          <button
            type="button"
            onClick={onSend}
            disabled={loading || !input.trim()}
            className={styles.sendButton}
            aria-label={labels.send}
            title={labels.send}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>

      {usedFallback && labels.fallbackNote && (
        <div className={styles.fallbackNote}>
          <span className={styles.fallbackIcon}>&#x2139;&#xFE0F;</span>
          {labels.fallbackNote}
        </div>
      )}
    </div>
  )
})
