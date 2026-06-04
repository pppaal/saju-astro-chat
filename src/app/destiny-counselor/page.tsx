'use client'

/* eslint-disable react-hooks/refs --
   useChatActions() 가 ref(chatMenuRef) + 상태(chatMenuOpen, renameModalOpen…)
   + 콜백(toggleChatMenu…)을 한 객체로 반환한다. ref 는 ref={} 로 넘기고 상태/
   콜백은 렌더 중 읽는 게 정상인데, 이 규칙이 객체에 ref 가 하나라도 있으면
   chatActions.* 전체 접근을 "렌더 중 ref 접근" 으로 오인(false positive)한다.
   (compatibility/counselor 의 동일 패턴은 안 걸리는 룰 오작동.) eslint.config
   가 이미 같은 사유로 performance 유틸에 이 룰을 끈 전례와 동일. */

import { useEffect, useCallback, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useI18n } from '@/i18n/I18nProvider'
import { ErrorBoundary, ChatErrorFallback } from '@/components/ErrorBoundary'
import CreditBadge from '@/components/ui/CreditBadge'
import { useToast } from '@/components/ui/Toast'
import CounselorSidebar from '@/components/destiny-map/CounselorSidebar'
import ChatActionModals from '@/components/counselor/ChatActionModals'
import { useChatActions } from '@/lib/counselor/useChatActions'
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
import { useCounselorNewChat } from '@/lib/counselor/useCounselorNewChat'
import { loadPendingChat } from '@/lib/chat/pendingChat'
import { AppHeader, AppHeaderIconButton } from '@/components/ui/AppHeader'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'

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

  // 페이지 헤더에 표시할 활성 세션 정보. Chat 컴포넌트가 onSessionChange
  // 콜백으로 sessionId/title 을 알려준다.
  const [activeSession, setActiveSession] = useState<{
    sessionId: string | null
    title: string | null
  }>({ sessionId: null, title: null })

  // /destiny-counselor?session=<id> — sidebar's past-chats list
  // hands us a saved CounselorChatSession id here. We pass it to <Chat>
  // which resumes the conversation on mount (was previously dropped on
  // the floor, hence "눌러도 안 불러와져").
  const initialSessionId = (Array.isArray(sp.session) ? sp.session[0] : sp.session) ?? undefined

  const {
    chartData,
    sessionId,
    userContext,
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
    // 게스트 진행 드래프트가 있으면(한도→로그인/구매 직전 채팅) 서버 자동 resume
    // 대신 그 드래프트를 복원하도록 bare 진입을 유지한다 — Chat 이 마운트 시 복원.
    // 방금까지 보던 게 가장 최근이라 옛 서버 채팅보다 우선.
    const draft = loadPendingChat<{ messages?: unknown[] }>('destiny')
    if (draft && Array.isArray(draft.messages) && draft.messages.length > 0) {
      setResumeChecking(false)
      return
    }
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

  // Claude-style new chat: drop the chat instance in place by bumping a
  // remount key. No page reload, no loading screen — the Chat tree just
  // remounts with empty state. 세션 정리(드래프트·URL ?session= 제거)는 궁합
  // 상담사와 공유하는 useCounselorNewChat 으로 통일 — 두 상담사의 '새 채팅'
  // 동작이 어긋나지 않게 한 곳에서 처리한다.
  const startNewChat = useCounselorNewChat('/destiny-counselor', 'destiny')
  const handleChatReset = useCallback(() => {
    startNewChat(() => setChatResetKey((k) => k + 1))
  }, [startNewChat])

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

  // 생년월일·출생시간이 없으면 진입하자마자 입력 폼을 띄운다(사용자 요청:
  // "생년월일 없으면 생년월일 폼 줘야지"). 게이트 화면은 없앴지만 — 채팅은
  // 즉시 보이되, 사주 계산에 꼭 필요한 정보가 없으면 폼을 먼저 연다.
  // 단, ?session= 으로 과거 채팅을 복원하는 경우엔 세션이 birth 컨텍스트를
  // 들고 있으므로 강제하지 않는다(profileLoading/resumeChecking 동안에도 대기).
  const autoBirthPromptedRef = useRef(false)
  useEffect(() => {
    if (profileLoading || resumeChecking) return
    if (initialSessionId) return
    if (birthDate && birthTime) return
    if (autoBirthPromptedRef.current) return
    autoBirthPromptedRef.current = true
    setBirthModalOpen(true)
  }, [profileLoading, resumeChecking, initialSessionId, birthDate, birthTime])

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

  // ⋮ 메뉴 + Rename / Delete 모달 — 공용 hook 으로 위임. 옵티미스틱 헤더 갱신,
  // PATCH/DELETE 실패 시 롤백, 401 토스트 안내는 hook 안에서 처리되고 여기는
  // page-specific 정리(URL 리셋, Chat 재마운트, activeSession 비우기)만 담당.
  const chatActions = useChatActions({
    sessionId: activeSession.sessionId,
    title: activeSession.title,
    lang,
    onRenamed: useCallback((nextTitle: string) => {
      // hook 이 optimistic / rollback 둘 다 onRenamed 로 호출 — 항상 받은 값으로
      // 활성 세션 제목 동기화. 다른 세션으로 이동했으면 건드리지 않는다.
      setActiveSession((s) => ({ ...s, title: nextTitle || null }))
    }, []),
    onDeleted: useCallback(() => {
      router.replace('/destiny-counselor')
      handleChatReset()
      setActiveSession({ sessionId: null, title: null })
    }, [router, handleChatReset]),
    // showActionFailureToast 는 (kind, status?) 시그니처 — hook 은
    // ({ kind, status }) 객체를 넘기므로 한 번 풀어준다.
    onError: useCallback(
      ({ kind, status }: { kind: 'rename' | 'delete'; status?: number }) =>
        showActionFailureToast(kind, status),
      [showActionFailureToast]
    ),
  })

  // Don't flash the gate while the profile fallback is loading — the
  // user may have valid birth info on their profile that we haven't
  // fetched yet. Keep lightTheme here too so switching past chats doesn't
  // flash the dark/purple base background for ~1s before the chat returns.
  if (profileLoading || resumeChecking) {
    // Same quiet loader the route-level loading.tsx uses — keeps the warm
    // white surface + centered hex mark continuous from the home screen so
    // the in-page fetch reads as the page settling, not a second flash.
    return <CounselorLoading showChatChrome />
  }

  // 생년월일·출생시간이 없어도 더 이상 게이트 화면으로 막지 않는다 — 바로
  // 채팅을 띄운다(사용자 요청: "바로 채팅창 가야한다"). 사주 계산에 필요한
  // 정보는, 정보 없는 사용자가 첫 메시지를 보낼 때 onSendBlocked 가
  // BirthInfoModal 을 대신 띄워서 받는다(아래 <Chat onSendBlocked> 참조).
  const needsBirthInfo = !birthDate || !birthTime

  return (
    <main className={`${styles.page} ${styles.lightTheme}`}>
      <BodyScrollLock />
      <CounselorSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={handleChatReset}
        lightTheme
        enableGrouping
        fallbackName={name}
        activeSessionId={activeSession.sessionId}
        activeSessionTitle={activeSession.title}
        onActionError={({ kind, status }) => showActionFailureToast(kind, status)}
      />
      <AppHeader
        layout="counselor"
        theme="light"
        onMenuClick={() => setSidebarOpen(true)}
        menuLabel={t('destinyMap.counselor.menu', 'Menu')}
        title={activeSession.title?.trim() || t('destinyMap.counselor.title', 'Destiny Counselor')}
        titleChip={
          <button
            type="button"
            className={styles.profileStickyBar}
            onClick={openEditMine}
            aria-label={lang === 'ko' ? '\ub0b4 \uc815\ubcf4 \uc218\uc815' : 'Edit my info'}
          >
            <span className={styles.profileStickyDot} aria-hidden="true">{'\u25cf'}</span>
            <span className={styles.profileStickyName}>
              {name?.trim() || (lang === 'ko' ? '\ub098' : 'Me')}
            </span>
            <span className={styles.subjectChevron} aria-hidden="true">{'\u270e'}</span>
          </button>
        }
        rightSlot={
          <>
            {activeSession.sessionId && (
              <div ref={chatActions.chatMenuRef} className={styles.chatMenuArea}>
                <AppHeaderIconButton
                  onClick={chatActions.toggleChatMenu}
                  label={lang === 'ko' ? '\ub300\ud654 \uba54\ub274' : 'Chat menu'}
                  aria-expanded={chatActions.chatMenuOpen}
                  aria-haspopup="menu"
                >
                  <span aria-hidden="true">{'\u22ee'}</span>
                </AppHeaderIconButton>
                {chatActions.chatMenuOpen && (
                  <div role="menu" className={styles.chatMenuDropdown}>
                    <button
                      type="button"
                      role="menuitem"
                      className={styles.chatMenuItem}
                      onClick={chatActions.openRenameModal}
                    >
                      <span>{lang === 'ko' ? '\uc774\ub984 \ubcc0\uacbd' : 'Rename'}</span>
                      <span aria-hidden="true" className={styles.chatMenuIcon}>{'\u270e'}</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className={`${styles.chatMenuItem} ${styles.chatMenuItemDanger}`}
                      onClick={chatActions.openDeleteModal}
                    >
                      <span>{lang === 'ko' ? '\uc0ad\uc81c' : 'Delete'}</span>
                      <span aria-hidden="true" className={styles.chatMenuIcon}>{'\ud83d\uddd1'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
            <div className={styles.creditBadgeWrap}>
              <CreditBadge variant="compact" />
            </div>
          </>
        }
        viewTransitionName="app-topbar"
      />

      {/* 대상 인물 바는 이제 헤더 .headerLeft 안에 인라인으로 들어간다 —
          위 헤더 블록 참조(사용자 요청: "me 를 제목 옆으로"). */}

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
            autoScroll={false}
            ragSessionId={sessionId || undefined}
            autoSendSeed
            autoFocus
            initialSessionId={initialSessionId}
            onSessionChange={setActiveSession}
            // inputViewTransitionName 제거 — morph 비활성화. root 크로스페이드만
            // 으로 두 페이지를 잇는다(메인 ↔ 운명상담사 입력창 폭 차이로 인한
            // "툭 늘어나는" 인상 제거).
            onSendBlocked={(_text) => {
              // 생년월일·출생시간이 없으면 전송 대신 입력 모달을 띄운다.
              // (게이트 화면 대체 — 바로 채팅하다가 첫 전송 시 정보 요청.)
              if (needsBirthInfo) {
                setBirthModalOpen(true)
                return true
              }
              return false
            }}
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

      {/* ⋮ 메뉴 Rename / Delete 모달 — 공용 ChatActionModals 로 위임. */}
      <ChatActionModals
        lang={lang}
        currentTitle={activeSession.title}
        renameOpen={chatActions.renameModalOpen}
        onCloseRename={chatActions.closeRenameModal}
        onConfirmRename={chatActions.handleRenameConfirm}
        deleteOpen={chatActions.deleteModalOpen}
        onCloseDelete={chatActions.closeDeleteModal}
        onConfirmDelete={chatActions.handleDeleteConfirm}
      />
    </main>
  )
}

function InitialQuestionSender({ question }: { question: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sentRef = useRef(false)
  useEffect(() => {
    // strict-mode 더블 invoke / 리렌더로 effect 가 다시 돌아도 1회만.
    if (sentRef.current) return
    sentRef.current = true
    const timer = setTimeout(() => {
      // useSeedEvent 는 detail.text 를 읽는다 — 문자열을 그대로 보내면
      // detail.text 가 undefined 라 자동 전송이 안 됨. { text } 형태로 보낼 것.
      window.dispatchEvent(new CustomEvent('counselor:seed', { detail: { text: question } }))
      // 전송 직후 URL 에서 q 를 제거 — 안 그러면 모바일이 백그라운드 탭을
      // 죽였다가 복귀하며 페이지를 reload 할 때 ?q= 가 남아 있어 같은 질문이
      // 또 자동 전송되던 버그. birthDate 등 다른 파라미터는 보존한다. q 가
      // 사라지면 부모에서 initialQuestion 이 undefined 가 되어 이 컴포넌트는
      // 언마운트되고, reload 시에도 재전송되지 않는다. (chatResetKey 와 무관해
      // Chat 은 remount 되지 않으므로 이미 보낸 메시지/스트림은 유지된다.)
      const params = new URLSearchParams(Array.from(searchParams.entries()))
      if (params.has('q')) {
        params.delete('q')
        const qs = params.toString()
        router.replace(qs ? `/destiny-counselor?${qs}` : '/destiny-counselor')
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [question, router, searchParams])

  return null
}

// While the counselor chat is mounted, lock html/body so the whole page can't
// rubber-band, pull-to-refresh, or shift when the mobile URL bar collapses.
// The inner messages panel still scrolls; only the page chrome is pinned.
function BodyScrollLock() {
  useBodyScrollLock()
  return null
}
