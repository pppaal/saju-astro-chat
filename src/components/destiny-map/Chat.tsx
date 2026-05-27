// src/components/destiny-map/Chat.tsx
// Refactored: decomposed into hooks (useFileUpload, useChatApi) and sub-components (MessagesPanel, ChatInputArea)

'use client'

import React, { memo } from 'react'
import dynamic from 'next/dynamic'
import styles from './Chat.module.css'
import { type TarotResultSummary } from './InlineTarotModal'
import { logger } from '@/lib/logger'
import { CHAT_I18N } from './chat-i18n'
import { CHAT_TIMINGS } from './chat-constants'
import { generateMessageId } from './chat-utils'
import type { ChatProps } from './chat-types'
import { useChatSession } from './hooks/useChatSession'
import { useFileUpload } from './hooks/useFileUpload'
import { useChatApi } from './hooks/useChatApi'
import { useSeedEvent } from '@/components/chat'
import { MessagesPanel, ChatInputArea } from './chat-panels'
import { useClarifierCard } from '@/hooks/useClarifierCard'

const InlineTarotModal = dynamic(() => import('./InlineTarotModal'), { ssr: false })
const CrisisModal = dynamic(() => import('./modals/CrisisModal'), { ssr: false })
const ChartModal = dynamic(() => import('./charts/ChartModal'), { ssr: false })
const ClarifierCardModal = dynamic(() => import('@/components/tarot/ClarifierCardModal'), {
  ssr: false,
})

