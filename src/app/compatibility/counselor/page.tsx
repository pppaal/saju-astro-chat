'use client'

import { useEffect, useState, useRef, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useI18n } from '@/i18n/I18nProvider'
import CreditBadge from '@/components/ui/CreditBadge'
import BrandSplash from '@/components/branding/BrandSplash'
import MarkdownMessage from '@/components/ui/MarkdownMessage'
import styles from './compatibility-counselor.module.css'
import { logger } from '@/lib/logger'

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

type Theme = 'general' | 'love' | 'business' | 'family'

const themeInfo: Record<Theme, { emoji: string; label: string; labelEn: string }> = {
  general: { emoji: '💫', label: '종합 상담', labelEn: 'General' },
  love: { emoji: '💕', label: '연애/결혼', labelEn: 'Love/Marriage' },
  business: { emoji: '🤝', label: '비즈니스', labelEn: 'Business' },
  family: { emoji: '👨‍👩‍👧‍👦', label: '가족 관계', labelEn: 'Family' },
}

function formatBirthSnippet(p: PersonData): string {
  const date = p.date || ''
  const time = p.time && p.time !== '12:00' ? ` ${p.time}` : ''
  return `${date}${time}`.trim()
}

function CompatibilityCounselorContent() {
  const { locale, setLocale } = useI18n()
  const router = useRouter()
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
  const [theme, setTheme] = useState<Theme>('general')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const isKo = locale === 'ko'

  useEffect(() => {
    if (!searchParams) {
      return
    }

    const initializeData = async () => {
      try {
        const personsParam = searchParams.get('persons')
        const themeParam = searchParams.get('theme') as Theme | null

        if (themeParam && themeInfo[themeParam]) {
          setTheme(themeParam)
        }

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
          messages: [...messages, userMessage],
          useRag: true,
          theme,
        }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('login_required')
        }
        throw new Error('Failed to get response')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let assistantContent = ''

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              continue
            }
            assistantContent += data

            setMessages((prev) => {
              const updated = [...prev]
              if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
                updated[updated.length - 1] = {
                  role: 'assistant',
                  content: assistantContent,
                }
              }
              return updated
            })
          }
        }
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
    theme,
    isKo,
  ])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const toggleLocale = useCallback(() => {
    setLocale(locale === 'ko' ? 'en' : 'ko')
  }, [locale, setLocale])

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
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => router.back()}
            aria-label={isKo ? '뒤로' : 'Back'}
          >
            <span className={styles.backIcon}>{'←'}</span>
          </button>
          <h1 className={styles.headerTitle}>
            {isKo ? '궁합 상담사' : 'Compatibility Counselor'}
          </h1>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            onClick={toggleLocale}
            className={styles.localeToggle}
            aria-label={isKo ? 'Switch to English' : '한국어로 전환'}
          >
            {isKo ? 'EN' : 'KO'}
          </button>
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

      {/* Theme selector */}
      <div className={styles.themeBar}>
        <div className={styles.themeScroll}>
          {(Object.keys(themeInfo) as Theme[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              className={`${styles.themeChip} ${theme === t ? styles.themeChipActive : ''}`}
            >
              <span>{themeInfo[t].emoji}</span>
              <span>{isKo ? themeInfo[t].label : themeInfo[t].labelEn}</span>
            </button>
          ))}
        </div>
      </div>

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
