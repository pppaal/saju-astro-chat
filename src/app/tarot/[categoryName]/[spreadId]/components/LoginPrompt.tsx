/**
 * Login Prompt Component
 *
 * 로그인 요구 UI
 */

'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from '../tarot-reading.module.css'

interface LoginPromptProps {
  signInUrl: string
  language: string
}

export default function LoginPrompt({ signInUrl, language }: LoginPromptProps) {
  const router = useRouter()

  return (
    <div className={styles.loginRequired}>
      <div className={styles.loginContent}>
        <div className={styles.loginIcon}>🔮</div>
        <h1 className={styles.loginTitle}>
          {language === 'ko' ? '로그인이 필요합니다' : 'Login Required'}
        </h1>
        <p className={styles.loginDescription}>
          {language === 'ko'
            ? '타로 해석을 보려면 로그인해주세요. 로그인하면 해석 결과를 저장하고 다시 볼 수 있어요.'
            : 'Please login to view your tarot reading. Your readings will be saved for future reference.'}
        </p>
        <div className={styles.loginButtons}>
          <button className={styles.loginButton} onClick={() => router.push(signInUrl)}>
            <svg className={styles.googleIcon} viewBox="0 0 24 24" width="20" height="20">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {language === 'ko' ? 'Google로 로그인' : 'Sign In with Google'}
          </button>
        </div>
        <Link href="/tarot" className={styles.backLink}>
          ← {language === 'ko' ? '타로 홈으로' : 'Back to Tarot'}
        </Link>
      </div>
    </div>
  )
}
