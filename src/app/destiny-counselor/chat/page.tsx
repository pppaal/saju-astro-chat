'use client'

import { useEffect, useCallback, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useI18n } from '@/i18n/I18nProvider'
import { ErrorBoundary, ChatErrorFallback } from '@/components/ErrorBoundary'
import CreditBadge from '@/components/ui/CreditBadge'
import CounselorSidebar from '@/components/counselor/CounselorSidebar'
// buildSignInUrl import removed alongside the guest banner — restore
// when reintroducing inline login CTA.
import styles from './chat.module.css'
import { logger } from '@/lib/logger'
import { useCounselorData } from './useCounselorData'
import { CounselorLoadingScreen } from './CounselorLoadingScreen'
import Chat from '@/components/counselor/Chat'

type SearchParams = Record<string, string | string[] | undefined>

export default function CounselorPage() {
  const { t, locale, setLocale } = useI18n()
  const isKo = locale === 'ko'
  const toggleLocale = useCallback(() => {
    setLocale(locale === 'ko' ? 'en' : 'ko')
  }, [locale, setLocale])
  const [chatResetKey, setChatResetKey] = useState(0)
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
  void authStatus

  const [sidebarOpen, setSidebarOpen] = useState(false)

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
  // Claude-style new chat: drop the chat instance in place by bumping a
  // remount key. No page reload, no loading screen — the Chat tree just
  // remounts with empty state.
  const handleChatReset = useCallback(() => {
    setChatResetKey((k) => k + 1)
  }, [])

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
      <BodyScrollLock />
      <CounselorSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={handleChatReset}
      />
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => setSidebarOpen(true)}
            aria-label={t('destinyMap.counselor.menu', 'Menu')}
          >
            <span className={styles.backIcon}>{'\u2630'}</span>
          </button>

          <h1 className={styles.headerTitle}>
            {t('destinyMap.counselor.title', 'Destiny Counselor')}
          </h1>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            onClick={toggleLocale}
            className={styles.localeToggle}
            aria-label={isKo ? 'Switch to English' : '한국어로 전환'}
            title={isKo ? 'Switch to English' : '한국어로 전환'}
          >
            {isKo ? 'EN' : 'KO'}
          </button>
          <div className={styles.creditBadgeWrap}>
            <CreditBadge variant="compact" />
          </div>
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
            key={chatResetKey}
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

// While the counselor chat is mounted, lock html/body so the whole page can't
// rubber-band, pull-to-refresh, or shift when the mobile URL bar collapses.
// The inner messages panel still scrolls; only the page chrome is pinned.
function BodyScrollLock() {
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prevHtmlOverflow = html.style.overflow
    const prevBodyOverflow = body.style.overflow
    const prevBodyOverscroll = body.style.overscrollBehavior
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    body.style.overscrollBehavior = 'contain'
    return () => {
      html.style.overflow = prevHtmlOverflow
      body.style.overflow = prevBodyOverflow
      body.style.overscrollBehavior = prevBodyOverscroll
    }
  }, [])
  return null
}
