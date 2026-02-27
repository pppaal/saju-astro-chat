'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/i18n/I18nProvider'
import { motion, AnimatePresence } from 'framer-motion'
import BackButton from '@/components/ui/BackButton'
import { tarotThemes } from '@/lib/Tarot/tarot-spreads-data'
import { tarotThemeExamples } from '@/lib/Tarot/tarot-question-examples'
import styles from './tarot-home.module.css'
import { useCanvasAnimation, useRecentQuestions, useQuestionAnalysis } from './hooks'
import { getQuickRecommendation } from './utils/recommendations'
import { useTapFeedback, useHapticFeedback } from '@/hooks/useMobileEnhancements'

const pageTransitionVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
}

export default function TarotHomePage() {
  const { language } = useI18n()
  const router = useRouter()
  const isKo = language === 'ko'
  const inputRef = useRef<HTMLInputElement>(null)
  const themeLookup = useMemo(() => new Map(tarotThemes.map((theme) => [theme.id, theme])), [])

  // State
  const [question, setQuestion] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  // Custom hooks
  const canvasRef = useCanvasAnimation()
  const { recentQuestions, addRecentQuestion } = useRecentQuestions()
  const {
    previewInfo,
    dangerWarning,
    isAnalyzing,
    aiExplanation,
    isLoadingPreview,
    fallbackReason,
    fallbackNotice,
    handleStartReading: startReading,
  } = useQuestionAnalysis({ question, language, isKo, getQuickRecommendation })

  // Mobile enhancements
  const handleTouchStart = useTapFeedback()
  const triggerHaptic = useHapticFeedback()

  // Handlers
  const handleStartReading = useCallback(() => {
    if (question.trim()) {
      addRecentQuestion(question)
    }
    startReading()
  }, [question, addRecentQuestion, startReading])

  const handleThemeQuestion = useCallback(
    (questionText: string) => {
      triggerHaptic('light')
      setQuestion(questionText)
      setIsFocused(true)
      inputRef.current?.focus()
    },
    [triggerHaptic]
  )

  const handleRecentQuestion = useCallback(
    (q: string) => {
      setQuestion(q)
      addRecentQuestion(q)
      const result = getQuickRecommendation(q, isKo)
      router.push(result.path)
    },
    [isKo, router, addRecentQuestion]
  )

  const handleDeleteRecent = useCallback(
    (q: string, e: React.MouseEvent) => {
      e.stopPropagation()
      const updated = recentQuestions.filter((item) => item !== q)
      if (typeof window !== 'undefined') {
        localStorage.setItem('tarot_recent_questions', JSON.stringify(updated))
      }
      // Trigger re-fetch
      window.location.reload()
    },
    [recentQuestions]
  )

  return (
    <div className={styles.container}>
      <canvas ref={canvasRef} className={styles.backgroundCanvas} />

      <BackButton />

      <main className={styles.main}>
        <AnimatePresence mode="wait">
          <motion.div
            key="tarot-input"
            variants={pageTransitionVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={styles.card}
          >
            {/* Logo/Title */}
            <header className={styles.header}>
              <div className={styles.iconWrapper}>
                <span className={styles.tarotIcon}>🔮</span>
              </div>
              <h1 className={styles.mainTitle}>{isKo ? 'AI 타로' : 'AI Tarot'}</h1>
              <p className={styles.subtitle}>
                {isKo
                  ? '무엇이든 물어보세요, 카드가 답합니다'
                  : 'Ask anything, the cards will answer'}
              </p>
            </header>

            {/* Search Input */}
            <div className={`${styles.searchContainer} ${isFocused ? styles.focused : ''}`}>
              <div className={styles.searchBox}>
                <span className={styles.searchIcon} aria-hidden="true">
                  ✨
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  className={styles.searchInput}
                  placeholder={isKo ? '무엇이 궁금하세요?' : "What's on your mind?"}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && question.trim() && !isAnalyzing) {
                      handleStartReading()
                    }
                  }}
                  disabled={isAnalyzing}
                  aria-label={isKo ? '타로 질문 입력' : 'Enter your tarot question'}
                  aria-describedby="question-hint"
                />
                {question && !isAnalyzing && (
                  <button
                    className={styles.clearButton}
                    onClick={() => setQuestion('')}
                    aria-label="Clear"
                  >
                    ✕
                  </button>
                )}
                <button
                  className={styles.submitButton}
                  onClick={() => {
                    triggerHaptic('medium')
                    handleStartReading()
                  }}
                  onTouchStart={handleTouchStart}
                  disabled={!question.trim() || isAnalyzing || !!dangerWarning || isLoadingPreview}
                  type="button"
                  aria-label={isKo ? '타로 보기' : 'Read tarot'}
                >
                  {isAnalyzing ? (
                    <span className={styles.loadingSpinner}>⏳</span>
                  ) : (
                    <span aria-hidden="true">➤</span>
                  )}
                </button>
              </div>

              {/* Preview Info */}
              {isLoadingPreview && question.trim().length > 3 && (
                <div className={styles.previewBox}>
                  <div className={styles.previewShimmer}>
                    <span>{isKo ? '분석 중...' : 'Analyzing...'}</span>
                  </div>
                </div>
              )}

              {previewInfo && !isLoadingPreview && !dangerWarning && (
                <div className={styles.previewBox}>
                  <div className={styles.previewContent}>
                    <div className={styles.previewBadge}>
                      {previewInfo.cardCount}
                      {isKo ? '장' : ' cards'}
                    </div>
                    <span className={styles.previewText}>{previewInfo.spreadTitle}</span>
                    {aiExplanation && <p className={styles.aiExplanation}>{aiExplanation}</p>}
                  </div>
                </div>
              )}

              {dangerWarning && (
                <div className={styles.dangerWarning}>
                  <span className={styles.dangerIcon}>⚠️</span>
                  <p>{dangerWarning}</p>
                </div>
              )}

              {fallbackReason && fallbackNotice && !dangerWarning && (
                <div className={styles.fallbackNotice} role="status" aria-live="polite">
                  <p>{fallbackNotice}</p>
                  <span className={styles.fallbackReasonCode}>{fallbackReason}</span>
                </div>
              )}
            </div>

            {/* Theme Examples */}
            <section className={styles.themeSection}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  {isKo ? '테마별 질문 예' : 'Examples by Theme'}
                </h2>
                <p className={styles.sectionSubtitle}>
                  {isKo
                    ? '원하는 테마를 고르고 질문 예를 탭해보세요'
                    : 'Pick a theme and tap an example question'}
                </p>
              </div>
              <div className={styles.themeGrid}>
                {tarotThemeExamples.map((group) => {
                  const theme = themeLookup.get(group.themeId)
                  if (!theme) return null
                  return (
                    <div key={group.themeId} className={styles.themeCard}>
                      <div className={styles.themeTitleRow}>
                        <span className={styles.themeIcon} aria-hidden="true">
                          {group.icon}
                        </span>
                        <div>
                          <p className={styles.themeTitle}>
                            {isKo ? theme.categoryKo : theme.category}
                          </p>
                          <p className={styles.themeDesc}>
                            {isKo ? theme.descriptionKo : theme.description}
                          </p>
                        </div>
                      </div>
                      <div className={styles.themeQuestions}>
                        {group.questions.map((q, idx) => (
                          <button
                            key={`${group.themeId}-${idx}`}
                            className={styles.themeQuestion}
                            onClick={() => handleThemeQuestion(isKo ? q.ko : q.en)}
                            onTouchStart={handleTouchStart}
                            disabled={isAnalyzing}
                            type="button"
                          >
                            {isKo ? q.ko : q.en}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
            {/* Recent Questions */}
            {recentQuestions.length > 0 && (
              <div className={styles.recentSection}>
                <p className={styles.recentLabel}>{isKo ? '최근 질문' : 'Recent'}</p>
                <div className={styles.recentList}>
                  {recentQuestions.map((q, idx) => (
                    <div key={idx} className={styles.recentItem} role="group">
                      <button
                        className={styles.recentItemButton}
                        onClick={() => handleRecentQuestion(q)}
                        disabled={isAnalyzing}
                        type="button"
                      >
                        <span className={styles.recentIcon}>🕐</span>
                        <span className={styles.recentText}>{q}</span>
                      </button>
                      <button
                        className={styles.recentDelete}
                        onClick={(e) => handleDeleteRecent(q, e)}
                        aria-label={isKo ? '최근 질문 삭제' : 'Delete recent question'}
                        type="button"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
