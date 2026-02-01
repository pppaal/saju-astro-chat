'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import styles from './PredictionChat.module.css'
import { useTypingAnimation } from './hooks/useTypingAnimation'
import { useEventTypeDetector, EVENT_ICONS, EventType } from './hooks/useEventTypeDetector'
import { Spinner } from '@/components/ui'

interface PredictionChatProps {
  onSubmit: (question: string, eventType: EventType | null) => void
  isLoading?: boolean
  compact?: boolean
}

// 힌트 버튼 데이터
const HINTS: readonly { type: EventType; text: string }[] = [
  { type: 'marriage', text: '언제 결혼하나요?' },
  { type: 'career', text: '취업 최적 시기는?' },
  { type: 'career', text: '이직하기 좋은 때는?' },
  { type: 'move', text: '이사 가기 좋은 시기' },
  { type: 'investment', text: '투자 시작 타이밍' },
  { type: 'study', text: '시험 운이 좋은 때' },
  { type: 'relationship', text: '연애운 좋은 시기' },
  { type: 'health', text: '건강 관리 시기' },
] as const

// 컴팩트 모드용 빠른 힌트 (4개만)
const COMPACT_HINTS: readonly { type: EventType; text: string }[] = [
  { type: 'marriage', text: '결혼' },
  { type: 'career', text: '취업' },
  { type: 'investment', text: '투자' },
  { type: 'move', text: '이사' },
] as const

// 타이핑 애니메이션 플레이스홀더
const PLACEHOLDERS = [
  '미래와 과거를 물어보세요',
  '언제 결혼하면 좋을까요?',
  '취업 최적 시기가 궁금해요',
  '이사 가기 좋은 달은?',
  '투자 시작하기 좋은 시기',
] as const

// 타이핑 애니메이션 설정
const TYPING_OPTIONS = {
  typingSpeed: 80,
  deletingSpeed: 40,
  pauseDuration: 2500,
  pauseAfterDelete: 300,
} as const

export function PredictionChat({
  onSubmit,
  isLoading = false,
  compact = false,
}: PredictionChatProps) {
  const [question, setQuestion] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // 타이핑 애니메이션
  const { displayText } = useTypingAnimation([...PLACEHOLDERS], TYPING_OPTIONS)

  // 이벤트 타입 감지
  const { detectedType, icon, label } = useEventTypeDetector(question)

  // 폼 제출 핸들러
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (question.trim() && !isLoading) {
        onSubmit(question.trim(), detectedType)
      }
    },
    [question, detectedType, isLoading, onSubmit]
  )

  // 힌트 클릭 핸들러
  const handleHintClick = useCallback((hintText: string) => {
    setQuestion(hintText)
    inputRef.current?.focus()
  }, [])

  // Enter 키 제출
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        handleSubmit(e)
      }
    },
    [handleSubmit]
  )

  // 컴팩트 모드가 아닐 때 자동 포커스
  useEffect(() => {
    if (!compact) {
      inputRef.current?.focus()
    }
  }, [compact])

  return (
    <div className={`${styles.container} ${compact ? styles.compact : ''}`}>
      {!compact && (
        <>
          <h1 className={styles.title}>인생 타이밍 예측</h1>
          <p className={styles.subtitle}>사주와 점성학을 바탕으로 최적의 시기를 찾아드립니다</p>
        </>
      )}

      <div className={styles.searchContainer}>
        <form className={styles.searchForm} onSubmit={handleSubmit}>
          <div className={styles.searchWrapper}>
            {/* 감지된 이벤트 타입 배지 */}
            {detectedType && (
              <span className={styles.detectedBadge}>
                <span>{icon}</span>
                <span>{label}</span>
              </span>
            )}

            {/* 검색 아이콘 (배지가 없을 때만) */}
            {!detectedType && <span className={styles.searchIcon}>🔮</span>}

            {/* 검색 입력 - CSS에서 .detectedBadge + .searchInput으로 패딩 처리 */}
            <input
              ref={inputRef}
              type="text"
              className={styles.searchInput}
              placeholder={displayText || PLACEHOLDERS[0]}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              autoComplete="off"
            />

            {/* 제출 버튼 */}
            <button
              type="submit"
              className={styles.searchBtn}
              disabled={isLoading || !question.trim()}
              title="예측하기"
            >
              {isLoading ? <Spinner size="sm" variant="white" label="예측 중..." /> : '➤'}
            </button>
          </div>

          {/* 힌트 버튼들 */}
          {!compact && (
            <div className={styles.hints}>
              {HINTS.map((hint, index) => (
                <button
                  key={index}
                  type="button"
                  className={styles.hint}
                  onClick={() => handleHintClick(hint.text)}
                  disabled={isLoading}
                >
                  <span className={styles.hintIcon}>{EVENT_ICONS[hint.type]}</span>
                  {hint.text}
                </button>
              ))}
            </div>
          )}

          {/* 컴팩트 모드 빠른 힌트 */}
          {compact && (
            <div className={styles.compactHints}>
              {COMPACT_HINTS.map((hint, index) => (
                <button
                  key={index}
                  type="button"
                  className={styles.compactHint}
                  onClick={() => handleHintClick(`${hint.text} 최적 시기는?`)}
                  disabled={isLoading}
                >
                  <span>{EVENT_ICONS[hint.type]}</span>
                  <span>{hint.text}</span>
                </button>
              ))}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

export default PredictionChat