const Chat = memo(function Chat({
  profile,
  initialContext = '',
  lang = 'ko',
  seedEvent = 'chat:seed',
  saju,
  astro,
  advancedAstro,
  predictionContext,
  userContext,
  chatSessionId: _chatSessionId,
  onSaveMessage,
  autoScroll = true,
  ragSessionId,
  autoSendSeed = false,
  autoFocus = false,
  initialSessionId,
  onSessionChange,
}: ChatProps) {
  const effectiveLang = lang === 'ko' ? 'ko' : 'en'
  const tr = CHAT_I18N[effectiveLang]

  const {
    sessionIdRef,
    messages,
    setMessages,
    sessionLoaded,
    sessionHistory,
    historyLoading,
    loadSessionHistory,
    loadSession,
    deleteSession,
    renameSession,
    deleteConfirmId,
    setDeleteConfirmId,
    startNewChat: hookStartNewChat,
  } = useChatSession({ lang, initialContext })

  const [renamingId, setRenamingId] = React.useState<string | null>(null)
  const [renameValue, setRenameValue] = React.useState('')


  const [input, setInput] = React.useState('')
  const [notice, setNotice] = React.useState<string | null>(null)
  const [showTarotModal, setShowTarotModal] = React.useState(false)
  const [showChartModal, setShowChartModal] = React.useState(false)
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null)

  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  // Jump to the newest message once a loaded conversation has painted
  // (past-chat open should land at the latest message, not the top).
  const scrollToLatest = React.useCallback(() => {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }))
    )
  }, [])

  // 클래리파이어 직후엔 자동 스크롤 hijack 을 잠시 끈다 — 사용자가 이미
  // 채팅 맨 하단의 "한 장 더 뽑기" 버튼을 본 상태이고, 그대로 카드 메시지/
  // 답변이 거기 쌓이는 게 자연스러움. 일반 useEffect 의 scrollIntoView 가
  // 답변 끝까지 매 토큰 따라가버리면 viewport 가 위로 밀려나 "왜 다시
  // 올라가냐" 회귀.
  const suspendAutoScrollRef = React.useRef(false)

  const { cvText, cvName, parsingPdf, handleFileUpload, clearFile } = useFileUpload({
    lang,
    setNotice,
  })

  const {
    loading,
    retryCount,
    connectionStatus,
    usedFallback,
    guestMode: _guestMode, // banner removed; flag still used by hook internals
    followUpQuestions,
    setFollowUpQuestions,
    handleSend: apiHandleSend,
    showCrisisModal,
    setShowCrisisModal,
  } = useChatApi({
    sessionIdRef,
    messages,
    setMessages,
    profile,
    lang,
    saju,
    astro,
    advancedAstro,
    predictionContext,
    userContext,
    cvText,
    ragSessionId,
    autoScroll,
    messagesEndRef,
    onSaveMessage,
    setNotice,
  })

  const handleSend = React.useCallback(
    async (directText?: string) => {
      const text = directText || input.trim()
      if (!text) {
        return
      }
      setInput('')
      await apiHandleSend(text)
    },
    [input, apiHandleSend]
  )

  const handleSendRef = React.useRef<(text?: string) => Promise<void>>(null!)
  React.useEffect(() => {
    handleSendRef.current = handleSend
  }, [handleSend])

  const handleFollowUp = React.useCallback(
    (question: string) => {
      setFollowUpQuestions([])
      setInput('')
      handleSendRef.current(question)
    },
    [setFollowUpQuestions]
  )


  // #3 답변 직후 첫 후속질문을 입력창에 미리 채운다 — 사용자는 엔터로 바로 보내거나,
  // 입력창의 X(지우기)로 싹 비우고 자기 질문을 새로 쓸 수 있다. 이미 뭔가 입력 중이면
  // 덮어쓰지 않는다(직후엔 전송으로 비워져 있어 안전).
  React.useEffect(() => {
    if (followUpQuestions.length > 0) {
      setInput((prev) => (prev.trim() ? prev : followUpQuestions[0]))
    }
  }, [followUpQuestions])

  const pendingSaveRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestSavePayloadRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    setActiveSessionId(sessionIdRef.current)
  }, [sessionIdRef])

  // 페이지 헤더가 현재 채팅 제목 + ⋮ 메뉴를 띄울 수 있도록 활성 session 정보를
  // 부모로 전달. activeSessionId 가 바뀔 때 + sessionHistory 가 갱신될 때마다.
  React.useEffect(() => {
    if (!onSessionChange || !activeSessionId) return
    const current = sessionHistory.find((s) => s.id === activeSessionId)
    onSessionChange({ sessionId: activeSessionId, title: current?.title ?? null })
  }, [activeSessionId, sessionHistory, onSessionChange])

  React.useEffect(() => {
    if (!sessionLoaded || messages.length === 0) {
      return
    }

    const payload = JSON.stringify({
      sessionId: sessionIdRef.current,
      locale: lang || 'ko',
      messages: messages.filter((m) => m.role !== 'system'),
    })
    latestSavePayloadRef.current = payload

    if (pendingSaveRef.current) {
      clearTimeout(pendingSaveRef.current)
    }

    pendingSaveRef.current = setTimeout(async () => {
      pendingSaveRef.current = null
      latestSavePayloadRef.current = null

      try {
        await fetch('/api/counselor/session/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
        })
        logger.debug('[Chat] Session auto-saved:', { messageCount: messages.length })
      } catch (error) {
        logger.warn('[Chat] Failed to save session:', error)
      }
    }, CHAT_TIMINGS.DEBOUNCE_SAVE)

    return () => {
      if (pendingSaveRef.current) {
        clearTimeout(pendingSaveRef.current)
      }
    }
  }, [messages, sessionLoaded, lang, sessionIdRef])

  React.useEffect(() => {
    const handleBeforeUnload = () => {
      if (latestSavePayloadRef.current) {
        navigator.sendBeacon('/api/counselor/session/save', latestSavePayloadRef.current)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  useSeedEvent({
    eventName: seedEvent,
    onSeed: (seedText) => {
      setInput(seedText)
      if (autoSendSeed) {
        handleSendRef.current?.(seedText)
      }
    },
  })

  React.useEffect(() => {
    if (!autoScroll) {
      return
    }
    if (suspendAutoScrollRef.current) {
      return
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, autoScroll])

  React.useEffect(() => {
    void loadSessionHistory()
  }, [loadSessionHistory])

  // Resume a past session when the page hands us an id (e.g. from
  // /destiny-map/counselor?session=…). Guarded so we only hit the
  // load endpoint once per id, even if the parent rerenders.
  const resumedSessionIdRef = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (!initialSessionId) return
    if (resumedSessionIdRef.current === initialSessionId) return
    resumedSessionIdRef.current = initialSessionId
    void loadSession(initialSessionId).then(() => {
      setActiveSessionId(initialSessionId)
      scrollToLatest()
    })
  }, [initialSessionId, loadSession, scrollToLatest])

  const goToTarot = React.useCallback(() => setShowTarotModal(true), [])

  // 🃏 클래리파이어 카드 — 공통 hook (compat/followup 동일). 정책 단일 출처.
  const clarifier = useClarifierCard({
    lang: effectiveLang,
    onSendUserText: (text) => {
      void handleSendRef.current?.(text)
    },
    onLockedNotice: setNotice,
    suspendAutoScrollRef,
  })

  const handleTarotComplete = (result: TarotResultSummary) => {
    const cardsSummary = result.cards
      .map(
        (card) =>
          `\u2022 ${card.position}: ${card.name}${card.isReversed ? ' (\uC5ED\uBC29\uD5A5)' : ''}`
      )
      .join('\n')

    const tarotMessage = `\uD83C\uDCCF **\uD0C0\uB85C \uB9AC\uB529 \uACB0\uACFC** - ${result.spreadTitle}

**\uC9C8\uBB38:** ${result.question}

**\uBF51\uC740 \uCE74\uB4DC:**
${cardsSummary}

**\uC804\uCCB4 \uBA54\uC2DC\uC9C0:**
${result.overallMessage}${result.guidance ? `\n\n**\uC870\uC5B8:** ${result.guidance}` : ''}${result.affirmation ? `\n\n**\uD655\uC5B8:** _${result.affirmation}_` : ''}`

    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: tarotMessage,
        id: generateMessageId('assistant'),
      },
    ])
  }

  const handleLoadSession = async (sessionId: string) => {
    await loadSession(sessionId)
    setActiveSessionId(sessionId)
    scrollToLatest()
  }

  const startNewChat = () => {
    hookStartNewChat()
    setActiveSessionId(sessionIdRef.current)
    setFollowUpQuestions([])
    clarifier.reset()
  }

  // ---- Rename / delete a past chat (desktop rail) ----
  const sessionLabel = (s: { title?: string; summary?: string }) =>
    s.title?.trim() ||
    s.summary?.slice(0, 60) ||
    (effectiveLang === 'ko' ? '저장된 상담 기록' : 'Saved conversation')

  const startRename = (s: { id: string; title?: string; summary?: string }) => {
    setRenamingId(s.id)
    setRenameValue(s.title?.trim() || s.summary?.slice(0, 60) || '')
    setDeleteConfirmId(null)
  }
  const cancelRename = () => {
    setRenamingId(null)
    setRenameValue('')
  }
  const commitRename = async () => {
    const id = renamingId
    if (!id) {
      return
    }
    const next = renameValue.trim()
    if (next) {
      await renameSession(id, next)
    }
    cancelRename()
  }
  const handleDeleteSession = async (id: string) => {
    await deleteSession(id)
    if (activeSessionId === id) {
      startNewChat()
    }
  }

  // History grouping for sidebar — Today / Previous 7 Days / Older.
  // Buckets stay tight to the mockup: a session that hasn't been touched
  // since yesterday-midnight falls into "Previous 7 Days".
  const groupedHistory = React.useMemo(() => {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const sevenDaysAgo = startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000
    const today: typeof sessionHistory = []
    const week: typeof sessionHistory = []
    const older: typeof sessionHistory = []
    for (const s of sessionHistory) {
      const t = new Date(s.updatedAt).getTime()
      if (t >= startOfToday.getTime()) today.push(s)
      else if (t >= sevenDaysAgo) week.push(s)
      else older.push(s)
    }
    return { today, week, older }
  }, [sessionHistory])

  const extractConcernFromMessages = React.useCallback(() => {
    const userMessages = messages.filter((m) => m.role === 'user').map((m) => m.content)
    return userMessages.slice(-2).join(' ').slice(0, 200)
  }, [messages])

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void handleSend()
    }
  }

  const visibleMessages = messages.filter((m) => m.role !== 'system')

  return (
    <div className={`${styles.chatContainer} ${styles.lightTheme}`}>
      {connectionStatus === 'offline' && (
        <div className={`${styles.connectionStatus} ${styles[connectionStatus]}`}>
          {'\uD83D\uDCE1 Connection lost - Check your internet'}
        </div>
      )}

      <CrisisModal
        isOpen={showCrisisModal}
        onClose={() => setShowCrisisModal(false)}
        tr={tr}
        styles={styles}
      />

      <div className={styles.chatLayout}>
        <aside className={styles.historyRail} aria-label={tr.previousChats}>
          <div className={styles.historyRailHeader}>
            <h2 className={styles.historyRailTitle}>
              {'\u2728'} {effectiveLang === 'ko' ? 'DestinyPal' : 'DestinyPal'}
            </h2>
          </div>

          <div className={styles.historyRailActions}>
            <button
              type="button"
              className={`${styles.sessionBtn} ${styles.historyRailAction} ${styles.historyRailActionPrimary}`}
              onClick={startNewChat}
              title={tr.newChat}
            >
              {'+'} {tr.newChat}
            </button>
          </div>

          <div className={styles.historyRailList}>
            {historyLoading ? (
              <div className={styles.historyRailEmpty}>
                {effectiveLang === 'ko' ? '\uBD88\uB7EC\uC624\uB294 \uC911...' : 'Loading...'}
              </div>
            ) : sessionHistory.length === 0 ? (
              <div className={styles.historyRailEmpty}>
                {effectiveLang === 'ko'
                  ? '\uC544\uC9C1 \uC800\uC7A5\uB41C \uC0C1\uB2F4 \uAE30\uB85D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.'
                  : 'No saved conversations yet.'}
              </div>
            ) : (
              <>
                {(['today', 'week', 'older'] as const).map((bucket) => {
                  const items = groupedHistory[bucket]
                  if (items.length === 0) return null
                  const groupLabel =
                    bucket === 'today'
                      ? effectiveLang === 'ko'
                        ? '\uC624\uB298'
                        : 'Today'
                      : bucket === 'week'
                        ? effectiveLang === 'ko'
                          ? '\uC9C0\uB09C 7\uC77C'
                          : 'Previous 7 Days'
                        : effectiveLang === 'ko'
                          ? '\uC774\uC804'
                          : 'Older'
                  return (
                    <div key={bucket} className={styles.historyRailGroup}>
                      <h3 className={styles.historyRailGroupLabel}>{groupLabel}</h3>
                      {items.map((session) => {
                        const isRenaming = renamingId === session.id
                        const isConfirming = deleteConfirmId === session.id
                        return (
                          <div
                            key={session.id}
                            className={`${styles.historyRailItem} ${
                              activeSessionId === session.id ? styles.historyRailItemActive : ''
                            }`}
                          >
                            {isRenaming ? (
                              <input
                                autoFocus
                                className={styles.historyRailRenameInput}
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    void commitRename()
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault()
                                    cancelRename()
                                  }
                                }}
                                onBlur={() => void commitRename()}
                                maxLength={80}
                                placeholder={sessionLabel(session)}
                              />
                            ) : isConfirming ? (
                              <div className={styles.historyRailConfirm}>
                                <span className={styles.historyRailConfirmText}>
                                  {effectiveLang === 'ko'
                                    ? '\uC0AD\uC81C\uD560\uAE4C\uC694?'
                                    : 'Delete?'}
                                </span>
                                <button
                                  type="button"
                                  className={styles.historyRailConfirmYes}
                                  onClick={() => void handleDeleteSession(session.id)}
                                >
                                  {effectiveLang === 'ko' ? '\uC0AD\uC81C' : 'Delete'}
                                </button>
                                <button
                                  type="button"
                                  className={styles.historyRailConfirmNo}
                                  onClick={() => setDeleteConfirmId(null)}
                                >
                                  {effectiveLang === 'ko' ? '\uCDE8\uC18C' : 'Cancel'}
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className={styles.historyRailItemMain}
                                  onClick={() => void handleLoadSession(session.id)}
                                >
                                  <span className={styles.historyRailItemSummary}>
                                    {sessionLabel(session)}
                                  </span>
                                  <span className={styles.historyRailItemMeta}>
                                    {session.messageCount} {tr.messages}
                                  </span>
                                </button>
                                <div className={styles.historyRailItemActions}>
                                  <button
                                    type="button"
                                    className={styles.historyRailItemAction}
                                    onClick={() => startRename(session)}
                                    aria-label={
                                      effectiveLang === 'ko'
                                        ? '\uC774\uB984 \uBCC0\uACBD'
                                        : 'Rename'
                                    }
                                    title={
                                      effectiveLang === 'ko'
                                        ? '\uC774\uB984 \uBCC0\uACBD'
                                        : 'Rename'
                                    }
                                  >
                                    \u270E
                                  </button>
                                  <button
                                    type="button"
                                    className={`${styles.historyRailItemAction} ${styles.historyRailItemActionDanger}`}
                                    onClick={() => setDeleteConfirmId(session.id)}
                                    aria-label={effectiveLang === 'ko' ? '\uC0AD\uC81C' : 'Delete'}
                                    title={effectiveLang === 'ko' ? '\uC0AD\uC81C' : 'Delete'}
                                  >
                                    \uD83D\uDDD1
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </>
            )}
          </div>

          <div className={styles.historyRailFooter}>
            <button
              type="button"
              className={styles.historyRailFooterBtn}
              onClick={goToTarot}
              title={tr.tarotButton}
            >
              <span className={styles.historyRailFooterBtnIcon} aria-hidden="true">
                {'\uD83C\uDCCF'}
              </span>
              {effectiveLang === 'ko'
                ? '\uB2E4\uC74C \uC9C8\uBB38 \uD0C0\uB85C\uB85C \uBCF4\uAE30'
                : 'See your next question in tarot'}
            </button>
            <button
              type="button"
              className={styles.historyRailFooterBtn}
              {...clarifier.buttonProps}
            >
              <span className={styles.historyRailFooterBtnIcon} aria-hidden="true">
                {'\uD83C\uDCCF'}
              </span>
              {clarifier.buttonLabel}
            </button>
            <button
              type="button"
              className={styles.historyRailFooterBtn}
              onClick={() => setShowChartModal(true)}
              title={
                effectiveLang === 'ko'
                  ? '\uB098\uC758 \uC6B4\uBA85 \uCC28\uD2B8'
                  : 'My destiny chart'
              }
            >
              <span className={styles.historyRailFooterBtnIcon} aria-hidden="true">
                {'\u2728'}
              </span>
              {effectiveLang === 'ko'
                ? '\uB098\uC758 \uC6B4\uBA85 \uCC28\uD2B8'
                : 'My destiny chart'}
            </button>
          </div>
        </aside>

        <section className={styles.chatMain}>
          {/* Removed: guestModeBar (page already shows its own login banner),
              sessionButtons row (\u2728\uC0C8 \uB300\uD654 / \uD83D\uDCDC\uC774\uC804 \uB300\uD654 \u2014 chrome that
              competed with the empty-state hero), conversationHeader
              (\uD604\uC7AC \uC0C1\uB2F4 / \uCE74\uC6B4\uC2AC\uB9C1 \uCC44\uD305 / N\uAC1C \uBA54\uC2DC\uC9C0). The Claude.ai
              mobile shape uses a single big hero + bottom-fixed input.
              History entry point lives in the rail (desktop) or via
              keyboard "/" shortcut. */}

          <div className={styles.conversationShell}>
            {/* ⋮ 메뉴는 페이지 헤더(counselor/page.tsx)로 이동 (PR #625) —
                여기에 있던 옛 JSX 와 chatMenuOpen/Ref/handler 들은 dead.
                중복 렌더 + 색상 톤 충돌 회피 위해 제거. */}

            <MessagesPanel
              visibleMessages={visibleMessages}
              loading={loading}
              retryCount={retryCount}
              notice={notice}
              followUpQuestions={followUpQuestions}
              effectiveLang={effectiveLang}
              tr={tr}
              messagesEndRef={messagesEndRef}
              onFollowUp={handleFollowUp}
              styles={styles}
              userName={profile?.name}
              onOpenClarifier={clarifier.buttonProps.onClick}
              clarifierUsed={clarifier.isLocked}
            />

            <ChatInputArea
              input={input}
              loading={loading}
              cvName={cvName}
              parsingPdf={parsingPdf}
              usedFallback={usedFallback}
              tr={tr}
              lang={lang}
              onInputChange={setInput}
              onKeyDown={onKeyDown}
              onSend={() => void handleSend()}
              onFileUpload={handleFileUpload}
              onClearFile={clearFile}
              onOpenTarot={goToTarot}
              onOpenChart={() => setShowChartModal(true)}
              styles={styles}
              autoFocus={autoFocus}
            />
          </div>
        </section>
      </div>

      <InlineTarotModal
        isOpen={showTarotModal}
        onClose={() => setShowTarotModal(false)}
        onComplete={handleTarotComplete}
        lang={lang}
        profile={profile}
        initialConcern={followUpQuestions[0] || extractConcernFromMessages()}
      />

      <ClarifierCardModal {...clarifier.modalProps} />

      <ChartModal
        open={showChartModal}
        onClose={() => setShowChartModal(false)}
        saju={saju}
        astro={astro}
        lang={effectiveLang}
      />
    </div>
  )
})

export default Chat
