'use client'

import { useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useI18n } from '@/i18n/I18nProvider'
import { ErrorBoundary, ChatErrorFallback } from '@/components/ErrorBoundary'
import CreditBadge from '@/components/ui/CreditBadge'
// buildSignInUrl import removed alongside the guest banner — restore
// when reintroducing inline login CTA.
import styles from './counselor.module.css'
import { logger } from '@/lib/logger'
import { useCounselorData } from './useCounselorData'
import { CounselorLoadingScreen } from './CounselorLoadingScreen'
import Chat from '@/components/destiny-map/Chat'

type SearchParams = Record<string, string | string[] | undefined>

export default function CounselorPage() {
  const { t } = useI18n()
  const rawSearchParams = useSearchParams()
  const sp = useMemo<SearchParams>(() => {
    const result: SearchParams = {}
    rawSearchParams.forEach((value, key) => {
      const current = result[key]
      if (typeof current === 'undefined') {
        result[key] = value
        return
      }
      if (Array.isArray(current)) {
        result[key] = [...current, value]
        return
      }
      result[key] = [current, value]
    })
    return result
  }, [rawSearchParams])
  const counselorSearchParams = useMemo<SearchParams>(
    () => ({
      ...sp,
      theme: 'chat',
    }),
    [sp]
  )

  const router = useRouter()
  const { status: authStatus } = useSession()
  void router // routerless after guest banner removal — keep for future re-enable
  void authStatus

  const {
    chartData,
    sessionId,
    userContext,
    chatSessionId,
    handleSaveMessage,
    isLoading,
    showChat,
    loadingStep,
    loadingMessages,
    parsedParams,
  } = useCounselorData(counselorSearchParams)

  const {
    name,
    birthDate,
    birthTime,
    city,
    gender,
    lang,
    initialQuestion,
    latitude,
    longitude,
    selectedTheme,
  } = parsedParams

  // handleLogin removed alongside the guest banner. If we reintroduce
  // an inline sign-in CTA, restore via:
  //   const handleLogin = () => router.push(buildSignInUrl(`/destiny-counselor/chat${search}`))

  const handleBack = useCallback(() => router.back(), [router])
  const handleChatReset = useCallback(() => window.location.reload(), [])

  if (!birthDate || !birthTime) {
    return (
      <main className={styles.page}>
        <div className={styles.missingProfileCard}>
          <div className={styles.missingProfileIcon}>🔮</div>
          <h1 className={styles.missingProfileTitle}>
            {t('destinyMap.counselor.title', 'Destiny Counselor')}
          </h1>
          <p className={styles.missingProfileText}>
            {t(
              'destinyMap.counselor.missingProfile',
              '상담을 시작하려면 먼저 생년월일과 출생 시간을 입력해 주세요.'
            )}
          </p>
          <div className={styles.missingProfileActions}>
            <Link href="/destiny-counselor" className={styles.primaryAction}>
              {t('destinyMap.counselor.goToForm', '정보 입력하러 가기')}
            </Link>
            <button type="button" className={styles.secondaryAction} onClick={handleBack}>
              {t('common.back', 'Back')}
            </button>
          </div>
        </div>
      </main>
    )
  }

  if (isLoading) {
    return (
      <CounselorLoadingScreen
        title={t('destinyMap.counselor.title', 'Destiny Counselor')}
        loadingStep={loadingStep}
        loadingMessages={loadingMessages}
      />
    )
  }

  return (
    <main className={`${styles.page} ${showChat ? styles.fadeIn : ''}`}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            type="button"
            className={styles.backButton}
            onClick={handleBack}
            aria-label={t('common.back', 'Back')}
          >
            <span className={styles.backIcon}>{'\u2190'}</span>
          </button>

          <div className={styles.headerInfo}>
            <div className={styles.counselorBadge}>
              <span className={styles.counselorAvatar}>{'\uD83D\uDD2E'}</span>
              <div>
                <h1 className={styles.headerTitle}>
                  {t('destinyMap.counselor.title', 'Destiny Counselor')}
                </h1>
                <span className={styles.onlineStatus}>
                  <span className={styles.onlineDot} />
                  {t('destinyMap.counselor.online', 'Online')}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.creditBadgeWrap}>
            <CreditBadge variant="compact" />
          </div>
          <Link href="/" className={styles.homeButton} aria-label="Home">
            <span className={styles.homeIcon}>{'\uD83C\uDFE0'}</span>
            <span className={styles.homeLabel}>{t('common.home', 'Home')}</span>
          </Link>
        </div>
      </header>

      {/* Guest banner removed — fights the Claude-style centered hero
          empty state. Login CTA lives in the page header (top-right)
          and via /api save attempts when guests try to persist. */}

      <div className={styles.chatWrapper}>
        <ErrorBoundary
          fallback={<ChatErrorFallback error={new Error('Chat error')} reset={handleChatReset} />}
          onError={(error) => {
            logger.error('[Counselor] Chat error', { error: error.message, stack: error.stack })
          }}
        >
          <Chat
            profile={{
              name,
              birthDate,
              birthTime,
              city,
              gender,
              latitude,
              longitude,
            }}
            lang={lang}
            theme={selectedTheme}
            initialContext={initialQuestion ? `User's initial question: ${initialQuestion}` : ''}
            seedEvent="counselor:seed"
            saju={chartData?.saju}
            astro={chartData?.astro}
            advancedAstro={chartData?.advancedAstro}
            userContext={userContext}
            chatSessionId={chatSessionId}
            onSaveMessage={handleSaveMessage}
            autoScroll={false}
            ragSessionId={sessionId || undefined}
            autoSendSeed
          />
        </ErrorBoundary>
      </div>

      {initialQuestion && <InitialQuestionSender question={initialQuestion} />}
    </main>
  )
}

function InitialQuestionSender({ question }: { question: string }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('counselor:seed', { detail: question }))
    }, 500)
    return () => clearTimeout(timer)
  }, [question])

  return null
}
