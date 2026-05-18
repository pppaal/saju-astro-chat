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
    startNewChat: hookStartNewChat,
  } = useChatSession({ lang, initialContext, saju, astro })

  const [input, setInput] = React.useState('')
  const [notice, setNotice] = React.useState<string | null>(null)
  const [showTarotModal, setShowTarotModal] = React.useState(false)
  const [showChartModal, setShowChartModal] = React.useState(false)
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null)

  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  const { cvText, cvName, parsingPdf, handleFileUpload } = useFileUpload({ lang, setNotice })

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

  const pendingSaveRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestSavePayloadRef = React.useRef<string | null>(null)

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
    })
  }, [initialSessionId, loadSession])

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
  }

  const startNewChat = () => {
    hookStartNewChat()
    setActiveSessionId(sessionIdRef.current)
    setFollowUpQuestions([])
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
    <div className={styles.chatContainer}>
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
          <span className={styles.welcomeBackSpark} aria-hidden="true">{'\u2728'}</span>
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
                      ? (effectiveLang === 'ko' ? '\uC624\uB298' : 'Today')
                      : bucket === 'week'
                      ? (effectiveLang === 'ko' ? '\uC9C0\uB09C 7\uC77C' : 'Previous 7 Days')
                      : (effectiveLang === 'ko' ? '\uC774\uC804' : 'Older')
                  return (
                    <div key={bucket} className={styles.historyRailGroup}>
                      <h3 className={styles.historyRailGroupLabel}>{groupLabel}</h3>
                      {items.map((session) => (
                        <button
                          key={session.id}
                          type="button"
                          className={`${styles.historyRailItem} ${
                            activeSessionId === session.id ? styles.historyRailItemActive : ''
                          }`}
                          onClick={() => void handleLoadSession(session.id)}
                        >
                          <span className={styles.historyRailItemSummary}>
                            {session.summary?.slice(0, 60) ||
                              (effectiveLang === 'ko'
                                ? '\uC800\uC7A5\uB41C \uC0C1\uB2F4 \uAE30\uB85D'
                                : 'Saved conversation')}
                          </span>
                          <span className={styles.historyRailItemMeta}>
                            {session.messageCount} {tr.messages}
                          </span>
                        </button>
                      ))}
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
              {effectiveLang === 'ko' ? '\uD0C0\uB85C \uCE74\uB4DC \uBF51\uAE30' : 'Draw tarot cards'}
            </button>
            <button
              type="button"
              className={styles.historyRailFooterBtn}
              onClick={() => setShowChartModal(true)}
              title={effectiveLang === 'ko' ? '\uB098\uC758 \uC6B4\uBA85 \uCC28\uD2B8' : 'My destiny chart'}
            >
              <span className={styles.historyRailFooterBtnIcon} aria-hidden="true">
                {'\u2728'}
              </span>
              {effectiveLang === 'ko' ? '\uB098\uC758 \uC6B4\uBA85 \uCC28\uD2B8' : 'My destiny chart'}
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
        initialConcern={extractConcernFromMessages()}
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
