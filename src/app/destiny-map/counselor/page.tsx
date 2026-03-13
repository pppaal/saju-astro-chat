'use client'

import { useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import dynamic from 'next/dynamic'
import { useI18n } from '@/i18n/I18nProvider'
import { ErrorBoundary, ChatErrorFallback } from '@/components/ErrorBoundary'
import CreditBadge from '@/components/ui/CreditBadge'
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

  const router = useRouter()
  const { status: authStatus } = useSession()
  const isAuthed = authStatus === 'authenticated'

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

      {!isAuthed && authStatus !== 'loading' && (
        <div className={styles.guestBanner}>
          <p className={styles.guestBannerText}>
            {t(
              'destinyMap.counselor.guestBanner',
              '게스트 모드로 바로 상담할 수 있어요. 로그인하면 대화 기록 저장과 연속 상담이 활성화됩니다.'
            )}
          </p>
          <button type="button" className={styles.guestLoginButton} onClick={handleLogin}>
            {t('destinyMap.counselor.loginCta', 'Sign in and continue')}
          </button>
        </div>
      )}

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
