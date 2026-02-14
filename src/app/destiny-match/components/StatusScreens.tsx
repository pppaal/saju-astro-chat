import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useI18n } from '@/i18n/I18nProvider'

type CSSStyles = { readonly [key: string]: string }

interface StatusScreensProps {
  isLoading: boolean
  isSessionLoading: boolean
  isLoggedIn: boolean
  needsSetup: boolean
  error: string | null
  signInUrl: string
  onSignIn: () => void
  onSetup: () => void
  onRetry: () => Promise<void>
  styles: CSSStyles
}

export function StatusScreens({
  isLoading,
  isSessionLoading,
  isLoggedIn,
  needsSetup,
  error,
  onSignIn,
  onSetup,
  onRetry,
  styles,
}: StatusScreensProps) {
  const { t } = useI18n()
  const [loadingTimedOut, setLoadingTimedOut] = useState(false)

  useEffect(() => {
    if (!(isSessionLoading || isLoading)) {
      setLoadingTimedOut(false)
      return
    }
    const timer = window.setTimeout(() => setLoadingTimedOut(true), 10000)
    return () => window.clearTimeout(timer)
  }, [isSessionLoading, isLoading])

  if (isSessionLoading || isLoading) {
    return (
      <div className={styles.statusScreen}>
        <div className={styles.statusIconContainer}>
          <div className={styles.statusIcon}>{loadingTimedOut ? '⚠️' : '✨'}</div>
        </div>
        {loadingTimedOut ? (
          <>
            <h2 className={styles.statusTitle}>
              {t('destinyMatch.status.loadingSlow', 'Loading is taking longer than expected')}
            </h2>
            <p className={styles.statusText}>
              {t('destinyMatch.status.loadingRetryHint', 'Please try again.')}
            </p>
            <button onClick={onRetry} className={styles.statusButton}>
              {t('destinyMatch.status.retry', 'Retry')}
            </button>
          </>
        ) : (
          <>
            <h2 className={styles.statusTitle}>
              {t('destinyMatch.status.loading', 'Loading profiles...')}
            </h2>
            <p className={styles.statusText}>
              {t('destinyMatch.status.loadingWait', 'Please wait a moment')}
            </p>
          </>
        )}
      </div>
    )
  }

  if (!isLoggedIn) {
    return (
      <div className={styles.statusScreen}>
        <div className={styles.statusIconContainer}>
          <div className={styles.statusIcon}>✨</div>
          <div className={styles.statusIcon} style={{ animationDelay: '0.3s' }}>
            💫
          </div>
          <div className={styles.statusIcon} style={{ animationDelay: '0.6s' }}>
            🌟
          </div>
        </div>
        <h2 className={styles.statusTitle}>
          {t('destinyMatch.status.startTitle', 'Start your destiny match')}
        </h2>
        <p className={styles.statusText}>
          {t(
            'destinyMatch.status.startDesc',
            'Find meaningful matches based on your Saju and astrology profile.'
          )}
        </p>
        <button onClick={onSignIn} className={styles.statusButton}>
          {t('destinyMatch.status.signIn', 'Sign in to continue')}
        </button>
      </div>
    )
  }

  if (needsSetup) {
    return (
      <div className={styles.statusScreen}>
        <div className={styles.statusIconContainer}>
          <div className={styles.statusIcon}>📝</div>
        </div>
        <h2 className={styles.statusTitle}>
          {t('destinyMatch.status.setupTitle', 'Complete your profile first')}
        </h2>
        <p className={styles.statusText}>
          {t('destinyMatch.status.setupDesc', 'A short setup is needed before matching starts.')}
        </p>
        <button onClick={onSetup} className={styles.statusButton}>
          {t('destinyMatch.status.setupButton', 'Go to setup')}
        </button>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.statusScreen}>
        <div className={styles.statusIconContainer}>
          <div className={styles.statusIcon}>😢</div>
        </div>
        <h2 className={styles.statusTitle}>
          {t('destinyMatch.status.errorTitle', 'Something went wrong')}
        </h2>
        <p className={styles.statusText}>{error}</p>
        <button onClick={onRetry} className={styles.statusButton}>
          {t('destinyMatch.status.retry', 'Retry')}
        </button>
      </div>
    )
  }

  return null
}

interface NoMoreCardsProps {
  profileCount: number
  loadProfiles: () => Promise<void>
  styles: CSSStyles
}

export function NoMoreCards({ profileCount, loadProfiles, styles }: NoMoreCardsProps) {
  const { t } = useI18n()

  return (
    <div className={styles.noMoreCards}>
      <div className={styles.noMoreIcon}>&#127775;</div>
      <h2>
        {profileCount === 0
          ? t('destinyMatch.noMore.empty', 'No profiles available yet')
          : t('destinyMatch.noMore.done', 'You have reviewed all profiles')}
      </h2>
      <p>
        {profileCount === 0
          ? t('destinyMatch.noMore.emptyDesc', 'Please check back soon')
          : t('destinyMatch.noMore.doneDesc', 'More matches will appear soon')}
      </p>
      <button onClick={loadProfiles} className={styles.resetButton}>
        {t('destinyMatch.noMore.refresh', 'Refresh')}
      </button>
      <Link
        href="/destiny-match/matches"
        className={styles.resetButton}
        style={{ marginTop: '10px', display: 'inline-block' }}
      >
        {t('destinyMatch.noMore.viewMatches', 'View matches')}
      </Link>
    </div>
  )
}
