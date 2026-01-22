/**
 * ResultsPhase Component
 *
 * Fourth phase: Display prediction results with sharing and chat options.
 */

'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { PredictionChat } from '@/components/life-prediction/PredictionChat';
import { TimingCard, TimingPeriod } from '@/components/life-prediction/ResultCards/TimingCard';
import { EventType } from '@/components/life-prediction/PredictionChat/hooks/useEventTypeDetector';
import { BirthInfoDisplay } from '../components/BirthInfoDisplay';
import { QuestionDisplay } from '../components/QuestionDisplay';
import { ResultsHeaderCard } from '../components/ResultsHeaderCard';
import { AskAgainButton } from '../components/AskAgainButton';
import { cardContainerVariants, pageTransitionVariants } from '@/components/life-prediction/animations/cardAnimations';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import styles from '../life-prediction.module.css';

// Dynamic imports for heavy components
const AdvisorChat = dynamic(
  () => import('@/components/life-prediction/AdvisorChat').then((mod) => mod.default),
  { ssr: false }
);

const ResultShare = dynamic(
  () => import('@/components/life-prediction/ResultShare').then((mod) => mod.default),
  { ssr: false }
);

interface ResultsPhaseProps {
  /** Birth date */
  birthDate?: string;
  /** Gender */
  gender?: 'M' | 'F';
  /** Current question */
  currentQuestion: string;
  /** Current event type */
  currentEventType: EventType | null;
  /** Prediction results */
  results: TimingPeriod[];
  /** Locale for text */
  locale: 'ko' | 'en';
  /** Is user authenticated */
  isAuthenticated: boolean;
  /** Change birth info handler */
  onChangeBirthInfo: () => void;
  /** Submit new question handler */
  onSubmit: (question: string, eventType: EventType | null) => Promise<void>;
  /** Ask again handler */
  onAskAgain: () => void;
}

/**
 * Results phase component
 *
 * @example
 * ```tsx
 * <ResultsPhase
 *   birthDate="1990-01-15"
 *   gender="M"
 *   currentQuestion="When should I get married?"
 *   currentEventType="marriage"
 *   results={results}
 *   locale="ko"
 *   isAuthenticated={true}
 *   onChangeBirthInfo={handleChange}
 *   onSubmit={handleSubmit}
 *   onAskAgain={handleAskAgain}
 * />
 * ```
 */
export const ResultsPhase = React.memo<ResultsPhaseProps>(
  ({
    birthDate,
    gender,
    currentQuestion,
    currentEventType,
    results,
    locale,
    isAuthenticated,
    onChangeBirthInfo,
    onSubmit,
    onAskAgain,
  }) => {
    return (
      <motion.div
        key="result"
        variants={pageTransitionVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={styles.phaseContainer}
      >
        {/* Birth info display */}
        {birthDate && gender && (
          <BirthInfoDisplay
            birthDate={birthDate}
            gender={gender}
            onChangeClick={onChangeBirthInfo}
            locale={locale}
          />
        )}

        {/* Compact search bar */}
        <PredictionChat onSubmit={onSubmit} isLoading={false} compact={true} />

        {/* Question display */}
        <QuestionDisplay question={currentQuestion} />

        {/* Results cards */}
        <motion.div
          className={styles.resultsContainer}
          variants={cardContainerVariants}
          initial="hidden"
          animate="visible"
        >
          <ResultsHeaderCard resultsCount={results.length} locale={locale} />

          {results.map((period, index) => (
            <TimingCard key={index} period={period} rank={index} />
          ))}
        </motion.div>

        {/* Result sharing */}
        {results.length > 0 && (
          <ErrorBoundary>
            <ResultShare
              result={{
                question: currentQuestion,
                eventType: currentEventType || 'general',
                topResult: {
                  startDate: results[0].startDate,
                  endDate: results[0].endDate,
                  score: results[0].score,
                  grade: results[0].grade,
                },
                allResults: results.map((r) => ({
                  startDate: r.startDate,
                  endDate: r.endDate,
                  score: r.score,
                  grade: r.grade,
                  reasons: r.reasons,
                })),
                totalCount: results.length,
                birthDate: birthDate || '',
                gender: (gender || 'M') as 'M' | 'F',
              }}
              locale={locale}
              isLoggedIn={isAuthenticated}
            />
          </ErrorBoundary>
        )}

        {/* AI advisor chat */}
        <ErrorBoundary>
          <AdvisorChat
            predictionContext={{
              question: currentQuestion,
              eventType: currentEventType || 'general',
              results: results.map((r) => ({
                startDate: String(r.startDate),
                endDate: String(r.endDate),
                score: r.score,
                grade: r.grade,
                reasons: r.reasons,
              })),
              birthDate: birthDate || '',
              gender: (gender || 'M') as 'M' | 'F',
            }}
            locale={locale}
          />
        </ErrorBoundary>

        {/* Ask again button */}
        <AskAgainButton onClick={onAskAgain} locale={locale} />
      </motion.div>
    );
  }
);

ResultsPhase.displayName = 'ResultsPhase';
