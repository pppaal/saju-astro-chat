/**
 * LoginHint Component
 *
 * Displays a hint to encourage users to log in for a better experience.
 */

'use client';

import React from 'react';
import styles from '../life-prediction.module.css';

interface LoginHintProps {
  /** Sign-in URL */
  signInUrl: string;
  /** Locale for text */
  locale: string;
}

/**
 * Login hint with sign-in link
 *
 * @example
 * ```tsx
 * <LoginHint signInUrl="/auth/signin" locale="ko" />
 * ```
 */
export const LoginHint = React.memo<LoginHintProps>(({ signInUrl, locale }) => {
  return (
    <div className={styles.loginHint}>
      <p>
        {locale === 'ko'
          ? '로그인하면 정보가 저장되어 더 편리하게 이용할 수 있어요'
          : 'Log in to save your info for a better experience'}
      </p>
      <a href={signInUrl} className={styles.loginLink}>
        {locale === 'ko' ? '로그인하기' : 'Log in'}
      </a>
    </div>
  );
});

LoginHint.displayName = 'LoginHint';
