'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/i18n/I18nProvider'
import { motion, AnimatePresence } from 'framer-motion'
import BackButton from '@/components/ui/BackButton'
import {
  appendQuestionContextToPath,
  buildStableEntryPath,
  resolveStableTarotEntry,
  storeQuestionAnalysisSnapshot,
} from '@/lib/Tarot/questionFlow'
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

  const [question, setQuestion] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [showAllThemes, setShowAllThemes] = useState(false)

  const canvasRef = useCanvasAnimation()
  const { recentQuestions, addRecentQuestion, removeRecentQuestion } = useRecentQuestions()
  const {
    analysisResult,
    dangerWarning,
    isAnalyzing,
    isLoadingPreview,
    fallbackReason,
    fallbackNotice,
    handleStartReading: analyzeQuestion,
  } = useQuestionAnalysis({ question, language, isKo, getQuickRecommendation })

  const handleTouchStart = useTapFeedback()
  const triggerHaptic = useHapticFeedback()

  const handleAnalyzeQuestion = useCallback(() => {
    if (question.trim()) {
      addRecentQuestion(question.trim())
    }
    analyzeQuestion()
  }, [question, addRecentQuestion, analyzeQuestion])

  const handleChooseSpread = useCallback(
    (path: string) => {
      const trimmedQuestion = question.trim()
      if (trimmedQuestion) {
        addRecentQuestion(trimmedQuestion)
      }
      const analysisKey = storeQuestionAnalysisSnapshot(trimmedQuestion, analysisResult)
      router.push(appendQuestionContextToPath(path, trimmedQuestion, analysisKey))
    },
    [question, addRecentQuestion, analysisResult, router]
  )

  const handleStartPrimaryReading = useCallback(() => {
    const trimmedQuestion = question.trim()
    if (!trimmedQuestion) {
      return
    }
    addRecentQuestion(trimmedQuestion)
    const analysisKey = storeQuestionAnalysisSnapshot(trimmedQuestion, analysisResult)
    const primaryPath =
      analysisResult?.path && analysisResult.source !== 'fallback'
        ? appendQuestionContextToPath(analysisResult.path, trimmedQuestion, analysisKey)
        : buildStableEntryPath(trimmedQuestion, analysisResult, analysisKey)
    router.push(primaryPath)
  }, [question, analysisResult, addRecentQuestion, router])

  const handleQuickStart = useCallback(() => {
    triggerHaptic('light')
    const defaultQuestion = isKo
      ? '오늘 나에게 필요한 조언은?'
      : 'What guidance do I need right now?'
    const seedQuestion = question.trim() || defaultQuestion
    addRecentQuestion(seedQuestion)
    const quick = getQuickRecommendation(seedQuestion, isKo)
    router.push(appendQuestionContextToPath(quick.path, seedQuestion))
  }, [question, isKo, addRecentQuestion, router, triggerHaptic])

  const handleThemeQuestion = useCallback(
    (questionText: string) => {
      triggerHaptic('light')
      setQuestion(questionText)
      setIsFocused(true)
      inputRef.current?.focus()
    },
    [triggerHaptic]
  )

  const handleRecentQuestion = useCallback((q: string) => {
    setQuestion(q)
    setIsFocused(true)
    inputRef.current?.focus()
  }, [])

  const visibleThemeExamples = useMemo(
    () => (showAllThemes ? tarotThemeExamples : tarotThemeExamples.slice(0, 1)),
    [showAllThemes]
  )

  const handleDeleteRecent = useCallback(
    (q: string, e: React.MouseEvent) => {
      e.stopPropagation()
      removeRecentQuestion(q)
    },
    [removeRecentQuestion]
  )

  const recommendedSpreads = analysisResult?.recommended_spreads ?? []
  const secondarySpreads = recommendedSpreads.slice(1)
  const questionProfile = analysisResult?.question_profile
  const primaryStableSpread = useMemo(() => {
    const trimmedQuestion = question.trim()
    if (!analysisResult || !trimmedQuestion) {
      return null
    }

    const entry = resolveStableTarotEntry(trimmedQuestion, analysisResult)
    const theme = themeLookup.get(entry.themeId)
    const spread = theme?.spreads.find((item) => item.id === entry.spreadId)
    if (!theme || !spread) {
      return null
    }

    return {
      themeId: entry.themeId,
      spreadId: entry.spreadId,
      themeTitle: isKo ? theme.categoryKo || theme.category : theme.category,
      spreadTitle: isKo ? spread.titleKo || spread.title : spread.title,
      cardCount: spread.cardCount,
    }
  }, [analysisResult, question, themeLookup, isKo])

  return (
    <div className={styles.container}>
      <div className={styles.spaceBackdrop} aria-hidden="true">
        <div className={styles.nebulaLeft} />
        <div className={styles.nebulaRight} />
        <div className={styles.nebulaBottom} />
        <div className={styles.orbLeft} />
        <div className={styles.orbRight} />
        <div className={styles.starMesh} />
      </div>
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
            <header className={styles.header}>
              <div className={styles.iconWrapper}>
                <span className={styles.tarotIcon}>🔮</span>
              </div>
              <h1 className={styles.mainTitle}>{isKo ? 'AI 타로' : 'AI Tarot'}</h1>
              <p className={styles.subtitle}>
                {isKo
                  ? '질문부터 적으면, AI가 의도를 읽고 가장 맞는 스프레드부터 잡아드립니다.'
                  : 'Start with the question. AI reads the intent first and anchors the best spread for you.'}
              </p>
              <p className={styles.supportTags}>
                {isKo ? '사주 · 타로 · 점성술' : 'Saju · Tarot · Astrology'}
              </p>
            </header>

            <div className={`${styles.searchContainer} ${isFocused ? styles.focused : ''}`}>
              <div className={styles.searchBox}>
                <span className={styles.searchIcon} aria-hidden="true">
                  ✨
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  className={styles.searchInput}
                  placeholder={
                    isKo
                      ? '지금 가장 궁금한 질문을 먼저 적어보세요'
                      : 'Write the question you most want answered first'
                  }
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && question.trim() && !isAnalyzing) {
                      handleAnalyzeQuestion()
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
                    aria-label={isKo ? '질문 지우기' : 'Clear question'}
                    type="button"
                  >
                    ✕
                  </button>
                )}
                <button
                  className={styles.submitButton}
                  onClick={() => {
                    triggerHaptic('medium')
                    handleAnalyzeQuestion()
                  }}
                  onTouchStart={handleTouchStart}
                  disabled={!question.trim() || isAnalyzing || !!dangerWarning}
                  type="button"
                  aria-label={isKo ? '질문 분석하기' : 'Analyze question'}
                >
                  {isAnalyzing ? (
                    <span className={styles.loadingSpinner}>⏳</span>
                  ) : (
                    <span aria-hidden="true">➤</span>
                  )}
                </button>
              </div>

              {isLoadingPreview && question.trim().length > 3 && (
                <div className={styles.previewBox}>
                  <div className={styles.previewShimmer}>
                    <span>
                      {isKo ? '질문 의도를 읽는 중...' : 'Reading the intent of your question...'}
                    </span>
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
                  <button
                    type="button"
                    className={styles.fallbackRetryButton}
                    onClick={handleAnalyzeQuestion}
                    disabled={!question.trim() || isAnalyzing}
                  >
                    {isKo ? '다시 분석하기' : 'Retry analysis'}
                  </button>
                </div>
              )}
            </div>

            {analysisResult && !dangerWarning && (
              <section className={styles.analysisPanel}>
                <div className={styles.analysisHeader}>
                  <div className={styles.analysisHeaderCopy}>
                    <span className={styles.previewBadge}>
                      {isKo ? '질문 이해 완료' : 'Question understood'}
                    </span>
                    <h2 className={styles.analysisTitle}>
                      {isKo
                        ? 'AI가 질문을 이렇게 읽고 있어요'
                        : 'Here is how AI is reading your question'}
                    </h2>
                  </div>
                  {analysisResult.intent_label && (
                    <span className={styles.intentPill}>{analysisResult.intent_label}</span>
                  )}
                </div>

                {analysisResult.question_summary && (
                  <p className={styles.analysisSummary}>{analysisResult.question_summary}</p>
                )}
                {questionProfile && (
                  <div className={styles.profileGrid}>
                    <div className={styles.profileItem}>
                      <span className={styles.profileLabel}>
                        {isKo ? '질문 종류' : 'Question type'}
                      </span>
                      <strong className={styles.profileValue}>{questionProfile.type.label}</strong>
                    </div>
                    <div className={styles.profileItem}>
                      <span className={styles.profileLabel}>{isKo ? '주체' : 'Subject'}</span>
                      <strong className={styles.profileValue}>
                        {questionProfile.subject.label}
                      </strong>
                    </div>
                    <div className={styles.profileItem}>
                      <span className={styles.profileLabel}>
                        {isKo ? '무엇을 묻는지' : 'What it asks'}
                      </span>
                      <strong className={styles.profileValue}>{questionProfile.focus.label}</strong>
                    </div>
                    <div className={styles.profileItem}>
                      <span className={styles.profileLabel}>{isKo ? '시간축' : 'Timeframe'}</span>
                      <strong className={styles.profileValue}>
                        {questionProfile.timeframe.label}
                      </strong>
                    </div>
                    <div className={styles.profileItem}>
                      <span className={styles.profileLabel}>{isKo ? '질문 톤' : 'Tone'}</span>
                      <strong className={styles.profileValue}>{questionProfile.tone.label}</strong>
                    </div>
                  </div>
                )}
                {analysisResult.direct_answer && (
                  <div className={styles.directAnswerBox}>
                    <span className={styles.directAnswerLabel}>
                      {isKo ? '스프레드 전 직접답' : 'Direct answer before spread'}
                    </span>
                    <p className={styles.directAnswerText}>{analysisResult.direct_answer}</p>
                  </div>
                )}
                <div className={styles.primaryActionBox}>
                  <div className={styles.primaryActionCopy}>
                    <strong className={styles.primaryActionTitle}>
                      {isKo
                        ? `기본 진입: ${primaryStableSpread?.spreadTitle || analysisResult.spreadTitle} (${primaryStableSpread?.cardCount || analysisResult.cardCount}장)`
                        : `Primary entry: ${primaryStableSpread?.spreadTitle || analysisResult.spreadTitle} (${primaryStableSpread?.cardCount || analysisResult.cardCount} cards)`}
                    </strong>
                    <p className={styles.primaryActionText}>
                      {isKo
                        ? '지금 질문에는 이 스프레드가 가장 자연스럽습니다. 카드 뽑기와 해석 기준도 이 추천에 맞춰 이어집니다.'
                        : 'This is the most natural spread for the current question, and the draw plus interpretation stay aligned to it.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.primaryActionButton}
                    onClick={handleStartPrimaryReading}
                  >
                    {isKo ? '이 추천으로 시작' : 'Start With This'}
                  </button>
                </div>
                <p className={styles.analysisLead}>{analysisResult.userFriendlyExplanation}</p>
                {secondarySpreads.length > 0 && (
                  <div className={styles.secondaryRecommendationSection}>
                    <p className={styles.analysisHint}>
                      {isKo
                        ? '위 추천이 기본 진입이고, 아래 스프레드는 같은 질문을 다른 각도로 보는 대안입니다.'
                        : 'The primary route is above. The spreads below are alternate angles for the same question.'}
                    </p>
                    <div className={styles.secondaryRecommendationHeader}>
                      {isKo ? '추천 스프레드' : 'Recommended Spreads'}
                    </div>
                    <div className={styles.recommendationList}>
                      {secondarySpreads.map((spread, index) => (
                        <button
                          key={`${spread.themeId}-${spread.spreadId}-${index}`}
                          type="button"
                          className={styles.recommendationCard}
                          onClick={() => handleChooseSpread(spread.path)}
                        >
                          <div className={styles.recommendationMeta}>
                            <span className={styles.recommendationBadge}>
                              {isKo ? `후보 ${index + 2}` : `Option ${index + 2}`}
                            </span>
                            <span className={styles.recommendationTheme}>{spread.themeTitle}</span>
                          </div>
                          <div className={styles.recommendationBody}>
                            <strong className={styles.recommendationTitle}>
                              {spread.spreadTitle}
                            </strong>
                            <span className={styles.recommendationCount}>
                              {isKo ? `${spread.cardCount}장 리딩` : `${spread.cardCount} cards`}
                            </span>
                          </div>
                          <p className={styles.recommendationReason}>{spread.reason}</p>
                          <span className={styles.recommendationAction}>
                            {isKo ? '이 스프레드로 시작' : 'Start with this spread'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            <section className={styles.quickStartCard}>
              <p className={styles.quickStartHint}>
                {isKo
                  ? '질문이 아직 흐릿하다면, 먼저 짧은 리딩으로 흐름부터 볼 수 있습니다.'
                  : 'If the question is still blurry, start with a short reading and read the flow first.'}
              </p>
              <button
                type="button"
                className={styles.quickStartButton}
                onClick={handleQuickStart}
                onTouchStart={handleTouchStart}
                disabled={isAnalyzing || !!dangerWarning}
              >
                {isKo ? '빠르게 시작하기' : 'Quick Start'}
              </button>
            </section>

            <section className={styles.themeSection}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  {isKo ? '테마별 질문 예시' : 'Examples by Theme'}
                </h2>
                <p className={styles.sectionSubtitle}>
                  {isKo
                    ? '예시 질문으로 바로 시작해도 됩니다. 누르면 입력창에 바로 들어갑니다.'
                    : 'You can start with any example below. Tapping it fills the input instantly.'}
                </p>
              </div>
              <div className={styles.themeGrid}>
                {visibleThemeExamples.map((group) => {
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
                        {group.questions.map((themeQuestion, index) => (
                          <button
                            key={`${group.themeId}-${index}`}
                            className={styles.themeQuestion}
                            onClick={() =>
                              handleThemeQuestion(isKo ? themeQuestion.ko : themeQuestion.en)
                            }
                            onTouchStart={handleTouchStart}
                            disabled={isAnalyzing}
                            type="button"
                          >
                            {isKo ? themeQuestion.ko : themeQuestion.en}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
              {tarotThemeExamples.length > 2 && (
                <button
                  type="button"
                  className={styles.moreThemesButton}
                  onClick={() => setShowAllThemes((prev) => !prev)}
                  onTouchStart={handleTouchStart}
                >
                  {showAllThemes
                    ? isKo
                      ? '테마 접기'
                      : 'Show less themes'
                    : isKo
                      ? '테마 더보기'
                      : 'Show more themes'}
                </button>
              )}
            </section>

            {recentQuestions.length > 0 && (
              <div className={styles.recentSection}>
                <p className={styles.recentLabel}>{isKo ? '최근 질문' : 'Recent'}</p>
                <div className={styles.recentList}>
                  {recentQuestions.map((recentQuestion, index) => (
                    <div key={index} className={styles.recentItem} role="group">
                      <button
                        className={styles.recentItemButton}
                        onClick={() => handleRecentQuestion(recentQuestion)}
                        disabled={isAnalyzing}
                        type="button"
                      >
                        <span className={styles.recentIcon}>🕐</span>
                        <span className={styles.recentText}>{recentQuestion}</span>
                      </button>
                      <button
                        className={styles.recentDelete}
                        onClick={(event) => handleDeleteRecent(recentQuestion, event)}
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
