'use client'

import { useEffect, useCallback, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useI18n } from '@/i18n/I18nProvider'
import { ErrorBoundary, ChatErrorFallback } from '@/components/ErrorBoundary'
import CreditBadge from '@/components/ui/CreditBadge'
import { useToast } from '@/components/ui/Toast'
import CounselorSidebar from '@/components/destiny-map/CounselorSidebar'
// buildSignInUrl import removed alongside the guest banner — restore
// when reintroducing inline login CTA.
import styles from './counselor.module.css'
import { logger } from '@/lib/logger'
import { useCounselorData } from './useCounselorData'
import Chat from '@/components/destiny-map/Chat'
import CounselorLoading from '@/components/branding/CounselorLoading'
import BirthInfoModal from '@/app/(main)/components/BirthInfoModal'
import {
  buildCounselorHref,
  getStoredBirthInfo,
  type StoredBirthInfo,
} from '@/app/(main)/birthInfoStorage'
import { fetchLatestSessionId } from '@/lib/counselor/latestSession'

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
  const counselorSearchParams = useMemo<SearchParams>(() => ({ ...sp }), [sp])

  const router = useRouter()
  const { status: authStatus } = useSession()
  void authStatus
  const toast = useToast()

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

  // /destiny-counselor?session=<id> — sidebar's past-chats list
  // hands us a saved CounselorChatSession id here. We pass it to <Chat>
  // which resumes the conversation on mount (was previously dropped on
  // the floor, hence "눌러도 안 불러와져").
  const initialSessionId = (Array.isArray(sp.session) ? sp.session[0] : sp.session) ?? undefined

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
    timeZone,
  } = parsedParams

  // '내 정보 수정' 모달을 현재 상담 중인 인물 정보로 채운다 — 상담사 데이터는
  // URL/프로필에서 오므로 localStorage(getStoredBirthInfo) 가 비어 있어도
  // 폼이 비지 않게. birth 정보가 없으면(맨몸 진입) localStorage 폴백.
  const currentSubjectInfo: StoredBirthInfo | null =
    birthDate && (gender === 'male' || gender === 'female')
      ? {
          name: name || undefined,
          birthDate,
          birthTime: birthTime || '',
          birthTimeUnknown,
          gender,
          city: city || undefined,
          latitude: typeof latitude === 'number' ? latitude : undefined,
          longitude: typeof longitude === 'number' ? longitude : undefined,
          timeZone: timeZone || undefined,
          savedAt: new Date().toISOString(),
        }
      : getStoredBirthInfo()

  // handleLogin removed alongside the guest banner. If we reintroduce
  // an inline sign-in CTA, restore via:
  //   const handleLogin = () => router.push(buildSignInUrl(`/destiny-counselor/chat${search}`))

  // ChatGPT 식 "마지막 채팅 이어서 띄우기" — 세션/질문/생년 파라미터 없이
  // 맨몸으로 /destiny-counselor 를 열면 새 빈 채팅 대신 가장 최근에
  // 저장된 대화를 자동으로 이어 띄운다. 명시적 질문(q/initialQuestion) 이나
  // 특정 인물 생년 파라미터로 들어온 "새 리딩" 진입은 그대로 새 채팅 유지.
  const hasUrlBirth = Boolean(
    (Array.isArray(sp.birthDate) ? sp.birthDate[0] : sp.birthDate) &&
    (Array.isArray(sp.birthTime) ? sp.birthTime[0] : sp.birthTime)
  )
  const bareEntry = !initialSessionId && !initialQuestion && !hasUrlBirth
  // mount 1 회만 시도 — 삭제 후 router.replace('/destiny-counselor') 로
  // URL 이 다시 맨몸이 돼도 직전 채팅을 재-resume 하지 않도록 ref 로 가드.
  const autoResumeAttemptedRef = useRef(false)
  const [resumeChecking, setResumeChecking] = useState(bareEntry)
  useEffect(() => {
    if (!bareEntry) {
      // 세션/질문/생년 파라미터가 붙은 진입 — resume 안 함.
      setResumeChecking(false)
      return
    }
    if (autoResumeAttemptedRef.current) {
      // 이미 한 번 시도함(예: 삭제 후 맨몸 URL 로 복귀) — 직전 채팅을 다시
      // 끌어오지 않고 새 빈 채팅 흐름으로 둔다.
      setResumeChecking(false)
      return
    }
    autoResumeAttemptedRef.current = true
    let cancelled = false
    setResumeChecking(true)
    fetchLatestSessionId('destiny').then((id) => {
      if (cancelled) return
      if (id) {
        // 같은 라우트 + ?session= → initialSessionId 로 흘러가 Chat 이 resume.
        // bareEntry=false 가 되면 위 분기가 resumeChecking 을 내린다.
        router.replace(`/destiny-counselor?session=${id}`)
      } else {
        setResumeChecking(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [bareEntry, router])

  const handleBack = useCallback(() => router.back(), [router])
  // Claude-style new chat: drop the chat instance in place by bumping a
  // remount key. No page reload, no loading screen — the Chat tree just
  // remounts with empty state.
  const handleChatReset = useCallback(() => {
    setChatResetKey((k) => k + 1)
  }, [])

  // 대상 인물 변경 — '내 정보 수정'(프로필 저장) / '다른 사람 보기'(임시, 저장 X).
  // 대상 인물 — '내 정보 수정' 하나만. 공용 BirthInfoModal 재사용, 저장되면
  // 갱신된 사주로 새 대화 시작.
  const [birthModalOpen, setBirthModalOpen] = useState(false)
  const openEditMine = useCallback(() => {
    setBirthModalOpen(true)
  }, [])
  const handleBirthSaved = useCallback(
    (info: StoredBirthInfo) => {
      setBirthModalOpen(false)
      setChatResetKey((k) => k + 1) // 정보 바뀜 → 새 대화로 시작
      router.push(buildCounselorHref(info, '', lang))
    },
    [router, lang]
  )

  // Localized failure messages for rename/delete actions — used both by
  // the in-chat ⋮ menu and the sidebar's swipe actions. We prefer the
  // user's locale via `lang` (matches the rest of this header's ko/en
  // pattern) and append a sign-in hint on 401 since the API requires
  // an authenticated session for these mutations.
  const showActionFailureToast = useCallback(
    (kind: 'rename' | 'delete', status?: number) => {
      const base =
        kind === 'rename'
          ? lang === 'ko'
            ? '이름 변경에 실패했어요. 다시 시도해주세요.'
            : 'Could not rename the chat. Please try again.'
          : lang === 'ko'
            ? '삭제에 실패했어요. 다시 시도해주세요.'
            : 'Could not delete the chat. Please try again.'
      const message =
        status === 401
          ? `${base} ${lang === 'ko' ? '다시 로그인해 주세요.' : 'Please sign in again.'}`
          : base
      toast.error(message)
    },
    [lang, toast]
  )

  // Don't flash the gate while the profile fallback is loading — the
  // user may have valid birth info on their profile that we haven't
  // fetched yet. Keep lightTheme here too so switching past chats doesn't
  // flash the dark/purple base background for ~1s before the chat returns.
  if (profileLoading || resumeChecking) {
    // Same quiet loader the route-level loading.tsx uses — keeps the warm
    // white surface + centered hex mark continuous from the home screen so
    // the in-page fetch reads as the page settling, not a second flash.
    return <CounselorLoading />
  }

  // session=<id> 가 URL 에 있으면 사이드바의 "과거 채팅" 링크로 들어온
  // 케이스 — 저장된 세션이 birth 컨텍스트를 들고 있어서, 게이트가 막으면
  // 안 됨. Chat 컴포넌트가 세션 로드하면서 birth 정보까지 복원함.
  if ((!birthDate || !birthTime) && !initialSessionId) {
    return (
      <main className={`${styles.page} ${styles.lightTheme}`}>
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
        onActionError={({ kind, status }) => showActionFailureToast(kind, status)}
      />
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            type="button"
            data-icon-only="true"
            className={styles.backButton}
            onClick={() => setSidebarOpen(true)}
            aria-label={t('destinyMap.counselor.menu', 'Menu')}
          >
            <span className={styles.backIcon}>{'\u2630'}</span>
          </button>

          <h1 className={styles.headerTitle}>
            {activeSession.title?.trim() || t('destinyMap.counselor.title', 'Destiny Counselor')}
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
                      const trimmed = next?.trim()
                      if (!trimmed) return
                      // Optimistic title update so the header re-renders
                      // immediately. We capture the previous title so we
                      // can roll back if the PATCH fails \u2014 without this,
                      // a failed rename would leave the wrong title in
                      // the header until the next page load.
                      const prevTitle = activeSession.title
                      setActiveSession((s) => ({ ...s, title: trimmed }))
                      let status: number | undefined
                      try {
                        const res = await fetch('/api/counselor/session/list', {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ sessionId: id, title: trimmed }),
                        })
                        status = res.status
                        if (!res.ok) throw new Error(`HTTP ${res.status}`)
                      } catch (err) {
                        logger.warn('[Counselor] rename failed', { err, status })
                        // Roll back the optimistic header title \u2014 only
                        // touch state if the active session is still the
                        // same chat (user may have navigated away during
                        // the in-flight request).
                        setActiveSession((s) =>
                          s.sessionId === id ? { ...s, title: prevTitle } : s
                        )
                        showActionFailureToast('rename', status)
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
                      // Pre-flight: only navigate/reset after the server
                      // confirms deletion. The old code did the reset
                      // unconditionally even on network or HTTP error,
                      // so a failed delete would drop the user into a
                      // blank "new chat" while the row reappeared on the
                      // next sidebar refresh \u2014 looked like silent data
                      // loss. We now gate the reset on res.ok and surface
                      // a localized toast on failure.
                      let status: number | undefined
                      let ok2 = false
                      try {
                        const res = await fetch(
                          `/api/counselor/session/list?sessionId=${encodeURIComponent(id)}`,
                          { method: 'DELETE' }
                        )
                        status = res.status
                        ok2 = res.ok
                        if (!res.ok) throw new Error(`HTTP ${res.status}`)
                      } catch (err) {
                        logger.warn('[Counselor] delete failed', { err, status })
                      }
                      if (!ok2) {
                        showActionFailureToast('delete', status)
                        return
                      }
                      // \uc0c8 \ucc44\ud305\uc73c\ub85c \ub9ac\uc14b \u2014 session \ucffc\ub9ac \ub5bc\uace0 \ud0a4 \uac31\uc2e0\ud574 Chat \uc7ac\ub9c8\uc6b4\ud2b8.
                      router.replace('/destiny-counselor')
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

      {/* 대상 인물 바 — 누르면 바로 '내 정보 수정' 모달. 이름 옆 작은 ✎. */}
      <div className={styles.subjectBarWrap}>
        <button
          type="button"
          className={styles.profileStickyBar}
          onClick={openEditMine}
          aria-label={lang === 'ko' ? '내 정보 수정' : 'Edit my info'}
        >
          <span className={styles.profileStickyDot} aria-hidden="true">
            ●
          </span>
          <span className={styles.profileStickyName}>
            {name?.trim() || (lang === 'ko' ? '나' : 'Me')}
          </span>
          <span className={styles.subjectChevron} aria-hidden="true">
            ✎
          </span>
        </button>
      </div>

      {/* Guest banner removed — fights the Claude-style centered hero
          empty state. Login CTA lives in the page header (top-right)
          and via /api save attempts when guests try to persist. */}

      <div className={styles.chatWrapper}>
        <ErrorBoundary
          fallback={
            <ChatErrorFallback
              error={new Error(lang === 'ko' ? '채팅 오류' : 'Chat error')}
              reset={handleChatReset}
            />
          }
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

      {/* 내 정보 수정 — 공용 BirthInfoModal 재사용. 현재 상담 인물 정보로 채워 연다. */}
      <BirthInfoModal
        open={birthModalOpen}
        initial={currentSubjectInfo}
        onClose={() => setBirthModalOpen(false)}
        onSaved={handleBirthSaved}
        locale={lang}
      />
    </main>
  )
}

function InitialQuestionSender({ question }: { question: string }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      // useSeedEvent 는 detail.text 를 읽는다 — 문자열을 그대로 보내면
      // detail.text 가 undefined 라 자동 전송이 안 됨. { text } 형태로 보낼 것.
      window.dispatchEvent(new CustomEvent('counselor:seed', { detail: { text: question } }))
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
