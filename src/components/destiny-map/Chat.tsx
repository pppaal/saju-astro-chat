// src/components/destiny-map/Chat.tsx
// Refactored: decomposed into hooks (useFileUpload, useChatApi) and sub-components (MessagesPanel, ChatInputArea)

'use client'

import React, { memo } from 'react'
import dynamic from 'next/dynamic'
import styles from './Chat.module.css'
import { type TarotResultSummary } from './InlineTarotModal'
import { CHAT_I18N } from './chat-i18n'
import { generateMessageId } from './chat-utils'
import type { ChatProps } from './chat-types'
import { useChatSession } from './hooks/useChatSession'
import { useFileUpload } from './hooks/useFileUpload'
import { useChatApi } from './hooks/useChatApi'
import { useSeedEvent } from '@/components/chat'
import { MessagesPanel, ChatInputArea } from './chat-panels'
import { useToolHint } from '@/components/chat/ToolHint'
import { useClarifierCard } from '@/hooks/useClarifierCard'
import { useChatAutoScroll } from '@/hooks/useChatAutoScroll'
import { useChatAutoSave } from '@/hooks/useChatAutoSave'

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

  const messagesEndRef = React.useRef<HTMLDivElement | null>(null)
  // 클래리파이어 직후 자동 스크롤 hijack 끄기 — 자세한 정책은
  // useClarifierCard 참조. 3 화면 공통.
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
    async (directText?: string, options?: { isRetry?: boolean }) => {
      const text = directText || input.trim()
      if (!text) {
        return
      }
      setInput('')
      await apiHandleSend(text, options)
    },
    [input, apiHandleSend]
  )

  const handleSendRef = React.useRef<
    (text?: string, options?: { isRetry?: boolean }) => Promise<void>
  >(null!)
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

  // "다시 시도" — 마지막 assistant 답변이 잘렸을 때만 노출. 잘린 답 + 직전 user
  // 메시지를 함께 pop 한 뒤 isRetry: true 로 재요청. useChatApi 가 직전 turn 의
  // idempotencyKey 를 재사용해 서버가 idempotent replay 분기를 타게 한다 — 부분
  // 응답 후 끊긴 케이스에서 이미 차감된 credit 위에 또 차감되는 누수를 막는다.
  const handleRetryLastAnswer = React.useCallback(() => {
    if (loading) return
    const len = messages.length
    if (len < 2) return
    if (messages[len - 1].role !== 'assistant') return
    if (messages[len - 2].role !== 'user') return
    const lastUserText = messages[len - 2].content
    setMessages((prev) => prev.slice(0, -2))
    setFollowUpQuestions([])
    // handleSendRef.current 의 시그니처는 (directText?, options?) — Chat.tsx 의
    // handleSend wrapper 가 이 두 번째 인자를 useChatApi.handleSend 에 그대로
    // forward 하므로 retry flag 가 끝까지 전달된다.
    void handleSendRef.current?.(lastUserText, { isRetry: true })
  }, [loading, messages, setMessages, setFollowUpQuestions])


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

  // 자동 저장 — 공통 hook (debounce + beforeunload sendBeacon).
  // sessionIdRef 를 그대로 넘기면 새 채팅 시작(startNewChat) 시 ref 가 바뀌어도
  // 다음 저장에 새 id 가 사용된다 (current 평가는 effect 안).
  useChatAutoSave({
    enabled: sessionLoaded,
    sessionId: sessionIdRef,
    locale: lang || 'ko',
    messages,
  })

  useSeedEvent({
    eventName: seedEvent,
    onSeed: (seedText) => {
      setInput(seedText)
      if (autoSendSeed) {
        handleSendRef.current?.(seedText)
      }
    },
  })

  // 자동 스크롤 — 공통 hook (3 화면 통합). messagesEndRef 는 위에서
  // 이미 만들어 useChatApi prop 으로 전달 중이라 externalRef 로 그대로 활용.
  const { scrollToBottomImmediate: scrollToLatest } = useChatAutoScroll({
    messages,
    loading,
    enabled: autoScroll,
    suspendRef: suspendAutoScrollRef,
    externalRef: messagesEndRef,
  })

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

  // 입력창 도구 안내 — 첫 답변 후 ~ 3 user 턴까지만 1회. 도구 사용 시 자동 dismiss.
  const { dismissed: toolHintDismissed, dismiss: dismissToolHint } = useToolHint('destiny')

  const goToTarot = React.useCallback(() => {
    dismissToolHint()
    setShowTarotModal(true)
  }, [dismissToolHint])
  const goToChart = React.useCallback(() => {
    dismissToolHint()
    setShowChartModal(true)
  }, [dismissToolHint])

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

          {/* \uC0AC\uC774\uB4DC\uBC14 footer \uC758 \uD0C0\uB85C/\uCE74\uB4DC \uBF51\uAE30/\uCC28\uD2B8 \uBC84\uD2BC \uC81C\uAC70 \u2014 \uC785\uB825\uCC3D \uB3C4\uAD6C\uB85C
              \uD1B5\uC77C (\uB2E8\uC77C \uC9C4\uC785\uC810). \uC0AC\uC774\uB4DC\uBC14\uB294 \uCC44\uD305 \uBAA9\uB85D \uC804\uC6A9. */}
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
              onRetryLastAnswer={handleRetryLastAnswer}
              styles={styles}
              userName={profile?.name}
              onOpenClarifier={clarifier.buttonProps.onClick}
              clarifierUsed={clarifier.isLocked}
              showToolHint={(() => {
                // turn 1 에만 1회 노출. 이전 1~3 turn 매번 노출은 짜증 → 1회 축소.
                const userTurns = visibleMessages.filter((m) => m.role === 'user').length
                const hasAssistantAnswer = visibleMessages.some((m) => m.role === 'assistant')
                return !toolHintDismissed && !loading && hasAssistantAnswer && userTurns === 1
              })()}
              onDismissToolHint={dismissToolHint}
            />

            <ChatInputArea
              input={input}
              loading={loading}
              cvName={cvName}
              parsingPdf={parsingPdf}
              usedFallback={usedFallback}
              labels={{
                placeholder: tr.placeholder,
                send: tr.send,
                uploadCv: tr.uploadCv,
                parsingPdf: tr.parsingPdf,
                fallbackNote: tr.fallbackNote,
              }}
              lang={lang}
              onInputChange={setInput}
              onKeyDown={onKeyDown}
              onSend={() => void handleSend()}
              onFileUpload={async (e) => {
                dismissToolHint()
                await handleFileUpload(e)
              }}
              onClearFile={clearFile}
              onOpenTarot={goToTarot}
              onOpenChart={goToChart}
              autoFocus={autoFocus}
              theme="light"
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
        origin="destiny"
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
