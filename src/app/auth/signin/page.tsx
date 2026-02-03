'use client'

import { signIn, getProviders } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import styles from './signin.module.css'
import { useI18n } from '@/i18n/I18nProvider'

type Providers = Awaited<ReturnType<typeof getProviders>>

export default function SignInPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <SignInContent />
    </Suspense>
  )
}

function LoadingScreen() {
  return (
    <div className={styles.loadingScreen}>
      <div className={styles.spinner}></div>
    </div>
  )
}

function SignInContent() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams?.get('callbackUrl') || '/'
  const error = searchParams?.get('error')
  const [providers, setProviders] = useState<Providers>(null)
  const [loading, setLoading] = useState(true)
  const [agreed, setAgreed] = useState(false)
  const { t } = useI18n()

  useEffect(() => {
    getProviders().then((p) => {
      setProviders(p)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <main className={styles.container}>
      {/* Decorative background elements */}
      <div className={styles.bgOrb1}></div>
      <div className={styles.bgOrb2}></div>
      <div className={styles.bgOrb3}></div>

      {/* Header */}
      <header className={styles.header}>
        <Link href="/" className={styles.backBtn}>
          &larr;
        </Link>
        <h1 className={styles.logo}>{t('auth.signIn')}</h1>
      </header>

      {/* Login Card */}
      <div className={styles.loginContainer}>
        <div className={styles.loginCard}>
          <div className={styles.loginIcon}>&#x2728;</div>
          <h2>{t('auth.welcomeBack')}</h2>
          <p>{t('auth.signInToContinue')}</p>

          {error && (
            <div className={styles.errorBox}>
              {error === 'OAuthSignin' && t('auth.error.oauthSignin')}
              {error === 'OAuthCallback' && t('auth.error.oauthCallback')}
              {error === 'OAuthAccountNotLinked' && t('auth.error.oauthAccountNotLinked')}
              {error === 'Callback' && t('auth.error.callback')}
              {error === 'Default' && t('auth.error.default')}
              {![
                'OAuthSignin',
                'OAuthCallback',
                'OAuthAccountNotLinked',
                'Callback',
                'Default',
              ].includes(error) && t('auth.error.unexpected')}
            </div>
          )}

          <div className={styles.loginButtons}>
            {providers?.google && (
              <button
                className={`${styles.googleBtn} ${!agreed ? styles.disabledBtn : ''}`}
                disabled={!agreed}
                onClick={() => signIn('google', { callbackUrl })}
              >
                <svg viewBox="0 0 24 24" width="20" height="20">
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
                {t('auth.signInWithGoogle')}
              </button>
            )}
          </div>

          <label className={styles.termsRow}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
            />
            <span>
              {t('auth.termsConsentPrefix', 'By continuing, you agree to the')}{' '}
              <Link
                href="/policy/terms"
                className={styles.termsLink}
                target="_blank"
                rel="noreferrer"
              >
                {t('auth.termsOfUse', 'Terms of Use')}
              </Link>{' '}
              {t('auth.termsConsentJoin', 'and acknowledge the')}{' '}
              <Link
                href="/policy/privacy"
                className={styles.termsLink}
                target="_blank"
                rel="noreferrer"
              >
                {t('auth.privacyPolicy', 'Privacy Policy')}
              </Link>
              .{' '}
              <span className={styles.checkboxHint}>
                {t('auth.checkboxHint', '(Please check the box to agree)')}
              </span>
            </span>
          </label>

          <div className={styles.divider}>
            <span>{t('auth.secureAuthentication')}</span>
          </div>

          <p className={styles.secureNote}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
            </svg>
            {t('auth.dataProtected')}
          </p>
        </div>

        {/* Bottom decoration */}
        <div className={styles.bottomDecor}>
          <span>&#x2728;</span>
          <span>&#x1F52E;</span>
          <span>&#x1F319;</span>
        </div>
      </div>
    </main>
  )
}
