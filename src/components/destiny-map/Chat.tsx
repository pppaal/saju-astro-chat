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
import { generateMessageId, buildReturningSummary } from './chat-utils'
import type { ChatProps } from './chat-types'
import { useChatSession } from './hooks/useChatSession'
import { useChatFeedback } from './hooks/useChatFeedback'
import { useFileUpload } from './hooks/useFileUpload'
import { useChatApi } from './hooks/useChatApi'
import { useSeedEvent, useWelcomeBack } from '@/components/chat'
import { MessagesPanel, ChatInputArea } from './chat-panels'

const InlineTarotModal = dynamic(() => import('./InlineTarotModal'), { ssr: false })
const CrisisModal = dynamic(() => import('./modals/CrisisModal'), { ssr: false })
const ChartModal = dynamic(() => import('./charts/ChartModal'), { ssr: false })

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
  } = useChatSession({ lang, initialContext, saju, astro })

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

  const { cvText, cvName, parsingPdf, handleFileUpload, clearFile } = useFileUpload({ lang, setNotice })

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

  const { feedback, handleFeedback } = useChatFeedback({
    sessionIdRef,
    lang,
    messages,
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

  // Birth snapshot persisted alongside the messages so resuming this chat later
  // restores the chart even if the user's global profile is empty. Memoized on
  // the primitive fields so its identity stays stable (won't churn the save
  // effect's debounce on every profile object re-creation).
  const birthMeta = React.useMemo<Record<string, unknown> | undefined>(
    () =>
      profile?.birthDate
        ? {
            name: profile.name,
            birthDate: profile.birthDate,
            birthTime: profile.birthTime,
            birthTimeUnknown: profile.birthTimeUnknown,
            gender: profile.gender,
            city: profile.city,
            latitude: profile.latitude,
            longitude: profile.longitude,
          }
        : undefined,
    [
      profile?.name,
      profile?.birthDate,
      profile?.birthTime,
      profile?.birthTimeUnknown,
      profile?.gender,
      profile?.city,
      profile?.latitude,
      profile?.longitude,
    ]
  )

  React.useEffect(() => {
    setActiveSessionId(sessionIdRef.current)
  }, [sessionIdRef])

  React.useEffect(() => {
    if (!sessionLoaded || messages.length === 0) {
      return
    }

    const payload = JSON.stringify({
      sessionId: sessionIdRef.current,
      locale: lang || 'ko',
      messages: messages.filter((m) => m.role !== 'system'),
      ...(birthMeta ? { meta: birthMeta } : {}),
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
  }, [messages, sessionLoaded, lang, sessionIdRef, birthMeta])

  React.useEffect(() => {
    const handleBeforeUnload = () => {
      if (latestSavePayloadRef.current) {
        navigator.sendBeacon('/api/counselor/session/save', latestSavePayloadRef.current)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  const lastUpdateRef = React.useRef<number>(0)
  React.useEffect(() => {
    if (!sessionLoaded) {
      return
    }

    const visibleMsgs = messages.filter((m) => m.role !== 'system')
    if (visibleMsgs.length < 2) {
      return
    }

    const now = Date.now()
    if (now - lastUpdateRef.current < 30000) {
      return
    }

    const lastMsg = visibleMsgs[visibleMsgs.length - 1]
    if (lastMsg?.role !== 'assistant' || !lastMsg.content || lastMsg.content.length < 50) {
      return
    }

    lastUpdateRef.current = now

    fetch('/api/persona-memory/update-from-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionIdRef.current,
        locale: lang || 'ko',
        messages: visibleMsgs,
        saju: saju || undefined,
        astro: astro || undefined,
      }),
    })
      .then((response) => {
        if (response.ok) {
          logger.debug('[Chat] PersonaMemory auto-updated')
        }
      })
      .catch((error) => {
        logger.warn('[Chat] Failed to update PersonaMemory:', error)
      })
  }, [messages, sessionLoaded, lang, saju, astro, sessionIdRef])

  const { showWelcome: showWelcomeBack } = useWelcomeBack({
    shouldShow: Boolean(userContext?.persona?.sessionCount && userContext.persona.sessionCount > 1),
    displayDuration: CHAT_TIMINGS.WELCOME_BANNER_DURATION,
  })

  const returningSummary = React.useMemo(
    () => buildReturningSummary(userContext?.persona, lang),
    [userContext?.persona, lang]
  )

  React.useEffect(() => {
    if (!returningSummary) {
      return
    }

    setMessages((prev) => {
      const alreadyHas = prev.some(
        (message) => message.role === 'system' && message.content.includes('Returning context')
      )
      if (alreadyHas) {
        return prev
      }
      return [{ role: 'system', content: `Returning context: ${returningSummary}` }, ...prev]
    })
  }, [returningSummary, setMessages])

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

      {showWelcomeBack && (
        <div className={styles.welcomeBackBanner}>
          <span className={styles.welcomeBackSpark} aria-hidden="true">
            {'\u2728'}
          </span>
          <span>{tr.welcomeBack}</span>
        </div>
      )}

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
            <MessagesPanel
              visibleMessages={visibleMessages}
              loading={loading}
              retryCount={retryCount}
              notice={notice}
              followUpQuestions={followUpQuestions}
              feedback={feedback}
              effectiveLang={effectiveLang}
              tr={tr}
              messagesEndRef={messagesEndRef}
              onFeedback={handleFeedback}
              onFollowUp={handleFollowUp}
              styles={styles}
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
