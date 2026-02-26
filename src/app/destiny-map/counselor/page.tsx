'use client'

import { useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import dynamic from 'next/dynamic'
import { useI18n } from '@/i18n/I18nProvider'
import { ErrorBoundary, ChatErrorFallback } from '@/components/ErrorBoundary'
import CreditBadge from '@/components/ui/CreditBadge'
import AuthGate from '@/components/auth/AuthGate'
import { buildSignInUrl } from '@/lib/auth/signInUrl'
import styles from './counselor.module.css'
import { logger } from '@/lib/logger'
import { useCounselorData } from './useCounselorData'
import { CounselorLoadingScreen } from './CounselorLoadingScreen'

const Chat = dynamic(() => import('@/components/destiny-map/Chat'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: '100%',
        minHeight: 320,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#CBD5E1',
      }}
    >
      Loading counselor chat...
    </div>
  ),
})

type SearchParams = Record<string, string | string[] | undefined>

export default function CounselorPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { t } = useI18n()
  const sp = use(searchParams)
  const router = useRouter()
  const { status: authStatus } = useSession()
  const isAuthed = authStatus === 'authenticated'
  const isCheckingAuth = authStatus === 'loading'

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
  } = useCounselorData(sp)

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
    setSelectedTheme,
    themeOptions,
  } = parsedParams

  const handleLogin = useCallback(() => {
    const search = typeof window !== 'undefined' ? window.location.search : ''
    router.push(buildSignInUrl(`/destiny-counselor/chat${search}`))
  }, [router])

  const handleBack = useCallback(() => router.back(), [router])

  const handleChatReset = useCallback(() => window.location.reload(), [])

  if (isCheckingAuth) {
    return (
      <main className={styles.page}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingText}>
            <h2 className={styles.counselorTitle}>
              {t('destinyMap.counselor.title', 'Destiny Counselor')}
            </h2>
            <p className={styles.loadingMessage}>
              {t('destinyMap.counselor.authChecking', 'Checking login status...')}
            </p>
          </div>
        </div>
      </main>
    )
  }

  const loginFallback = (
    <main className={styles.page}>
      <div className={styles.authGate}>
        <div className={styles.authCard}>
          <div className={styles.authIcon}>LOCK</div>
          <h1 className={styles.authTitle}>
            {t('destinyMap.counselor.loginRequiredTitle', 'Login is required for counselor chat')}
          </h1>
          <p className={styles.authDesc}>
            {t(
              'destinyMap.counselor.loginRequiredDesc',
              'Please sign in to continue with personalized counseling and history.'
            )}
          </p>
          <button type="button" className={styles.loginButton} onClick={handleLogin}>
            {t('destinyMap.counselor.loginCta', 'Sign in and continue')}
          </button>
          <p className={styles.loginHint}>
            {t(
              'destinyMap.counselor.loginHint',
              'If you do not have an account, you can create one in the sign-in flow.'
            )}
          </p>
        </div>
      </div>
    </main>
  )

  if (isLoading && isAuthed) {
    return (
      <CounselorLoadingScreen
        title={t('destinyMap.counselor.title', 'Destiny Counselor')}
        loadingStep={loadingStep}
        loadingMessages={loadingMessages}
      />
    )
  }

  return (
    <AuthGate
      statusOverride={authStatus}
      callbackUrl={
        typeof window !== 'undefined'
          ? `/destiny-counselor/chat${window.location.search}`
          : '/destiny-counselor/chat'
      }
      fallback={loginFallback}
    >
      <main className={`${styles.page} ${showChat ? styles.fadeIn : ''}`}>
        <header className={styles.header}>
          <button
            type="button"
            className={styles.backButton}
            onClick={handleBack}
            aria-label={t('common.back', 'Back')}
          >
            <span className={styles.backIcon}>{'<'}</span>
          </button>

          <div className={styles.headerInfo}>
            <div className={styles.counselorBadge}>
              <span className={styles.counselorAvatar}>AI</span>
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

          <div className={styles.headerActions}>
            <CreditBadge variant="compact" />
            <Link href="/" className={styles.homeButton} aria-label="Home">
              <span className={styles.homeIcon}>HOME</span>
              <span className={styles.homeLabel}>Home</span>
            </Link>
          </div>
        </header>

        <div className={styles.themeBar}>
          <div className={styles.themeScroll}>
            {themeOptions.map((opt) => (
              <button
                key={opt.key}
                type="button"
                className={`${styles.themeChip} ${selectedTheme === opt.key ? styles.themeChipActive : ''}`}
                onClick={() => setSelectedTheme(opt.key)}
              >
                <span className={styles.themeIcon}>{opt.icon}</span>
                <span className={styles.themeLabel}>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

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
    </AuthGate>
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
