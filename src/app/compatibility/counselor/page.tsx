'use client'

import { useEffect, useState, useRef, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useI18n } from '@/i18n/I18nProvider'
import CreditBadge from '@/components/ui/CreditBadge'
import BrandSplash from '@/components/branding/BrandSplash'
import MarkdownMessage from '@/components/ui/MarkdownMessage'
import CounselorSidebar from '@/components/destiny-map/CounselorSidebar'
import styles from './compatibility-counselor.module.css'
import { logger } from '@/lib/logger'
import { runQuickCoupleTarot } from './runQuickCoupleTarot'
import { streamProcessor } from '@/lib/streaming'

function CounselorLoading() {
  return <BrandSplash message="상담사 준비 중..." />
}

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

type PersonData = {
  name: string
  date: string
  time: string
  city: string
  latitude?: number
  longitude?: number
  timeZone?: string
  relation?: string
}

function formatBirthSnippet(p: PersonData): string {
  const date = p.date || ''
  const time = p.time && p.time !== '12:00' ? ` ${p.time}` : ''
  return `${date}${time}`.trim()
}

function CompatibilityCounselorContent() {
  const { locale } = useI18n()
  const searchParams = useSearchParams()

  const [persons, setPersons] = useState<PersonData[]>([])
  const [person1Saju, setPerson1Saju] = useState<Record<string, unknown> | null>(null)
  const [person2Saju, setPerson2Saju] = useState<Record<string, unknown> | null>(null)
  const [person1Astro, setPerson1Astro] = useState<Record<string, unknown> | null>(null)
  const [person2Astro, setPerson2Astro] = useState<Record<string, unknown> | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Persistent chat session id (returned by /api/counselor/chat-history
  // after the first save). Subsequent saves attach to the same row.
  const [chatSessionId, setChatSessionId] = useState<string | undefined>(undefined)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const isKo = locale === 'ko'

  useEffect(() => {
    if (!searchParams) {
      return
    }

    const initializeData = async () => {
      try {
        // 1) Past-chat resume path: ?session=<id>. Restore both the
        //    conversation and the couple snapshot we saved alongside.
        const sessionParam = searchParams.get('session')
        if (sessionParam) {
          try {
            const res = await fetch(
              `/api/counselor/session/load?sessionId=${encodeURIComponent(sessionParam)}`
            )
            if (res.ok) {
              const loaded = (await res.json()) as {
                session?: {
                  id?: string
                  messages?: ChatMessage[]
                  meta?: {
                    persons?: PersonData[]
                    person1Saju?: Record<string, unknown> | null
                    person2Saju?: Record<string, unknown> | null
                    person1Astro?: Record<string, unknown> | null
                    person2Astro?: Record<string, unknown> | null
                  } | null
                }
              }
              const s = loaded?.session
              if (s?.id) {
                setChatSessionId(s.id)
                if (Array.isArray(s.messages)) {
                  setMessages(
                    s.messages.filter(
                      (m): m is ChatMessage =>
                        !!m && (m.role === 'user' || m.role === 'assistant')
                    )
                  )
                }
                if (s.meta?.persons) setPersons(s.meta.persons)
                if (s.meta?.person1Saju !== undefined)
                  setPerson1Saju(s.meta.person1Saju ?? null)
                if (s.meta?.person2Saju !== undefined)
                  setPerson2Saju(s.meta.person2Saju ?? null)
                if (s.meta?.person1Astro !== undefined)
                  setPerson1Astro(s.meta.person1Astro ?? null)
                if (s.meta?.person2Astro !== undefined)
                  setPerson2Astro(s.meta.person2Astro ?? null)
                return // skip fresh-start path
              }
            }
          } catch (loadErr) {
            logger.warn('[CompatCounselor] resume past chat failed', { error: loadErr })
            // fall through to fresh-start path
          }
        }

        // 2) Fresh-start path: ?persons=... from the form.
        const personsParam = searchParams.get('persons')

        if (personsParam) {
          const parsed = JSON.parse(decodeURIComponent(personsParam)) as PersonData[]
          setPersons(parsed)

          if (parsed.length >= 2) {
            await fetchPersonData(parsed)
          }
        }
      } catch (e) {
        logger.error('Failed to parse URL params:', { error: e })
        setError(isKo ? '데이터를 불러오는 중 오류가 발생했습니다.' : 'Failed to load data.')
      } finally {
        setIsInitializing(false)
      }
    }

    initializeData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const fetchPersonData = async (personList: PersonData[]) => {
    try {
      const sajuPayload = (p: PersonData) => ({
        date: p.date,
        time: p.time,
        latitude: p.latitude || 37.5665,
        longitude: p.longitude || 126.978,
        timeZone: p.timeZone || 'Asia/Seoul',
      })
      const astroPayload = (p: PersonData) => ({
        date: p.date,
        time: p.time,
        latitude: p.latitude || 37.5665,
        longitude: p.longitude || 126.978,
      })

      const [saju1Res, saju2Res, astro1Res, astro2Res] = await Promise.all([
        fetch('/api/saju', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sajuPayload(personList[0])),
        }),
        fetch('/api/saju', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sajuPayload(personList[1])),
        }),
        fetch('/api/astrology', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(astroPayload(personList[0])),
        }),
        fetch('/api/astrology', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(astroPayload(personList[1])),
        }),
      ])

      if (saju1Res.ok) {
        setPerson1Saju(await saju1Res.json())
      }
      if (saju2Res.ok) {
        setPerson2Saju(await saju2Res.json())
      }
      if (astro1Res.ok) {
        setPerson1Astro(await astro1Res.json())
      }
      if (astro2Res.ok) {
        setPerson2Astro(await astro2Res.json())
      }
    } catch (e) {
      logger.error('Failed to fetch person data:', { error: e })
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // dvh layout requires html/body scroll lock — same trick as destiny-counselor.
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

  // Pop the soft keyboard the moment the page is ready. iOS Safari
  // restricts programmatic focus outside a user gesture; this works on
  // desktop + Android, and on iOS at least places the cursor.
  useEffect(() => {
    if (!isInitializing) {
      inputRef.current?.focus()
    }
  }, [isInitializing])

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) {
      return
    }

    const userMessage: ChatMessage = { role: 'user', content: input.trim() }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setError(null)

    try {
      // Send only the most recent turns. The server already clamps to
      // 8 via `clampMessages`, but uploading the full history every
      // turn wastes the user's mobile data + adds round-trip latency
      // for long conversations.
      const recentHistory = [...messages, userMessage].slice(-10)
      const response = await fetch('/api/compatibility/counselor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persons,
          person1Saju,
          person2Saju,
          person1Astro,
          person2Astro,
          lang: locale,
          messages: recentHistory,
          useRag: true,
        }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('login_required')
        }
        throw new Error('Failed to get response')
      }

      // 서버는 `data: {"content":"...","done":false}\n\n` 형식의 JSON SSE를
      // 보낸다. 이전엔 `data:` 라인 뒤의 *JSON 문자열 전체*를 그대로
      // 누적해서 화면에 `{"content":"안","done":false}{"content":"녕"...}`
      // 식의 깨진 텍스트가 나왔다. 운명 상담사가 이미 쓰던 streamProcessor
      // 로 통일 — `content` 필드만 추출해 누적한다.
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

      let finalAssistantContent = ''
      await streamProcessor.process(response, {
        onChunk: (_accumulated, cleaned) => {
          finalAssistantContent = cleaned
          setMessages((prev) => {
            const updated = [...prev]
            if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
              updated[updated.length - 1] = {
                role: 'assistant',
                content: cleaned,
              }
            }
            return updated
          })
        },
        onError: (err) => {
          logger.warn('[CompatCounselor] stream error', { error: err })
        },
      })

      // Persist the exchange so it shows up in the past-chats sidebar
      // next visit. Fire-and-forget; save failure must not block UX.
      if (finalAssistantContent) {
        const isFirstSave = !chatSessionId
        const body: Record<string, unknown> = {
          sessionId: chatSessionId,
          locale: locale === 'ko' ? 'ko' : 'en',
          userMessage: userMessage.content,
          assistantMessage: finalAssistantContent,
          type: 'compat',
        }
        // On the *first* save attach the couple snapshot so a future
        // re-open can restore the chart without recomputing.
        if (isFirstSave) {
          body.meta = {
            persons,
            person1Saju,
            person2Saju,
            person1Astro,
            person2Astro,
          }
        }
        fetch('/api/counselor/chat-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((data: { success?: boolean; session?: { id: string } } | null) => {
            if (data?.success && data.session?.id && !chatSessionId) {
              setChatSessionId(data.session.id)
            }
          })
          .catch((err) =>
            logger.warn('[CompatCounselor] chat-history save failed', { error: err })
          )
      }
    } catch (e) {
      logger.error('Chat error:', { error: e })
      if ((e as Error).message === 'login_required') {
        setError(
          isKo ? '로그인이 필요한 프리미엄 기능입니다.' : 'Login required for this premium feature.'
        )
      } else {
        setError(
          isKo ? '오류가 발생했습니다. 다시 시도해 주세요.' : 'An error occurred. Please try again.'
        )
      }
    } finally {
      setIsLoading(false)
    }
  }, [
    input,
    isLoading,
    messages,
    persons,
    person1Saju,
    person2Saju,
    person1Astro,
    person2Astro,
    locale,
    isKo,
    chatSessionId,
  ])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // 🎴 둘 궁합 타로 — 한 번 클릭으로 5장 관계 크로스를 펼치고 chat 에 inline 으로 풀어준다.
  const handleQuickCoupleTarot = useCallback(async () => {
    if (isLoading || persons.length < 2) return
    setIsLoading(true)
    setError(null)
    const userMessage: ChatMessage = {
      role: 'user',
      content: isKo ? '둘 궁합 타로 5장 펼쳐줘' : 'Pull a 5-card couple tarot for us',
    }
    setMessages((prev) => [...prev, userMessage, { role: 'assistant', content: '' }])
    try {
      const { markdown } = await runQuickCoupleTarot({
        persons,
        person1Saju,
        person2Saju,
        person1Astro,
        person2Astro,
        language: isKo ? 'ko' : 'en',
        onChunk: (partial) => {
          setMessages((prev) => {
            const copy = [...prev]
            const lastIdx = copy.length - 1
            if (lastIdx >= 0 && copy[lastIdx].role === 'assistant') {
              copy[lastIdx] = { role: 'assistant', content: partial }
            }
            return copy
          })
        },
      })
      setMessages((prev) => {
        const copy = [...prev]
        const lastIdx = copy.length - 1
        if (lastIdx >= 0 && copy[lastIdx].role === 'assistant') {
          copy[lastIdx] = { role: 'assistant', content: markdown }
        }
        return copy
      })
    } catch (e) {
      logger.error('Quick couple tarot failed:', { error: e })
      setError(
        isKo
          ? '타로 카드를 펼치지 못했어요. 잠시 후 다시 시도해 주세요.'
          : 'Could not draw the cards. Please try again in a moment.'
      )
      setMessages((prev) => {
        const copy = [...prev]
        const lastIdx = copy.length - 1
        if (lastIdx >= 0 && copy[lastIdx].role === 'assistant' && !copy[lastIdx].content) {
          // 빈 placeholder 제거
          copy.pop()
        }
        return copy
      })
    } finally {
      setIsLoading(false)
    }
  }, [
    isLoading,
    persons,
    person1Saju,
    person2Saju,
    person1Astro,
    person2Astro,
    isKo,
  ])

  if (isInitializing) {
    return <CounselorLoading />
  }

  const personA = persons[0]
  const personB = persons[1]

  const suggestionItems = isKo
    ? [
        '우리의 숨겨진 인연은 뭐야?',
        '우리 관계의 미래 가이던스를 알려줘',
        '우리가 함께 성장하려면 어떻게 해야 해?',
        '우리 갈등 해결 스타일은 어때?',
      ]
    : [
        'What are our hidden connections?',
        'Give me future guidance for our relationship',
        'How can we grow together?',
        'What is our conflict resolution style?',
      ]

  return (
    <main className={`${styles.page} ${styles.fadeIn}`}>
      <CounselorSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={() => {
          if (isLoading) return
          setMessages([])
          setError(null)
          setInput('')
          setChatSessionId(undefined)
          setTimeout(() => inputRef.current?.focus(), 0)
        }}
        serviceType="compat"
      />
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => setSidebarOpen(true)}
            aria-label={isKo ? '메뉴' : 'Menu'}
          >
            <span className={styles.backIcon}>{'☰'}</span>
          </button>
          <h1 className={styles.headerTitle}>
            {isKo ? '궁합 상담사' : 'Compatibility Counselor'}
          </h1>
        </div>
        <div className={styles.headerActions}>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (isLoading) return
                setMessages([])
                setError(null)
                setInput('')
                setTimeout(() => inputRef.current?.focus(), 0)
              }}
              className={styles.localeToggle}
              aria-label={isKo ? '새 채팅' : 'New chat'}
              title={isKo ? '새 채팅 시작' : 'Start a new chat'}
              disabled={isLoading}
            >
              {isKo ? '＋ 새 채팅' : '＋ New'}
            </button>
          )}
          <CreditBadge variant="compact" />
        </div>
      </header>

      {/* Two-persons hero with heart */}
      {personA && personB && (
        <div className={styles.twoPersonsHero}>
          <div className={styles.personCard}>
            <div className={`${styles.personAvatar} ${styles.personAvatarA}`}>
              {(personA.name || 'A').charAt(0).toUpperCase()}
            </div>
            <div className={styles.personMeta}>
              <span className={styles.personName}>
                {personA.name || (isKo ? '사람 1' : 'Person 1')}
              </span>
              <span className={styles.personDate}>{formatBirthSnippet(personA)}</span>
            </div>
          </div>
          <span className={styles.heartCenter} aria-hidden="true">
            {'\u{1F495}'}
          </span>
          <div className={`${styles.personCard} ${styles.personCardRight}`}>
            <div className={`${styles.personAvatar} ${styles.personAvatarB}`}>
              {(personB.name || 'B').charAt(0).toUpperCase()}
            </div>
            <div className={styles.personMeta}>
              <span className={styles.personName}>
                {personB.name || (isKo ? '사람 2' : 'Person 2')}
              </span>
              <span className={styles.personDate}>{formatBirthSnippet(personB)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Chat */}
      <div className={styles.chatWrapper}>
        <div className={styles.messagesContainer}>
          {messages.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>{'\u{1F495}'}</div>
              <h3 className={styles.emptyTitle}>
                {isKo ? '두 사람의 이야기를 시작해보세요' : 'Begin your story together'}
              </h3>
              <p className={styles.emptySubtitle}>
                {isKo
                  ? '사주와 점성학 심화 분석을 바탕으로 두 사람의 관계를 깊이 들여다봅니다.'
                  : 'Deep insights from Saju + Astrology to understand your bond.'}
              </p>
              <div className={styles.suggestions}>
                {suggestionItems.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    className={styles.suggestionButton}
                    onClick={() => setInput(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user'
            const isLastAssistant = !isUser && idx === messages.length - 1
            const showTyping = isLastAssistant && isLoading && !msg.content
            return (
              <div
                key={idx}
                className={`${styles.message} ${isUser ? styles.userMessage : ''}`}
              >
                <div className={styles.messageAvatar} aria-hidden="true">
                  {isUser ? '\u{1F464}' : '\u{1F495}'}
                </div>
                <div className={styles.messageBubble}>
                  {showTyping ? (
                    <span className={styles.typing}>
                      <span />
                      <span />
                      <span />
                    </span>
                  ) : isUser ? (
                    msg.content
                  ) : (
                    <MarkdownMessage content={msg.content} />
                  )}
                </div>
              </div>
            )
          })}

          {error && <div className={styles.errorMessage}>{error}</div>}

          <div ref={messagesEndRef} />
        </div>

        {/* 🎴 둘 궁합 타로 즉시 버튼 — 한 번 클릭으로 5장 관계 크로스 펼침 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '8px 12px 0',
          }}
        >
          <button
            type="button"
            onClick={handleQuickCoupleTarot}
            disabled={isLoading || persons.length < 2}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 999,
              border: '1px solid rgba(167, 139, 250, 0.45)',
              background:
                isLoading || persons.length < 2
                  ? 'rgba(71, 85, 105, 0.4)'
                  : 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(167,139,250,0.22))',
              color: isLoading || persons.length < 2 ? '#94a3b8' : '#e0e7ff',
              fontSize: 13,
              fontWeight: 500,
              cursor: isLoading || persons.length < 2 ? 'not-allowed' : 'pointer',
              boxShadow:
                isLoading || persons.length < 2
                  ? 'none'
                  : '0 0 18px rgba(99,102,241,0.18)',
              transition: 'all 0.15s',
            }}
            title={isKo ? '두 사람 관계를 5장 관계 크로스로 즉시 봐요' : 'Quick 5-card relationship reading'}
          >
            <span style={{ fontSize: 14 }}>🎴</span>
            {isKo ? '둘 궁합 타로 즉시 보기' : 'Quick Couple Tarot'}
          </button>
        </div>

        {/* Input */}
        <div className={styles.inputContainer}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isKo
                ? '두 사람에 대해 깊이 있는 질문을 해보세요...'
                : 'Ask deep questions about your compatibility...'
            }
            className={styles.input}
            rows={1}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className={styles.sendButton}
            aria-label={isKo ? '전송' : 'Send'}
          >
            {isLoading ? (
              <span className={styles.loadingSpinner} />
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </main>
  )
}

export default function CompatibilityCounselorPage() {
  return (
    <Suspense fallback={<CounselorLoading />}>
      <CompatibilityCounselorContent />
    </Suspense>
  )
}
