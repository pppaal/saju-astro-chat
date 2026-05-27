'use client'

import { useEffect, useCallback, useMemo, useRef, useState } from 'react'
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

  // 페이지 헤더에 표시할 활성 세션 정보 + ⋮ 메뉴 상태. Chat 컴포넌트가
  // onSessionChange 콜백으로 sessionId/title 을 알려준다. 메뉴 클릭 시
  // 직접 /api/counselor/session/list (PATCH/DELETE) 호출.
  const [activeSession, setActiveSession] = useState<{
    sessionId: string | null
    title: string | null
  }>({ sessionId: null, title: null })
  const [chatMenuOpen, setChatMenuOpen] = useState(false)
  const chatMenuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!chatMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (chatMenuRef.current && !chatMenuRef.current.contains(e.target as Node)) {
        setChatMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [chatMenuOpen])

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

  // session=<id> 가 URL 에 있으면 사이드바의 "과거 채팅" 링크로 들어온
  // 케이스 — 저장된 세션이 birth 컨텍스트를 들고 있어서, 게이트가 막으면
  // 안 됨. Chat 컴포넌트가 세션 로드하면서 birth 정보까지 복원함.
  if ((!birthDate || !birthTime) && !initialSessionId) {
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
            {activeSession.title?.trim() ||
              t('destinyMap.counselor.title', 'Destiny Counselor')}
          </h1>
        </div>

        <div className={styles.headerActions}>
          {activeSession.sessionId && (
            <div ref={chatMenuRef} className={styles.chatMenuArea}>
              <button
                type="button"
                className={styles.chatMenuButton}
                onClick={() => setChatMenuOpen((o) => !o)}
                aria-label={lang === 'ko' ? '\ub300\ud654 \uba54\ub274' : 'Chat menu'}
                aria-expanded={chatMenuOpen}
                aria-haspopup="menu"
              >
                <span aria-hidden="true">{'\u22ee'}</span>
              </button>
              {chatMenuOpen && (
                <div role="menu" className={styles.chatMenuDropdown}>
                  <button
                    type="button"
                    role="menuitem"
                    className={styles.chatMenuItem}
                    onClick={async () => {
                      setChatMenuOpen(false)
                      const id = activeSession.sessionId
                      if (!id) return
                      const next = window.prompt(
                        lang === 'ko' ? '\ub300\ud654 \uc774\ub984' : 'Chat name',
                        activeSession.title || ''
                      )
                      if (!next || !next.trim()) return
                      try {
                        await fetch('/api/counselor/session/list', {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ sessionId: id, title: next.trim() }),
                        })
                        setActiveSession((s) => ({ ...s, title: next.trim() }))
                      } catch (err) {
                        logger.warn('[Counselor] rename failed', { err })
                      }
                    }}
                  >
                    <span>{lang === 'ko' ? '\uc774\ub984 \ubcc0\uacbd' : 'Rename'}</span>
                    <span aria-hidden="true" className={styles.chatMenuIcon}>
                      {'\u270e'}
                    </span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className={`${styles.chatMenuItem} ${styles.chatMenuItemDanger}`}
                    onClick={async () => {
                      setChatMenuOpen(false)
                      const id = activeSession.sessionId
                      if (!id) return
                      const ok = window.confirm(
                        lang === 'ko'
                          ? '\uc774 \ub300\ud654\ub97c \uc0ad\uc81c\ud560\uae4c\uc694? \ub418\ub3cc\ub9b4 \uc218 \uc5c6\uc5b4\uc694.'
                          : 'Delete this chat? Cannot be undone.'
                      )
                      if (!ok) return
                      try {
                        await fetch(
                          `/api/counselor/session/list?sessionId=${encodeURIComponent(id)}`,
                          { method: 'DELETE' }
                        )
                      } catch (err) {
                        logger.warn('[Counselor] delete failed', { err })
                      }
                      // \uc0c8 \ucc44\ud305\uc73c\ub85c \ub9ac\uc14b \u2014 session \ucffc\ub9ac \ub5bc\uace0 \ud0a4 \uac31\uc2e0\ud574 Chat \uc7ac\ub9c8\uc6b4\ud2b8.
                      router.replace('/destiny-map/counselor')
                      handleChatReset()
                      setActiveSession({ sessionId: null, title: null })
                    }}
                  >
                    <span>{lang === 'ko' ? '\uc0ad\uc81c' : 'Delete'}</span>
                    <span aria-hidden="true" className={styles.chatMenuIcon}>
                      {'\ud83d\uddd1'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
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
            onSessionChange={setActiveSession}
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
