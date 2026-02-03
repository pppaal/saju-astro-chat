'use client'

import React from 'react'
import styles from './ProfileLoader.module.css'

interface ProfileLoaderProps {
  status: 'authenticated' | 'loading' | 'unauthenticated'
  onLoadClick: () => void
  isLoading: boolean
  isLoaded: boolean
  error?: string | null
  showPrompt?: boolean
  locale?: 'ko' | 'en'
}

export function ProfileLoader({
  status,
  onLoadClick,
  isLoading,
  isLoaded,
  error,
  showPrompt,
  locale = 'ko',
}: ProfileLoaderProps) {
  // Don't show anything if not authenticated
  if (status !== 'authenticated') {
    return null
  }

  // Show prompt message when no saved profile found
  if (showPrompt && !isLoaded) {
    return (
      <div className={styles.profilePromptMsg}>
        <span className={styles.profilePromptIcon}>💡</span>
        <div className={styles.profilePromptText}>
          <strong>
            {locale === 'ko' ? '저장된 프로필이 없습니다.' : 'No saved profile found.'}
          </strong>
          <br />
          {locale === 'ko' ? (
            <>
              <a href="/myjourney" className={styles.link}>
                My Journey 프로필
              </a>
              에서 생년월일을 먼저 저장하면 다음부터 자동으로 입력됩니다.
            </>
          ) : (
            <>
              Save your birth info in{' '}
              <a href="/myjourney" className={styles.link}>
                My Journey Profile
              </a>{' '}
              to auto-fill next time.
            </>
          )}
        </div>
      </div>
    )
  }

  // Show load profile button when profile not loaded yet and no prompt
  if (!isLoaded && !showPrompt) {
    return (
      <>
        <button
          type="button"
          className={styles.loadProfileBtn}
          onClick={onLoadClick}
          disabled={isLoading}
        >
          <span className={styles.loadProfileIcon}>{isLoading ? '⏳' : '👤'}</span>
          <span className={styles.loadProfileText}>
            {isLoading
              ? locale === 'ko'
                ? '불러오는 중...'
                : 'Loading...'
              : locale === 'ko'
                ? '내 프로필 불러오기'
                : 'Load My Profile'}
          </span>
          <span className={styles.loadProfileArrow}>→</span>
        </button>
        {!isLoading && (
          <div className={styles.profileHintMsg}>
            <span className={styles.profileHintIcon}>💡</span>
            <span className={styles.profileHintText}>
              {locale === 'ko' ? (
                <>
                  프로필이 불러와지지 않으면{' '}
                  <a href="/myjourney" className={styles.link}>
                    My Journey
                  </a>
                  에서 프로필 작성을 먼저 해주세요.
                </>
              ) : (
                <>
                  If your profile doesn&apos;t load, please create it in{' '}
                  <a href="/myjourney" className={styles.link}>
                    My Journey
                  </a>{' '}
                  first.
                </>
              )}
            </span>
          </div>
        )}
      </>
    )
  }

  // Show success message when profile loaded
  if (isLoaded) {
    return (
      <div className={styles.profileLoadedMsg}>
        <span className={styles.profileLoadedIcon}>✓</span>
        <span className={styles.profileLoadedText}>
          {locale === 'ko' ? '프로필 불러오기 완료!' : 'Profile loaded!'}
        </span>
      </div>
    )
  }

  // Show error message if any
  if (error) {
    return (
      <div className={styles.loadErrorMsg}>
        <span className={styles.loadErrorIcon}>⚠️</span>
        <span className={styles.loadErrorText}>{error}</span>
      </div>
    )
  }

  return null
}
