'use client';

import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PersonaQuiz from '@/components/persona/PersonaQuiz';
import type { PersonaQuizAnswers } from '@/lib/persona/types';
import { TOTAL_QUESTIONS, questions, type PersonaQuestion } from '@/lib/persona/questions';
import { useI18n } from '@/i18n/I18nProvider';
import BackButton from '@/components/ui/BackButton';
import styles from '../Personality.module.css';

const QUESTIONS_PER_PAGE = 10;

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function QuizPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [answers, setAnswers] = useState<PersonaQuizAnswers>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [shuffledQuestions, setShuffledQuestions] = useState<PersonaQuestion[]>([]);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const questionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Shuffle questions on mount (client-side only)
  useEffect(() => {
    setShuffledQuestions(shuffleArray(questions));
  }, []);

  // Scroll to top handler
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Scroll to top button visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const progress = Object.keys(answers).length;
  const isQuizComplete = progress === TOTAL_QUESTIONS;
  const progressPercent = Math.round((progress / TOTAL_QUESTIONS) * 100);

  const totalPages = Math.ceil(TOTAL_QUESTIONS / QUESTIONS_PER_PAGE);
  const startIndex = currentPage * QUESTIONS_PER_PAGE;
  const endIndex = Math.min(startIndex + QUESTIONS_PER_PAGE, TOTAL_QUESTIONS);
  const currentQuestions = shuffledQuestions.slice(startIndex, endIndex);

  // Check if all questions on current page are answered
  const currentPageAnswered = currentQuestions.every(q => answers[q.id]);

  const handleAnswerChange = (questionId: string, answerId: string) => {
    setAnswers((prev: PersonaQuizAnswers) => ({ ...prev, [questionId]: answerId }));
  };

  const handleViewResults = () => {
    localStorage.setItem('personaQuizAnswers', JSON.stringify(answers));
    router.push('/personality/result');
  };

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
            <div className={styles.icon}>✨</div>
            <p className={styles.subtitle}>{t('personality.loading', 'Preparing your questions...')}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      {/* Back Button */}
      <div className={styles.backButton}>
        <BackButton />
      </div>

      {/* Background Stars - deterministic positions to avoid hydration mismatch */}
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
          <div className={styles.icon}>✨</div>
          <h1 className={styles.title}>{t('personality.auraDiscovery', 'Aura Discovery')}</h1>
          <p className={styles.subtitle}>{t('personality.answerHonestly', 'Answer honestly to reveal your inner landscape.')}</p>
        </div>

        {/* Progress Bar */}
        <div className={styles.progressContainer}>
          <div className={styles.progressHeader}>
            <span className={styles.progressLabel}>{t('personality.progress', 'Progress')}</span>
            <span className={styles.progressPercent}>{progress} / {TOTAL_QUESTIONS}</span>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        {/* Page Progress Indicators */}
        <div className={styles.pageProgress}>
          {Array.from({ length: totalPages }).map((_, pageIndex) => {
            const pageStart = pageIndex * QUESTIONS_PER_PAGE;
            const pageEnd = Math.min(pageStart + QUESTIONS_PER_PAGE, TOTAL_QUESTIONS);
            const pageQuestions = shuffledQuestions.slice(pageStart, pageEnd);
            const pageComplete = pageQuestions.every(q => answers[q.id]);
            const isCurrent = pageIndex === currentPage;

            return (
              <button
                key={pageIndex}
                onClick={() => goToPage(pageIndex)}
                className={`${styles.pageDot} ${isCurrent ? styles.pageDotCurrent : ''} ${pageComplete ? styles.pageDotComplete : ''}`}
                title={`${t('personality.page', 'Page')} ${pageIndex + 1}${pageComplete ? ' ✓' : ''}`}
              >
                {pageIndex + 1}
              </button>
            );
          })}
        </div>

        {/* Current Page Info */}
        <div className={styles.pageInfo}>
          {t('personality.pageOf', 'Page {{current}} of {{total}}')
            .replace('{{current}}', String(currentPage + 1))
            .replace('{{total}}', String(totalPages))}
          {' • '}
          {t('personality.questionsRange', 'Questions {{start}}-{{end}}')
            .replace('{{start}}', String(startIndex + 1))
            .replace('{{end}}', String(endIndex))}
        </div>

        {/* Quiz - current page questions only */}
        <PersonaQuiz
          answers={answers}
          onAnswerChange={handleAnswerChange}
          questionRefs={questionRefs}
          questions={currentQuestions}
          startIndex={startIndex}
        />

        {/* Page Navigation */}
        <div className={styles.pageNavigation}>
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 0}
            className={`${styles.navButton} ${currentPage === 0 ? styles.navButtonDisabled : ''}`}
          >
            ← {t('personality.previous', 'Previous')}
          </button>

          {currentPage < totalPages - 1 ? (
            <button
              onClick={handleNextPage}
              disabled={!currentPageAnswered}
              className={`${styles.navButton} ${styles.navButtonPrimary} ${!currentPageAnswered ? styles.navButtonDisabled : ''}`}
            >
              {t('personality.next', 'Next')} →
            </button>
          ) : (
            <button
              onClick={handleViewResults}
              disabled={!isQuizComplete}
              className={`${styles.submitButton} ${!isQuizComplete ? styles.navButtonDisabled : ''}`}
            >
              {t('personality.calculateMyAura', 'Calculate My Aura')}
            </button>
          )}
        </div>
      </div>

      {/* Scroll to Top Button */}
      <button
        className={`${styles.scrollToTop} ${showScrollTop ? styles.visible : ''}`}
        onClick={scrollToTop}
        aria-label={t('common.scrollToTop', 'Back to Top')}
      >
        <span className={styles.scrollToTopIcon}>↑</span>
      </button>
    </main>
  );
}
