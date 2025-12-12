'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AuraQuiz from '@/components/aura/AuraQuiz';
import type { AuraQuizAnswers } from '@/lib/aura/types';
import { TOTAL_QUESTIONS } from '@/lib/aura/questions';
import styles from '../Personality.module.css';

export default function QuizPage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<AuraQuizAnswers>({});
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

  return (
    <main className={styles.page}>
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

      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.icon}>✨</div>
          <h1 className={styles.title}>Aura Discovery</h1>
          <p className={styles.subtitle}>Answer honestly to reveal your inner landscape.</p>
        </div>

        {/* Progress Bar */}
        <div className={styles.progressContainer}>
          <div className={styles.progressHeader}>
            <span className={styles.progressLabel}>Progress</span>
            <span className={styles.progressPercent}>{progress} / {TOTAL_QUESTIONS}</span>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        {/* Quiz */}
        <AuraQuiz answers={answers} onAnswerChange={handleAnswerChange} />

        {/* Submit Button */}
        {isQuizComplete && (
          <button onClick={handleViewResults} className={styles.submitButton}>
            Calculate My Aura
          </button>
        )}
      </div>
    </main>
  );
}
