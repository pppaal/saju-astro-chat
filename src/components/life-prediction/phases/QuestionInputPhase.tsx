/**
 * QuestionInputPhase Component
 *
 * Second phase: User enters their life prediction question.
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { PredictionChat } from '@/components/life-prediction/PredictionChat';
import { BirthInfoDisplay } from '../components/BirthInfoDisplay';
import { ErrorNotice } from '../components/ErrorNotice';
import { EventType } from '@/components/life-prediction/PredictionChat/hooks/useEventTypeDetector';
import { pageTransitionVariants } from '@/components/life-prediction/animations/cardAnimations';
import styles from '../life-prediction.module.css';

interface QuestionInputPhaseProps {
  /** Birth date to display */
  birthDate?: string;
  /** Gender to display */
  gender?: 'M' | 'F';
  /** Locale for text */
  locale: string;
  /** Error message if any */
  error?: string | null;
  /** Change birth info handler */
  onChangeBirthInfo: () => void;
  /** Submit handler */
  onSubmit: (question: string, eventType: EventType | null) => Promise<void>;
}

/**
 * Question input phase component
 *
 * @example
 * ```tsx
 * <QuestionInputPhase
 *   birthDate="1990-01-15"
 *   gender="M"
 *   locale="ko"
 *   onChangeBirthInfo={handleChange}
 *   onSubmit={handleSubmit}
 * />
 * ```
 */
export const QuestionInputPhase = React.memo<QuestionInputPhaseProps>(
  ({
    birthDate,
    gender,
    locale,
    error,
    onChangeBirthInfo,
    onSubmit,
  }) => {
    return (
      <motion.div
        key="input"
        variants={pageTransitionVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={styles.phaseContainer}
      >
        {birthDate && gender && (
          <BirthInfoDisplay
            birthDate={birthDate}
            gender={gender}
            onChangeClick={onChangeBirthInfo}
            locale={locale}
          />
        )}

        {error && <ErrorNotice message={error} />}

        <PredictionChat onSubmit={onSubmit} isLoading={false} compact={false} />
      </motion.div>
    );
  }
);

QuestionInputPhase.displayName = 'QuestionInputPhase';
