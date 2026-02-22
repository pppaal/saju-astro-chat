'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { logger } from '@/lib/logger'

import { useRouter } from 'next/navigation'
import { TOTAL_ICP_QUESTIONS, icpQuestions, type ICPQuestion } from '@/lib/icp/questions'
import type { ICPQuizAnswers } from '@/lib/icp/types'
import { useI18n } from '@/i18n/I18nProvider'
import BackButton from '@/components/ui/BackButton'
import { useToast } from '@/components/ui/Toast'
import styles from '../ICP.module.css'

const QUESTIONS_PER_PAGE = 8
const ICP_TEST_VERSION = 'icp_v2'

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export default function ICPQuizPage() {
  const { locale } = useI18n()
  const isKo = locale === 'ko'
  const router = useRouter()
  const { showToast } = useToast()
  const [answers, setAnswers] = useState<ICPQuizAnswers>({})
  const [currentPage, setCurrentPage] = useState(0)
  const [shuffledQuestions, setShuffledQuestions] = useState<ICPQuestion[]>([])
  const [showScrollTop, setShowScrollTop] = useState(false)
  const questionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  const sendAnalytics = useCallback((payload: Record<string, unknown>) => {
    const body = JSON.stringify({
      testVersion: ICP_TEST_VERSION,
      ...payload,
    })

    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: 'application/json' })
        navigator.sendBeacon('/api/icp/analytics', blob)
        return
      }
    } catch {
      // fall through to fetch
    }

    fetch('/api/icp/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {})
  }, [])

  // Shuffle questions on mount (client-side only) and restore saved progress
  useEffect(() => {
    if (!localStorage.getItem('icpQuizStartedAt')) {
      localStorage.setItem('icpQuizStartedAt', String(Date.now()))
    }

    // Check for saved shuffle order
    const savedOrder = localStorage.getItem('icpQuizOrder')
    const savedAnswers = localStorage.getItem('icpQuizAnswers')
    const savedPage = localStorage.getItem('icpQuizPage')

    if (savedOrder) {
      try {
        const order = JSON.parse(savedOrder) as string[]
        // Reconstruct question order from saved IDs
        const ordered = order
          .map((id) => icpQuestions.find((q) => q.id === id))
          .filter((q): q is ICPQuestion => q !== undefined)
        if (ordered.length === icpQuestions.length) {
          setShuffledQuestions(ordered)
        } else {
          // Saved order is invalid, create new shuffle
          const newOrder = shuffleArray(icpQuestions)
          setShuffledQuestions(newOrder)
          localStorage.setItem('icpQuizOrder', JSON.stringify(newOrder.map((q) => q.id)))
        }
      } catch {
        const newOrder = shuffleArray(icpQuestions)
        setShuffledQuestions(newOrder)
        localStorage.setItem('icpQuizOrder', JSON.stringify(newOrder.map((q) => q.id)))
      }
    } else {
      const newOrder = shuffleArray(icpQuestions)
      setShuffledQuestions(newOrder)
      localStorage.setItem('icpQuizOrder', JSON.stringify(newOrder.map((q) => q.id)))
    }

    // Restore saved answers (in progress)
    if (savedAnswers) {
      try {
        const parsed = JSON.parse(savedAnswers)
        // Only restore if it's not a complete quiz (user might want to retake)
        if (Object.keys(parsed).length < icpQuestions.length) {
          setAnswers(parsed)
        }
      } catch {
        // Invalid saved answers, start fresh
      }
    }

    // Restore saved page
    if (savedPage) {
      try {
        const page = parseInt(savedPage, 10)
        if (
          !isNaN(page) &&
          page >= 0 &&
          page < Math.ceil(icpQuestions.length / QUESTIONS_PER_PAGE)
        ) {
          setCurrentPage(page)
        }
      } catch {
        // Invalid saved page
      }
    }
  }, [])

  // Scroll to top handler
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // Scroll to top button visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Auto scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [currentPage])

  const progress = Object.keys(answers).length
  const isQuizComplete = progress === TOTAL_ICP_QUESTIONS
  const progressPercent = Math.round((progress / TOTAL_ICP_QUESTIONS) * 100)

  const totalPages = Math.ceil(TOTAL_ICP_QUESTIONS / QUESTIONS_PER_PAGE)
  const startIndex = currentPage * QUESTIONS_PER_PAGE
  const endIndex = Math.min(startIndex + QUESTIONS_PER_PAGE, TOTAL_ICP_QUESTIONS)
  const currentQuestions = shuffledQuestions.slice(startIndex, endIndex)

  // Check if all questions on current page are answered
  const currentPageAnswered = currentQuestions.every((q) => answers[q.id])
  const currentPageAnsweredCount = currentQuestions.filter((q) => Boolean(answers[q.id])).length

  const handleAnswerChange = (questionId: string, answerId: string) => {
    setAnswers((prev: ICPQuizAnswers) => {
      const updated = { ...prev, [questionId]: answerId }
      if (!prev[questionId]) {
        sendAnalytics({
          event: 'answer_selected',
          questionId,
          answerId,
          progressAfter: Object.keys(updated).length,
        })
      }
      // Auto-save answers to localStorage
      localStorage.setItem('icpQuizAnswers', JSON.stringify(updated))
      return updated
    })
  }

  // Auto-save current page when it changes
  useEffect(() => {
    if (shuffledQuestions.length > 0) {
      localStorage.setItem('icpQuizPage', String(currentPage))
      const unansweredOnPage = currentQuestions.filter((q) => !answers[q.id]).length
      sendAnalytics({
        event: 'page_view',
        page: currentPage + 1,
        progress,
        unansweredOnPage,
      })
    }
  }, [currentPage, shuffledQuestions.length, currentQuestions, answers, progress, sendAnalytics])

  const handleViewResults = () => {
    try {
      const completedAt = Date.now()
      localStorage.setItem('icpQuizCompletedAt', String(completedAt))
      const startedAt = Number(localStorage.getItem('icpQuizStartedAt') || completedAt)
      const completionSeconds = Math.max(0, Math.round((completedAt - startedAt) / 1000))
      const answersData = JSON.stringify(answers)
      localStorage.setItem('icpQuizAnswers', answersData)
      // Clear progress tracking (order and page) after completion
      localStorage.removeItem('icpQuizOrder')
      localStorage.removeItem('icpQuizPage')
      sendAnalytics({
        event: 'quiz_complete',
        completionSeconds,
        totalAnswered: Object.keys(answers).length,
      })
      router.push('/icp/result')
    } catch (error) {
      logger.error('[ICP Quiz] Error saving answers:', error)
      showToast(
        isKo ? '결과 저장 중 오류가 발생했습니다.' : 'Error saving results. Please try again.',
        'error'
      )
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage((prev) => prev + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage((prev) => prev - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const goToPage = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Show loading state while shuffling
  if (shuffledQuestions.length === 0) {
    return (
      <main className={styles.page}>
        <div className={styles.stars}>
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className={styles.star}
              style={{
                left: `${(i * 37 + 13) % 100}%`,
                top: `${(i * 53 + 7) % 100}%`,
                animationDelay: `${(i * 0.08) % 4}s`,
              }}
            />
          ))}
        </div>
        <div className={styles.quizCard}>
          <div className={styles.header}>
            <div className={styles.icon}>🎭</div>
            <p className={styles.subtitle}>
              {isKo ? '질문을 준비하고 있습니다...' : 'Preparing your questions...'}
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      {/* Back Button */}
      <div className={styles.backButton}>
        <BackButton />
      </div>

      {/* Background Stars */}
      <div className={styles.stars}>
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className={styles.star}
            style={{
              left: `${(i * 37 + 13) % 100}%`,
              top: `${(i * 53 + 7) % 100}%`,
              animationDelay: `${(i * 0.08) % 4}s`,
            }}
          />
        ))}
      </div>

      <div className={styles.quizCard}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.icon}>🎭</div>
          <h1 className={styles.title}>
            {isKo ? '대인관계 스타일 진단' : 'Interpersonal Style Assessment'}
          </h1>
          <p className={styles.subtitle}>
            {isKo ? '솔직하게 답변해주세요.' : 'Answer honestly to reveal your style.'}
          </p>
          <p className={styles.readabilityHint}>
            {isKo
              ? '오래 고민하기보다, 평소 대인관계에서의 나와 가장 가까운 답을 선택해 주세요.'
              : 'Pick the option that best matches your usual interpersonal pattern.'}
          </p>
        </div>

        {/* Progress Bar */}
        <div className={styles.progressContainer}>
          <div className={styles.progressHeader}>
            <span className={styles.progressLabel}>{isKo ? '진행률' : 'Progress'}</span>
            <span className={styles.progressPercent}>
              {progress} / {TOTAL_ICP_QUESTIONS}
            </span>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        {/* Page Progress Indicators */}
        <div className={styles.pageProgress}>
          {Array.from({ length: totalPages }).map((_, pageIndex) => {
            const pageStart = pageIndex * QUESTIONS_PER_PAGE
            const pageEnd = Math.min(pageStart + QUESTIONS_PER_PAGE, TOTAL_ICP_QUESTIONS)
            const pageQuestions = shuffledQuestions.slice(pageStart, pageEnd)
            const pageComplete = pageQuestions.every((q) => answers[q.id])
            const isCurrent = pageIndex === currentPage

            return (
              <button
                key={pageIndex}
                onClick={() => goToPage(pageIndex)}
                className={`${styles.pageDot} ${isCurrent ? styles.pageDotCurrent : ''} ${pageComplete ? styles.pageDotComplete : ''}`}
                title={`${isKo ? '페이지' : 'Page'} ${pageIndex + 1}${pageComplete ? ' ✓' : ''}`}
              >
                {pageIndex + 1}
              </button>
            )
          })}
        </div>

        {/* Current Page Info */}
        <div className={styles.pageInfo}>
          {isKo
            ? `페이지 ${currentPage + 1} / ${totalPages} | 문항 ${startIndex + 1}-${endIndex} | 페이지 내 응답 ${currentPageAnsweredCount}/${currentQuestions.length}`
            : `Page ${currentPage + 1} of ${totalPages} | Questions ${startIndex + 1}-${endIndex} | Answered on page ${currentPageAnsweredCount}/${currentQuestions.length}`}
        </div>

        {/* Questions */}
        {currentQuestions.map((question, idx) => {
          const questionNumber = startIndex + idx + 1
          const selectedAnswer = answers[question.id]

          return (
            <div
              key={question.id}
              ref={(el) => {
                questionRefs.current[question.id] = el
              }}
              className={styles.questionCard}
            >
              <div className={styles.questionNumber}>
                {isKo ? `문항 ${questionNumber}` : `Question ${questionNumber}`}
              </div>
              <p className={styles.questionText}>{isKo ? question.textKo : question.text}</p>
              <div className={styles.options}>
                {question.options.map((option) => (
                  <div
                    key={option.id}
                    onClick={() => handleAnswerChange(question.id, option.id)}
                    className={`${styles.option} ${selectedAnswer === option.id ? styles.optionSelected : ''}`}
                  >
                    <div className={styles.optionRadio} />
                    <span className={styles.optionText}>{isKo ? option.textKo : option.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {/* Page Navigation */}
        <div className={styles.pageNavigation}>
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 0}
            className={`${styles.navButton} ${currentPage === 0 ? styles.navButtonDisabled : ''}`}
          >
            ← {isKo ? '이전' : 'Previous'}
          </button>

          {currentPage < totalPages - 1 ? (
            <button
              onClick={handleNextPage}
              disabled={!currentPageAnswered}
              className={`${styles.navButton} ${styles.navButtonPrimary} ${!currentPageAnswered ? styles.navButtonDisabled : ''}`}
            >
              {isKo ? '다음' : 'Next'} →
            </button>
          ) : (
            <button
              onClick={handleViewResults}
              disabled={!isQuizComplete}
              className={`${styles.submitButton} ${!isQuizComplete ? styles.navButtonDisabled : ''}`}
            >
              {isKo ? '결과 확인하기' : 'See My Results'}
            </button>
          )}
        </div>
      </div>

      {/* Scroll to Top Button */}
      <button
        className={`${styles.scrollToTop} ${showScrollTop ? styles.visible : ''}`}
        onClick={scrollToTop}
        aria-label={isKo ? '맨 위로' : 'Back to Top'}
      >
        <span className={styles.scrollToTopIcon}>↑</span>
      </button>
    </main>
  )
}
