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
import { getSuggestedQuestions } from './chat-followups'
import type { ChatProps } from './chat-types'
import { useChatSession } from './hooks/useChatSession'
import { useChatFeedback } from './hooks/useChatFeedback'
import { useFileUpload } from './hooks/useFileUpload'
import { useChatApi } from './hooks/useChatApi'
import { useSeedEvent, useWelcomeBack } from '@/components/chat'
import { MessagesPanel, ChatInputArea } from './chat-panels'

const InlineTarotModal = dynamic(() => import('./InlineTarotModal'), { ssr: false })
const CrisisModal = dynamic(() => import('./modals/CrisisModal'), { ssr: false })
const HistoryModal = dynamic(() => import('./modals/HistoryModal'), { ssr: false })

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
    deleteConfirmId,
    setDeleteConfirmId,
    loadSessionHistory,
    loadSession,
    deleteSession,
    startNewChat: hookStartNewChat,
  } = useChatSession({ lang, initialContext, saju, astro })

  const [input, setInput] = React.useState('')
  const [notice, setNotice] = React.useState<string | null>(null)
  const [showTarotModal, setShowTarotModal] = React.useState(false)
  const [showSuggestions, setShowSuggestions] = React.useState(true)
  const [showHistoryModal, setShowHistoryModal] = React.useState(false)
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
      setShowSuggestions(false)
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

  const handleSuggestion = React.useCallback((question: string) => {
    setInput(question)
    setShowSuggestions(false)
  }, [])

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

  const formatRelativeDate = React.useCallback(
    (dateStr: string) => {
      const date = new Date(dateStr)
      const now = new Date()
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

      if (diffDays === 0) {
        return tr.today
      }
      if (diffDays === 1) {
        return tr.yesterday
      }
      return `${diffDays} ${tr.daysAgo}`
    },
    [tr.today, tr.yesterday, tr.daysAgo]
  )

  const openHistoryModal = () => {
    setShowHistoryModal(true)
    void loadSessionHistory()
  }

  const handleLoadSession = async (sessionId: string) => {
    await loadSession(sessionId)
    setActiveSessionId(sessionId)
    setShowHistoryModal(false)
  }

  const startNewChat = () => {
    hookStartNewChat()
    setActiveSessionId(sessionIdRef.current)
    setShowHistoryModal(false)
    setFollowUpQuestions([])
    setShowSuggestions(true)
  }

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
  const suggestedQs = getSuggestedQuestions(lang)
  const railSessions = sessionHistory.slice(0, 8)

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

      <HistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        sessions={sessionHistory}
        loading={historyLoading}
        deleteConfirmId={deleteConfirmId}
        onLoadSession={handleLoadSession}
        onDeleteSession={deleteSession}
        onDeleteConfirm={setDeleteConfirmId}
        onNewChat={startNewChat}
        formatRelativeDate={formatRelativeDate}
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
            <span className={styles.historyRailEyebrow}>
              {effectiveLang === 'ko' ? '\uAE30\uB85D' : 'History'}
            </span>
            <h2 className={styles.historyRailTitle}>{tr.previousChats}</h2>
          </div>

          <div className={styles.historyRailActions}>
            <button
              type="button"
              className={`${styles.sessionBtn} ${styles.historyRailAction}`}
              onClick={startNewChat}
              title={tr.newChat}
            >
              {'\u2728'} {tr.newChat}
            </button>
            <button
              type="button"
              className={`${styles.sessionBtn} ${styles.historyRailAction}`}
              onClick={openHistoryModal}
              title={tr.previousChats}
            >
              {'\uD83D\uDCDC'}{' '}
              {effectiveLang === 'ko'
                ? '\uC804\uCCB4 \uAE30\uB85D \uBCF4\uAE30'
                : 'See all history'}
            </button>
          </div>

          <div className={styles.historyRailList}>
            {historyLoading ? (
              <div className={styles.historyRailEmpty}>
                {effectiveLang === 'ko' ? '\uBD88\uB7EC\uC624\uB294 \uC911...' : 'Loading...'}
              </div>
            ) : railSessions.length === 0 ? (
              <div className={styles.historyRailEmpty}>
                {effectiveLang === 'ko'
                  ? '\uC544\uC9C1 \uC800\uC7A5\uB41C \uC0C1\uB2F4 \uAE30\uB85D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.'
                  : 'No saved conversations yet.'}
              </div>
            ) : (
              railSessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  className={`${styles.historyRailItem} ${
                    activeSessionId === session.id ? styles.historyRailItemActive : ''
                  }`}
                  onClick={() => void handleLoadSession(session.id)}
                >
                  <span className={styles.historyRailItemDate}>
                    {formatRelativeDate(session.updatedAt)}
                  </span>
                  <span className={styles.historyRailItemMeta}>
                    {session.messageCount} {tr.messages}
                  </span>
                  <span className={styles.historyRailItemSummary}>
                    {session.summary?.slice(0, 80) ||
                      (effectiveLang === 'ko'
                        ? '\uC800\uC7A5\uB41C \uC0C1\uB2F4 \uAE30\uB85D'
                        : 'Saved conversation')}
                  </span>
                </button>
              ))
            )}
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
              showSuggestions={showSuggestions}
              suggestedQs={suggestedQs}
              followUpQuestions={followUpQuestions}
              feedback={feedback}
              effectiveLang={effectiveLang}
              tr={tr}
              messagesEndRef={messagesEndRef}
              onSuggestion={handleSuggestion}
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
              onOpenTarot={goToTarot}
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
    </div>
  )
})

export default Chat
