/**
 * QuestionDisplay Component
 *
 * Displays the user's question in a styled format.
 */

'use client';

import React from 'react';
import styles from '../life-prediction.module.css';

interface QuestionDisplayProps {
  /** Question text */
  question: string;
}

/**
 * Question display component
 *
 * @example
 * ```tsx
 * <QuestionDisplay question="When should I get married?" />
 * ```
 */
export const QuestionDisplay = React.memo<QuestionDisplayProps>(
  ({ question }) => {
    return (
      <div className={styles.questionDisplay}>
        <span className={styles.questionIcon}>💬</span>
        <span className={styles.questionText}>{question}</span>
      </div>
    );
  }
);

QuestionDisplay.displayName = 'QuestionDisplay';
