'use client'

import { useEffect, useCallback, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useI18n } from '@/i18n/I18nProvider'
import { ErrorBoundary, ChatErrorFallback } from '@/components/ErrorBoundary'
import CreditBadge from '@/components/ui/CreditBadge'
import CounselorSidebar from '@/components/destiny-map/CounselorSidebar'
// buildSignInUrl import removed alongside the guest banner — restore
// when reintroducing inline login CTA.
import styles from './counselor.module.css'
import { logger } from '@/lib/logger'
import { useCounselorData } from './useCounselorData'
import Chat from '@/components/destiny-map/Chat'

type SearchParams = Record<string, string | string[] | undefined>

export default function CounselorPage() {
  const { t } = useI18n()
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
    () => ({ ...sp }),
    [sp]
  )

  const router = useRouter()
  const { status: authStatus } = useSession()
  void authStatus

  const [sidebarOpen, setSidebarOpen] = useState(false)

  // /destiny-map/counselor?session=<id> — sidebar's past-chats list
  // hands us a saved CounselorChatSession id here. We pass it to <Chat>
  // which resumes the conversation on mount (was previously dropped on
  // the floor, hence "눌러도 안 불러와져").
  const initialSessionId =
    (Array.isArray(sp.session) ? sp.session[0] : sp.session) ?? undefined

  const {
    chartData,
    sessionId,
    userContext,
    chatSessionId,
    handleSaveMessage,
    parsedParams,
    profileLoading,
  } = useCounselorData(counselorSearchParams)

  const {
    name,
    birthDate,
    birthTime,
    birthTimeUnknown,
    city,
    gender,
    lang,
    initialQuestion,
    latitude,
    longitude,
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

  // Don't flash the gate while the profile fallback is loading — the
  // user may have valid birth info on their profile that we haven't
  // fetched yet. Keep lightTheme here too so switching past chats doesn't
  // flash the dark/purple base background for ~1s before the chat returns.
  if (profileLoading) {
    return <main className={`${styles.page} ${styles.lightTheme}`} />
  }

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

  return (
    <main className={`${styles.page} ${styles.lightTheme}`}>
      <BodyScrollLock />
      <CounselorSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={handleChatReset}
        lightTheme
        enableGrouping
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
              birthTimeUnknown,
              city,
              gender,
              latitude,
              longitude,
            }}
            lang={lang}
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
            autoFocus
            initialSessionId={initialSessionId}
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
