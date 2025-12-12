'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AuraQuiz from '@/components/aura/AuraQuiz';
import type { AuraQuizAnswers } from '@/lib/aura/types';
import { TOTAL_QUESTIONS, questions } from '@/lib/aura/questions';
import { useI18n } from '@/i18n/I18nProvider';
import BackButton from '@/components/ui/BackButton';
import styles from '../Personality.module.css';

export default function QuizPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [answers, setAnswers] = useState<AuraQuizAnswers>({});
  const questionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const progress = Object.keys(answers).length;
  const isQuizComplete = progress === TOTAL_QUESTIONS;
  const progressPercent = Math.round((progress / TOTAL_QUESTIONS) * 100);

  const handleAnswerChange = (questionId: string, answerId: string) => {
    setAnswers((prev: AuraQuizAnswers) => ({ ...prev, [questionId]: answerId }));
  };

  const handleViewResults = () => {
    localStorage.setItem('auraQuizAnswers', JSON.stringify(answers));
    router.push('/personality/result');
  };

  const scrollToQuestion = (questionId: string) => {
    const element = questionRefs.current[questionId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

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

        {/* Question Progress Indicators */}
        <div className={styles.questionProgress}>
          {questions.map((q, index) => {
            const isAnswered = !!answers[q.id];
            return (
              <button
                key={q.id}
                onClick={() => scrollToQuestion(q.id)}
                className={`${styles.questionDot} ${isAnswered ? styles.questionDotAnswered : ''}`}
                title={`${t('personality.question', 'Question')} ${index + 1}${isAnswered ? ' ✓' : ''}`}
              >
                {index + 1}
              </button>
            );
          })}
        </div>

        {/* Quiz */}
        <AuraQuiz
          answers={answers}
          onAnswerChange={handleAnswerChange}
          questionRefs={questionRefs}
        />

        {/* Submit Button */}
        {isQuizComplete && (
          <button onClick={handleViewResults} className={styles.submitButton}>
            {t('personality.calculateMyAura', 'Calculate My Aura')}
          </button>
        )}
      </div>
    </main>
  );
}
