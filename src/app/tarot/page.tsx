'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import Image from 'next/image'
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
import { DECK_STYLES, DECK_STYLE_INFO, type DeckStyle } from '@/lib/Tarot/tarot.types'
import styles from './tarot-home.module.css'
import { useCanvasAnimation, useRecentQuestions, useQuestionAnalysis } from './hooks'
import { getQuickRecommendation } from './utils/recommendations'
import { useTapFeedback, useHapticFeedback } from '@/hooks/useMobileEnhancements'

const TONE_OPTIONS = [
  { id: 'gentle', icon: '🌙', ko: '다정', en: 'Gentle' },
  { id: 'direct', icon: '⚡', ko: '직설', en: 'Direct' },
  { id: 'mystic', icon: '🔮', ko: '신비', en: 'Mystic' },
] as const

type ToneId = (typeof TONE_OPTIONS)[number]['id']
type SpreadMode = 'auto' | 'manual'

const TAROT_DECK_PREF_KEY = 'tarot_preferred_deck'
const TAROT_TONE_PREF_KEY = 'tarot_tone_preference'

const pageTransitionVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
}

export default function TarotHomePage() {
  const { language } = useI18n()
  const router = useRouter()
  const isKo = language === 'ko'
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const themeLookup = useMemo(() => new Map(tarotThemes.map((theme) => [theme.id, theme])), [])

  const [question, setQuestion] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [preferredDeck, setPreferredDeck] = useState<DeckStyle | null>(null)
  const [showDeckPicker, setShowDeckPicker] = useState(false)
  const [showExamples, setShowExamples] = useState(false)
  const [toneIndex, setToneIndex] = useState(0)
  const [spreadMode, setSpreadMode] = useState<SpreadMode>('auto')

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const savedDeck = localStorage.getItem(TAROT_DECK_PREF_KEY) as DeckStyle | null
      if (savedDeck && DECK_STYLES.includes(savedDeck)) {
        setPreferredDeck(savedDeck)
      }
      const savedTone = localStorage.getItem(TAROT_TONE_PREF_KEY) as ToneId | null
      const idx = TONE_OPTIONS.findIndex((t) => t.id === savedTone)
      if (idx >= 0) setToneIndex(idx)
    } catch {
      // ignore
    }
  }, [])

  const tone = TONE_OPTIONS[toneIndex]

  const handleSelectDeck = useCallback((deck: DeckStyle) => {
    setPreferredDeck(deck)
    setShowDeckPicker(false)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(TAROT_DECK_PREF_KEY, deck)
      } catch {
        // ignore
      }
    }
  }, [])

  const handleCycleTone = useCallback(() => {
    setToneIndex((prev) => {
      const next = (prev + 1) % TONE_OPTIONS.length
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(TAROT_TONE_PREF_KEY, TONE_OPTIONS[next].id)
        } catch {
          // ignore
        }
      }
      return next
    })
  }, [])

  const handleToggleSpreadMode = useCallback(() => {
    setSpreadMode((prev) => (prev === 'auto' ? 'manual' : 'auto'))
  }, [])

  const inlineExampleQuestions = useMemo(() => {
    const collected: string[] = []
    for (const group of tarotThemeExamples) {
      for (const q of group.questions) {
        const text = isKo ? q.ko : q.en
        if (text && !collected.includes(text)) {
          collected.push(text)
          if (collected.length >= 8) break
        }
      }
      if (collected.length >= 8) break
    }
    return collected
  }, [isKo])

  const canvasRef = useCanvasAnimation()
  const { recentQuestions, addRecentQuestion, removeRecentQuestion } = useRecentQuestions()
  const {
    analysisResult,
    dangerWarning,
    isAnalyzing,
    isLoadingPreview,
    handleStartReading: analyzeQuestion,
  } = useQuestionAnalysis({ question, language, isKo, getQuickRecommendation })

  const handleTouchStart = useTapFeedback()
  const triggerHaptic = useHapticFeedback()

  const handleAnalyzeQuestion = useCallback(() => {
    const trimmedQuestion = question.trim()
    if (!trimmedQuestion) return
    addRecentQuestion(trimmedQuestion)

    // Kick off AI analysis in the background so the snapshot is warm
    // when the reading page mounts; do not block navigation on it.
    void analyzeQuestion()

    const analysisKey = storeQuestionAnalysisSnapshot(trimmedQuestion, analysisResult)
    const primaryPath =
      analysisResult?.path && analysisResult.source !== 'fallback'
        ? appendQuestionContextToPath(analysisResult.path, trimmedQuestion, analysisKey)
        : buildStableEntryPath(trimmedQuestion, analysisResult, analysisKey)
    router.push(primaryPath)
  }, [question, addRecentQuestion, analyzeQuestion, analysisResult, router])

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

  const handleDeleteRecent = useCallback(
    (q: string, e: React.MouseEvent) => {
      e.stopPropagation()
      removeRecentQuestion(q)
    },
    [removeRecentQuestion]
  )

  const recommendedSpreads = analysisResult?.recommended_spreads ?? []
  const secondarySpreads = recommendedSpreads.slice(1)
  const primaryEntryDisplay = useMemo(() => {
    if (!analysisResult) {
      return null
    }

    const entry =
      analysisResult.source === 'fallback'
        ? resolveStableTarotEntry(question.trim(), analysisResult)
        : {
            themeId: analysisResult.themeId,
            spreadId: analysisResult.spreadId,
          }
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
              <div className={styles.composer}>
                <div className={styles.composerTopRow}>
                  <button
                    type="button"
                    className={`${styles.composerPill} ${preferredDeck ? styles.composerPillActive : ''}`}
                    onClick={() => setShowDeckPicker((v) => !v)}
                    aria-expanded={showDeckPicker}
                  >
                    <span aria-hidden="true">🎴</span>
                    <span>
                      {preferredDeck
                        ? isKo
                          ? DECK_STYLE_INFO[preferredDeck].nameKo
                          : DECK_STYLE_INFO[preferredDeck].name
                        : isKo
                          ? '덱 선택'
                          : 'Pick deck'}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.composerPill} ${showExamples ? styles.composerPillActive : ''}`}
                    onClick={() => setShowExamples((v) => !v)}
                    aria-expanded={showExamples}
                  >
                    <span aria-hidden="true">💡</span>
                    <span>{isKo ? '예시 질문' : 'Examples'}</span>
                  </button>
                </div>

                {showExamples && (
                  <div className={styles.composerDeckPicker} role="listbox">
                    {inlineExampleQuestions.map((q, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={styles.composerDeckOption}
                        onClick={() => {
                          handleThemeQuestion(q)
                          setShowExamples(false)
                        }}
                        role="option"
                      >
                        <span className={styles.composerDeckName}>{q}</span>
                      </button>
                    ))}
                  </div>
                )}

                {showDeckPicker && (
                  <div
                    className={styles.deckModalOverlay}
                    onClick={(e) => {
                      if (e.target === e.currentTarget) setShowDeckPicker(false)
                    }}
                  >
                    <div
                      className={styles.deckModal}
                      role="dialog"
                      aria-modal="true"
                      aria-label={isKo ? '덱 선택' : 'Pick deck'}
                    >
                      <div className={styles.deckModalHeader}>
                        <h2 className={styles.deckModalTitle}>
                          {isKo ? '덱 선택' : 'Pick a deck'}
                        </h2>
                        <button
                          type="button"
                          className={styles.deckModalClose}
                          onClick={() => setShowDeckPicker(false)}
                          aria-label={isKo ? '닫기' : 'Close'}
                        >
                          ×
                        </button>
                      </div>
                      <div className={styles.deckModalGrid} role="listbox">
                        {DECK_STYLES.map((deck) => {
                          const info = DECK_STYLE_INFO[deck]
                          const active = preferredDeck === deck
                          return (
                            <button
                              key={deck}
                              type="button"
                              className={`${styles.deckCard} ${active ? styles.deckCardActive : ''}`}
                              onClick={() => handleSelectDeck(deck)}
                              role="option"
                              aria-selected={active}
                            >
                              <span
                                className={styles.deckCardThumb}
                                style={{ background: info.gradient }}
                                aria-hidden="true"
                              >
                                {info.backImage && (
                                  <Image
                                    src={info.backImage}
                                    alt=""
                                    fill
                                    sizes="(max-width: 540px) 45vw, 200px"
                                    className={styles.deckCardImage}
                                    priority={false}
                                  />
                                )}
                                {active && (
                                  <span className={styles.deckCardCheck} aria-hidden="true">
                                    ✓
                                  </span>
                                )}
                              </span>
                              <span className={styles.deckCardName}>
                                {isKo ? info.nameKo : info.name}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                <textarea
                  ref={inputRef}
                  className={styles.composerInput}
                  rows={2}
                  placeholder={
                    isKo
                      ? '고민을 한 줄로 적어주세요. AI가 어울리는 스프레드를 골라드려요.'
                      : 'Write your question. AI will pick a fitting spread for you.'
                  }
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  onKeyDown={(event) => {
                    if (
                      event.key === 'Enter' &&
                      !event.shiftKey &&
                      question.trim() &&
                      !isAnalyzing
                    ) {
                      event.preventDefault()
                      handleAnalyzeQuestion()
                    }
                  }}
                  disabled={isAnalyzing}
                  aria-label={isKo ? '타로 질문 입력' : 'Enter your tarot question'}
                />

                <div className={styles.composerBottomRow}>
                  <div className={styles.composerToolGroup}>
                    <button
                      type="button"
                      className={styles.composerTool}
                      onClick={handleToggleSpreadMode}
                      aria-pressed={spreadMode === 'manual'}
                    >
                      <span aria-hidden="true">✨</span>
                      <span>
                        {spreadMode === 'auto'
                          ? isKo
                            ? '스프레드 자동'
                            : 'Auto spread'
                          : isKo
                            ? '스프레드 직접'
                            : 'Manual spread'}
                      </span>
                    </button>
                    <button
                      type="button"
                      className={styles.composerTool}
                      onClick={handleCycleTone}
                    >
                      <span aria-hidden="true">{tone.icon}</span>
                      <span>{isKo ? tone.ko : tone.en}</span>
                    </button>
                    {question && !isAnalyzing && (
                      <button
                        type="button"
                        className={styles.composerClear}
                        onClick={() => setQuestion('')}
                        aria-label={isKo ? '질문 지우기' : 'Clear question'}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <button
                    className={styles.composerSend}
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
                      <span aria-hidden="true">↑</span>
                    )}
                  </button>
                </div>
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

              {/* Fallback notice intentionally suppressed: when AI takes a
                  while, the page still navigates to a sensible spread. We
                  do not want to scare the user with a yellow warning. */}
            </div>

            {analysisResult && !dangerWarning && (
              <section className={styles.analysisPanel}>
                <div className={styles.primaryActionBox}>
                  <div className={styles.primaryActionCopy}>
                    <strong className={styles.primaryActionTitle}>
                      {isKo
                        ? `${primaryEntryDisplay?.spreadTitle || analysisResult.spreadTitle} (${primaryEntryDisplay?.cardCount || analysisResult.cardCount}장)`
                        : `${primaryEntryDisplay?.spreadTitle || analysisResult.spreadTitle} (${primaryEntryDisplay?.cardCount || analysisResult.cardCount} cards)`}
                    </strong>
                    {analysisResult.question_summary && (
                      <p className={styles.primaryActionText}>
                        {analysisResult.question_summary}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    className={styles.primaryActionButton}
                    onClick={handleStartPrimaryReading}
                  >
                    {isKo ? '시작' : 'Start'}
                  </button>
                </div>

                {analysisResult.direct_answer && (
                  <div className={styles.directAnswerBox}>
                    <span className={styles.directAnswerLabel}>
                      {isKo ? '한 줄 답' : 'Quick answer'}
                    </span>
                    <p className={styles.directAnswerText}>{analysisResult.direct_answer}</p>
                  </div>
                )}

                {analysisResult.requires_confirmation && (
                  <div className={styles.confirmStrip} role="status">
                    <span className={styles.confirmBadge}>
                      {isKo ? '해석 확인' : 'Interpretation check'}
                    </span>
                    <p className={styles.confirmText}>
                      {analysisResult.assumption ||
                        (isKo
                          ? '질문이 짧거나 모호해서 가장 가능성 높은 의도로 해석했어요. 의도가 다르면 아래 추천 스프레드 중에서 직접 골라주세요.'
                          : 'The question is brief or ambiguous, so I picked the most likely intent. If that does not match, choose another spread below.')}
                    </p>
                  </div>
                )}
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
