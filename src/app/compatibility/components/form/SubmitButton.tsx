import React from 'react'
import styles from '../../Compatibility.module.css'
import { Spinner } from '@/components/ui/Spinner'

interface SubmitButtonProps {
  /** Whether the button is in loading state */
  isLoading: boolean
  /** Translation function */
  t: (key: string, fallback: string) => string
}

/**
 * 궁합 분석 폼 메인 제출 버튼. 공유 `<Spinner>` 컴포넌트 사용.
 */
export const SubmitButton: React.FC<SubmitButtonProps> = React.memo(
  ({ isLoading, t }) => {
    return (
      <button type="submit" disabled={isLoading} className={styles.submitButton}>
        <span className={styles.buttonGlow} />
        {isLoading ? (
          <>
            <Spinner size="md" tone="current" />
            {t('compatibilityPage.calculating', 'Calculating...')}
          </>
        ) : (
          t('compatibilityPage.analyzeCompatibility', 'Analyze Compatibility')
        )}
      </button>
    )
  }
)

SubmitButton.displayName = 'SubmitButton'
