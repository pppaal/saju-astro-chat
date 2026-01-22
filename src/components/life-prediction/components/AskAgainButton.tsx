/**
 * AskAgainButton Component
 *
 * Button to ask another question and reset the prediction flow.
 */

'use client';

import React from 'react';
import styles from '../life-prediction.module.css';

interface AskAgainButtonProps {
  /** Click handler */
  onClick: () => void;
  /** Locale for text */
  locale: string;
}

/**
 * Ask again button
 *
 * @example
 * ```tsx
 * <AskAgainButton onClick={handleAskAgain} locale="ko" />
 * ```
 */
export const AskAgainButton = React.memo<AskAgainButtonProps>(
  ({ onClick, locale }) => {
    return (
      <button className={styles.askAgainBtn} onClick={onClick}>
        <span>🔮</span>
        <span>
          {locale === 'ko' ? '다른 질문하기' : 'Ask Another Question'}
        </span>
      </button>
    );
  }
);

AskAgainButton.displayName = 'AskAgainButton';
