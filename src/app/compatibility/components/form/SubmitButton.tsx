import React from 'react';
import styles from '../../Compatibility.module.css';

interface SubmitButtonProps {
  /** Whether the button is in loading state */
  isLoading: boolean;
  /** Translation function */
  t: (key: string, fallback: string) => string;
}

/**
 * SubmitButton Component
 *
 * Main submit button for compatibility analysis form.
 * Shows loading spinner and disabled state during analysis.
 */
export const SubmitButton: React.FC<SubmitButtonProps> = React.memo(({
  isLoading,
  t,
}) => {
  return (
    <button
      type="submit"
      disabled={isLoading}
      className={styles.submitButton}
    >
      <span className={styles.buttonGlow} />
      {isLoading ? (
        <>
          <svg
            className={styles.spinner}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {t('compatibilityPage.calculating', 'Calculating...')}
        </>
      ) : (
        t('compatibilityPage.analyzeCompatibility', 'Analyze Compatibility')
      )}
    </button>
  );
});

SubmitButton.displayName = 'SubmitButton';
