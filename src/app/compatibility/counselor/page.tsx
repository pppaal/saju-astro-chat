'use client'

import { useEffect, useState, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useI18n } from '@/i18n/I18nProvider'
import CreditBadge from '@/components/ui/CreditBadge'
import BrandSplash from '@/components/branding/BrandSplash'
import MarkdownMessage from '@/components/ui/MarkdownMessage'
import CounselorSidebar from '@/components/destiny-map/CounselorSidebar'
import styles from './compatibility-counselor.module.css'
import { logger } from '@/lib/logger'
import { CompatChartModal } from './CompatChartModal'
import { streamProcessor } from '@/lib/streaming'
import { useTypewriterPlaceholder } from '@/hooks/useTypewriterPlaceholder'
import { stripReportMarkdown } from '@/lib/text/stripReportMarkdown'
import { generateFollowUpQuestions } from '@/components/destiny-map/chat-followups'
import { type TarotResultSummary } from '@/components/destiny-map/InlineTarotModal'
import { buildClarifierUserMessage, type ClarifierCard } from '@/lib/tarot/drawClarifierCard'

const ClarifierCardModal = dynamic(() => import('@/components/tarot/ClarifierCardModal'), {
  ssr: false,
})

// 운명상담사와 동일한 InlineTarotModal — 사용자가 질문 적고 스프레드
// 골라 카드를 펼치는 인터랙티브 흐름. 결과는 채팅 메시지로 inject.
const InlineTarotModal = dynamic(() => import('@/components/destiny-map/InlineTarotModal'), {
  ssr: false,
})
import { useFileUpload } from '@/components/destiny-map/hooks/useFileUpload'
import { useCreditModal } from '@/contexts/CreditModalContext'

// Short, one-line prompts that cycle through the textarea placeholder.
// The original single-string placeholder ("두 사람에 대해 깊이 있는 질문을
// 해보세요…") wraps to two lines on mobile; these stay on one line and
// double as suggestion hints for users who don't know where to start.
const TYPEWRITER_PROMPTS_KO = [
  '우리 인연의 의미는?',
  '갈등은 어떻게 풀까?',
  '함께할 미래의 흐름?',
  '관계의 강점은?',
  '서로 다른 점은?',
] as const
const TYPEWRITER_PROMPTS_EN = [
  'What is our bond about?',
  'How do we handle conflict?',
  'Where is this heading?',
  'What are our strengths?',
  'Where do we differ?',
] as const

function CounselorLoading({ lang = 'ko' }: { lang?: 'ko' | 'en' }) {
  return <BrandSplash message={lang === 'ko' ? '상담사 준비 중…' : 'Preparing your counselor…'} />
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
  /** 대운 순/역행이 음양남녀에 따라 갈리므로 빠지면 잘못 계산됨. */
  gender?: 'M' | 'F' | 'Male' | 'Female'
}

function CompatibilityCounselorContent() {
  const { locale } = useI18n()
  const animatedPlaceholder = useTypewriterPlaceholder(
    locale === 'ko' ? TYPEWRITER_PROMPTS_KO : TYPEWRITER_PROMPTS_EN
  )
  const searchParams = useSearchParams()
  const router = useRouter()
  const { showDepleted } = useCreditModal()

  const [persons, setPersons] = useState<PersonData[]>([])
  const [person1Saju, setPerson1Saju] = useState<Record<string, unknown> | null>(null)
  const [person2Saju, setPerson2Saju] = useState<Record<string, unknown> | null>(null)
  const [person1Astro, setPerson1Astro] = useState<Record<string, unknown> | null>(null)
  const [person2Astro, setPerson2Astro] = useState<Record<string, unknown> | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [redirecting, setRedirecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // LLM-generated follow-up chips. Filled from streamProcessor result.
  // Cleared on every new send so stale suggestions never leak.
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([])
  // Persistent chat session id (returned by /api/counselor/chat-history
  // after the first save). Subsequent saves attach to the same row.
  const [chatSessionId, setChatSessionId] = useState<string | undefined>(undefined)
  // 페이지 헤더에 표시할 활성 채팅 제목 (Rename/Delete + 새 채팅 시 갱신).
  const [chatTitle, setChatTitle] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showChartModal, setShowChartModal] = useState(false)
  const [showTarotModal, setShowTarotModal] = useState(false)
  const [showClarifierModal, setShowClarifierModal] = useState(false)
  // 채팅 우상단 ⋮ 메뉴 — Rename / Delete. 사이드바 리스트의 항상 보이던
  // 아이콘들을 대체 (운명 상담사와 동일 패턴, PR #621).
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
  // 파일 첨부 — 운명 상담사와 동일한 훅. 업로드 텍스트(cvText)는 sendMessage
  // payload 로 전달돼 라우트가 현재 턴 프롬트에 주입한다.
  const [fileNotice, setFileNotice] = useState<string | null>(null)
  const { cvText, cvName, parsingPdf, handleFileUpload, clearFile } = useFileUpload({
    lang: locale,
    setNotice: setFileNotice,
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const chartFetchRef = useRef(false)
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
                  title?: string | null
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
                if (s.title) setChatTitle(s.title)
                if (Array.isArray(s.messages)) {
                  setMessages(
                    s.messages.filter(
                      (m): m is ChatMessage => !!m && (m.role === 'user' || m.role === 'assistant')
                    )
                  )
                }
                if (s.meta?.persons) setPersons(s.meta.persons)
                if (s.meta?.person1Saju !== undefined) setPerson1Saju(s.meta.person1Saju ?? null)
                if (s.meta?.person2Saju !== undefined) setPerson2Saju(s.meta.person2Saju ?? null)
                if (s.meta?.person1Astro !== undefined) setPerson1Astro(s.meta.person1Astro ?? null)
                if (s.meta?.person2Astro !== undefined) setPerson2Astro(s.meta.person2Astro ?? null)
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
        } else {
          // 3) Direct entry with no couple (profile / header / sidebar link).
          //    This screen has no person-picker, so send the user to the
          //    /compatibility form which carries 지인 불러오기 / 직접 입력 /
          //    내 프로필 불러오기. They return here with ?persons=. Keep the
          //    loader up (redirecting) so the empty counselor never flashes.
          setRedirecting(true)
          router.replace('/compatibility')
          return
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
    chartFetchRef.current = true
    try {
      // gender는 대운 순/역행에 필수. /api/saju가 required로 받으니 빠뜨리면 fetch 실패.
      // skipInterpretation: 궁합 상담사는 차트 데이터(기둥·신살 등)만 쓰고 사람당
      // AI 해석문은 안 쓴다. 그걸 끄면 로딩이 LLM 대기 없이 차트 계산만으로 끝난다.
      const sajuPayload = (p: PersonData) => ({
        birthDate: p.date,
        birthTime: p.time,
        gender: (p.gender || 'male').toString().toLowerCase().startsWith('f') ? 'female' : 'male',
        calendarType: 'solar' as const,
        timezone: p.timeZone || 'Asia/Seoul',
        latitude: p.latitude || 37.5665,
        longitude: p.longitude || 126.978,
        skipInterpretation: true,
      })
      // timeZone은 /api/astrology Zod 스키마에서 필수(min 1). 빠뜨리면
      // 검증 400으로 떨어져 점성 데이터가 영영 안 들어온다.
      const astroPayload = (p: PersonData) => ({
        date: p.date,
        time: p.time,
        latitude: p.latitude || 37.5665,
        longitude: p.longitude || 126.978,
        timeZone: p.timeZone || 'Asia/Seoul',
        skipInterpretation: true,
      })

      // /api/saju·/api/astrology 는 createSajuGuard/createAstrologyGuard 로
      // requireToken: true 라서 X-API-Token 이 없으면 거부된다. 토큰을 빼면
      // 차트 데이터가 안 들어와 "궁합 차트" 버튼이 영영 비활성이 된다.
      const apiHeaders = {
        'Content-Type': 'application/json',
        'X-API-Token': process.env.NEXT_PUBLIC_API_TOKEN || '',
      }

      const [saju1Res, saju2Res, astro1Res, astro2Res] = await Promise.all([
        fetch('/api/saju', {
          method: 'POST',
          headers: apiHeaders,
          body: JSON.stringify(sajuPayload(personList[0])),
        }),
        fetch('/api/saju', {
          method: 'POST',
          headers: apiHeaders,
          body: JSON.stringify(sajuPayload(personList[1])),
        }),
        fetch('/api/astrology', {
          method: 'POST',
          headers: apiHeaders,
          body: JSON.stringify(astroPayload(personList[0])),
        }),
        fetch('/api/astrology', {
          method: 'POST',
          headers: apiHeaders,
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

  // 차트 데이터 보강 — resume(?session=) 세션은 meta 스냅샷에만 의존한다.
  // 차트 저장 이전에 만들어진 세션이면 person*Saju/Astro 가 비어 차트 버튼이
  // 영구 비활성된다. persons 는 있는데 데이터가 없으면 여기서 지연 로드.
  useEffect(() => {
    if (isInitializing || redirecting) return
    if (persons.length < 2) return
    if (person1Saju || person2Saju || person1Astro || person2Astro) return
    if (chartFetchRef.current) return
    fetchPersonData(persons)
  }, [isInitializing, redirecting, persons, person1Saju, person2Saju, person1Astro, person2Astro])

  useEffect(() => {
    // Streaming updates the *last* message's content in place — array
    // length doesn't change after the second chunk, but the array
    // reference does, so this effect refires on every chunk. We need
    // the scroll to keep up with the growing bubble, not just the
    // initial append.
    //
    // Pre-fix this used scrollIntoView({ behavior: 'smooth' }), which
    // (1) targets window-level scroll instead of the inner messages
    // container, and (2) cancels itself when called many times per
    // second during streaming — so the chat stopped following the
    // assistant's reply mid-paragraph.
    //
    // Replacement: scrollTop = scrollHeight on the actual scroll
    // container, deferred a frame so the freshly appended chunk is
    // already in the DOM. Falls back to scrollIntoView in case the
    // ref structure ever changes.
    const end = messagesEndRef.current
    if (!end) return
    const container = end.parentElement
    const raf = requestAnimationFrame(() => {
      if (container && container.scrollHeight > container.clientHeight) {
        container.scrollTop = container.scrollHeight
      } else {
        end.scrollIntoView({ block: 'end' })
      }
    })
    return () => cancelAnimationFrame(raf)
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

  // 타이핑하면 textarea 가 자라고, max-height(.input CSS 6rem) 넘으면 스크롤.
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [input])

  // 운명 상담사와 동일한 UX — 답변 직후 첫 후속질문을 입력창에 미리 채운다.
  // 사용자는 엔터로 바로 보내거나, 지우고 자기 질문을 새로 쓸 수 있다.
  // 이미 입력 중이면 덮어쓰지 않는다.
  useEffect(() => {
    if (followUpQuestions.length > 0) {
      setInput((prev) => (prev.trim() ? prev : followUpQuestions[0]))
    }
  }, [followUpQuestions])

  // 채팅 우상단 ⋮ 메뉴 핸들러 — 운명 상담사 PR #621 과 동일.
  // 저장된 session 이 없으면 (chatSessionId undefined) 아무것도 안 함.
  const handleChatRename = useCallback(async () => {
    setChatMenuOpen(false)
    if (!chatSessionId) return
    const next = window.prompt(isKo ? '대화 이름' : 'Chat name', chatTitle || '')
    if (!next || !next.trim()) return
    try {
      await fetch('/api/counselor/session/list', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: chatSessionId, title: next.trim() }),
      })
      setChatTitle(next.trim())
    } catch (err) {
      logger.warn('[CompatCounselor] rename failed', { err })
    }
  }, [chatSessionId, isKo, chatTitle])

  const handleChatDelete = useCallback(async () => {
    setChatMenuOpen(false)
    if (!chatSessionId) return
    const confirmed = window.confirm(
      isKo
        ? '이 대화를 삭제할까요? 되돌릴 수 없어요.'
        : 'Delete this chat? This cannot be undone.'
    )
    if (!confirmed) return
    try {
      await fetch(
        `/api/counselor/session/list?sessionId=${encodeURIComponent(chatSessionId)}`,
        { method: 'DELETE' }
      )
    } catch (err) {
      logger.warn('[CompatCounselor] delete failed', { err })
    }
    setMessages([])
    setChatSessionId(undefined)
    setChatTitle(null)
  }, [chatSessionId, isKo])

  const sendMessage = useCallback(
    async (textOverride?: string) => {
      const text = (textOverride ?? input).trim()
      if (!text || isLoading) {
        return
      }

      const userMessage: ChatMessage = { role: 'user', content: text }
      setMessages((prev) => [...prev, userMessage])
      if (!textOverride) setInput('')
      setFollowUpQuestions([])
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
            ...(cvText ? { cvText } : {}),
          }),
        })

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('login_required')
          }
          // 402 Payment Required — credit exhausted. 잡아서 전역 크레딧
          // 안내 모달(showDepleted)로 처리한다(아래 catch 참고).
          if (response.status === 402) {
            throw new Error('payment_required')
          }
          // Pull the route's short errorTag so the chat bubble shows
          // *why* the request failed instead of a generic "오류 발생".
          // The route returns { error, errorTag } as JSON for non-2xx.
          let detail = ''
          try {
            const body = (await response.clone().json()) as { errorTag?: string; error?: string }
            detail = body.errorTag || body.error || ''
          } catch {
            /* response wasn't JSON — fall through to plain status */
          }
          throw new Error(
            detail ? `Failed (${response.status}): ${detail}` : `Failed (${response.status})`
          )
        }

        // 서버는 `data: {"content":"...","done":false}\n\n` 형식의 JSON SSE를
        // 보낸다. 이전엔 `data:` 라인 뒤의 *JSON 문자열 전체*를 그대로
        // 누적해서 화면에 `{"content":"안","done":false}{"content":"녕"...}`
        // 식의 깨진 텍스트가 나왔다. 운명 상담사가 이미 쓰던 streamProcessor
        // 로 통일 — `content` 필드만 추출해 누적한다.
        setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

        let finalAssistantContent = ''
        const result = await streamProcessor.process(response, {
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
        // 운명 상담사와 동일하게 — LLM이 후속질문을 2개 미만으로 주면
        // generateFollowUpQuestions 로 채워 "이어서 물어보기" 칩이 항상 뜨게 한다.
        if (result.followUps.length >= 2) {
          setFollowUpQuestions(result.followUps.slice(0, 2))
        } else {
          setFollowUpQuestions(
            generateFollowUpQuestions(text, locale === 'ko' ? 'ko' : 'en', 2, finalAssistantContent)
          )
        }

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
        const errMsg = (e as Error).message || ''
        if (errMsg === 'login_required') {
          setError(
            isKo
              ? '로그인이 필요한 프리미엄 기능입니다.'
              : 'Login required for this premium feature.'
          )
        } else if (errMsg === 'payment_required') {
          // 크레딧 소진 → 인라인 에러 대신 전역 크레딧 안내 모달을 띄운다
          // (운명 상담사·타로와 동일한 UX).
          showDepleted()
        } else {
          // Append the route's errorTag (set above from response body) so
          // the user-visible bubble points at the actual failure mode
          // instead of a generic message. The Error here is either our
          // "Failed (500): ErrorName: message…" string or a network error.
          const base = isKo
            ? '오류가 발생했습니다. 다시 시도해 주세요.'
            : 'An error occurred. Please try again.'
          setError(errMsg && errMsg !== 'Failed to get response' ? `${base}\n[${errMsg}]` : base)
        }
      } finally {
        setIsLoading(false)
      }
    },
    [
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
      cvText,
      showDepleted,
    ]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // 🃏 클래리파이어 카드 한 장 — 작은 모달이 열려 카드 한 장이 펼쳐지고
  // 사용자가 확인을 누르면 카드 이미지와 함께 채팅 메시지로 흘려보낸다.
  // LLM 이 직전 대화 + 두 사람 컨텍스트로 한 단락 보충 해석을 답한다.
  const openClarifier = useCallback(() => {
    if (isLoading || persons.length < 2) return
    setShowClarifierModal(true)
  }, [isLoading, persons.length])
  const handleClarifierConfirm = useCallback(
    (card: ClarifierCard) => {
      const userText = buildClarifierUserMessage(card, isKo ? 'ko' : 'en')
      sendMessage(userText)
    },
    [isKo, sendMessage]
  )

  // 🃏 다음 질문 타로로 보기 — 운명상담사와 동일한 InlineTarotModal 흐름. 사용자가
  // 질문 적고 스프레드 골라 카드 펼치면 결과를 채팅 메시지로 inject.
  // 본 채팅의 다음 follow-up 은 두 사람 컨텍스트를 가지고 커플 관점에서
  // 카드 결과를 깊게 읽어준다.
  const handleTarotComplete = useCallback(
    (result: TarotResultSummary) => {
      const cardsSummary = result.cards
        .map(
          (card) =>
            `• ${card.position}: ${card.name}${card.isReversed ? (isKo ? ' (역방향)' : ' (reversed)') : ''}`
        )
        .join('\n')

      const partnerNames =
        persons
          .slice(0, 2)
          .map((p) => p.name)
          .filter(Boolean)
          .join(' & ') || (isKo ? '두 사람' : 'the couple')

      const header = isKo
        ? `🃏 **타로 리딩 결과 — ${partnerNames}** (${result.spreadTitle})`
        : `🃏 **Tarot Reading — ${partnerNames}** (${result.spreadTitle})`

      const tarotMessage = `${header}

**${isKo ? '질문' : 'Question'}:** ${result.question}

**${isKo ? '뽑은 카드' : 'Cards'}:**
${cardsSummary}

**${isKo ? '해석' : 'Reading'}:**
${result.overallMessage}${result.guidance ? `\n\n**${isKo ? '조언' : 'Guidance'}:** ${result.guidance}` : ''}${result.affirmation ? `\n\n**${isKo ? '확언' : 'Affirmation'}:** _${result.affirmation}_` : ''}`

      setMessages((prev) => [...prev, { role: 'assistant', content: tarotMessage }])
    },
    [isKo, persons]
  )

  if (isInitializing || redirecting) {
    return <CounselorLoading lang={isKo ? 'ko' : 'en'} />
  }

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
          setChatTitle(null)
          setTimeout(() => inputRef.current?.focus(), 0)
        }}
        serviceType="compat"
        desktopStatic
        enableGrouping
        lightTheme
        footerSlot={
          <>
            <button
              type="button"
              className={styles.sidebarFooterBtn}
              onClick={() => setShowTarotModal(true)}
              disabled={isLoading || persons.length < 2}
              title={
                isKo
                  ? '다음 질문을 타로로 보기 — 질문 적고 스프레드 골라 카드 뽑기'
                  : 'See your next question in tarot — pick a spread and draw'
              }
            >
              <span className={styles.sidebarFooterBtnIcon} aria-hidden="true">
                {'🃏'}
              </span>
              {isKo ? '다음 질문 타로로 보기' : 'See your next question in tarot'}
            </button>
            <button
              type="button"
              className={styles.sidebarFooterBtn}
              onClick={openClarifier}
              disabled={isLoading || persons.length < 2}
              title={
                isKo
                  ? '직전 대화 흐름에 클래리파이어 카드 한 장 더 뽑기'
                  : 'Draw one clarifier card for the current thread'
              }
            >
              <span className={styles.sidebarFooterBtnIcon} aria-hidden="true">
                {'🃏'}
              </span>
              {isKo ? '카드 한 장 더 뽑기' : 'Draw one more card'}
            </button>
            <button
              type="button"
              className={styles.sidebarFooterBtn}
              onClick={() => setShowChartModal(true)}
              disabled={persons.length < 2 || (!person1Saju && !person1Astro)}
              title={isKo ? '궁합 차트 보기' : 'View couple chart'}
            >
              <span className={styles.sidebarFooterBtnIcon} aria-hidden="true">
                {'✨'}
              </span>
              {isKo ? '궁합 차트' : 'Couple chart'}
            </button>
          </>
        }
      />
      <div className={styles.mainColumn}>
        {/* Header — locale toggle removed (lives on main / entry page only).
            Heart accent kept next to the title to preserve the page's tone. */}
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
              {!chatTitle && (
                <span className={styles.headerHeart} aria-hidden="true">
                  {'💕'}
                </span>
              )}
              {chatTitle?.trim() || (isKo ? '궁합 상담사' : 'Compatibility Counselor')}
            </h1>
          </div>
          <div className={styles.headerActions}>
            {chatSessionId && (
              <div ref={chatMenuRef} className={styles.chatMenuArea}>
                <button
                  type="button"
                  className={styles.chatMenuButton}
                  onClick={() => setChatMenuOpen((o) => !o)}
                  aria-label={isKo ? '대화 메뉴' : 'Chat menu'}
                  aria-expanded={chatMenuOpen}
                  aria-haspopup="menu"
                >
                  <span aria-hidden="true">⋮</span>
                </button>
                {chatMenuOpen && (
                  <div role="menu" className={styles.chatMenuDropdown}>
                    <button
                      type="button"
                      role="menuitem"
                      className={styles.chatMenuItem}
                      onClick={handleChatRename}
                    >
                      <span>{isKo ? '이름 변경' : 'Rename'}</span>
                      <span aria-hidden="true" className={styles.chatMenuIcon}>
                        ✎
                      </span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className={`${styles.chatMenuItem} ${styles.chatMenuItemDanger}`}
                      onClick={handleChatDelete}
                    >
                      <span>{isKo ? '삭제' : 'Delete'}</span>
                      <span aria-hidden="true" className={styles.chatMenuIcon}>
                        🗑
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}
            <CreditBadge variant="compact" />
          </div>
        </header>

        {/* Chat */}
        <div className={styles.chatWrapper}>
          <div className={styles.messagesContainer}>
            {messages.length === 0 && (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>{'\u{1F495}'}</div>
                <p className={styles.emptyText}>
                  {isKo ? '두 사람에 대해서 물어보세요' : 'Ask about the two of you'}
                </p>
              </div>
            )}

            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user'
              const isLastAssistant = !isUser && idx === messages.length - 1
              const showTyping = isLastAssistant && isLoading && !msg.content
              return (
                <div key={idx} className={`${styles.message} ${isUser ? styles.userMessage : ''}`}>
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
                      // 사용자 메시지에 markdown 토큰 (이미지/굵게/제목/리스트) 있으면
                      // markdown 렌더 — 🃏 클래리파이어 카드의 이미지·카드명 표시용.
                      // 평문 입력은 토큰 없으므로 영향 X.
                      /!\[[^\]]*\]\([^)]+\)|\*\*[^*]+\*\*|^#{1,3}\s|\n[*-]\s/.test(msg.content) ? (
                        <MarkdownMessage content={msg.content} theme="light" />
                      ) : (
                        msg.content
                      )
                    ) : (
                      <MarkdownMessage content={stripReportMarkdown(msg.content)} theme="light" />
                    )}
                  </div>
                </div>
              )
            })}

            {error && <div className={styles.errorMessage}>{error}</div>}

            {!isLoading && followUpQuestions.length > 0 && messages.length > 0 && (
              <div className={styles.followUpContainer}>
                <span className={styles.followUpLabel}>
                  {isKo ? '이어서 물어보기' : 'Continue asking'}
                </span>
                <div className={styles.followUpButtons}>
                  {followUpQuestions.map((q, idx) => (
                    <button
                      key={`${idx}-${q}`}
                      type="button"
                      className={styles.followUpChip}
                      onClick={() => sendMessage(q)}
                    >
                      <span className={styles.followUpIcon}>{'\u{1F4AC}'}</span>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input — Claude-style: textarea on top, action row below.
            Desktop: 🎴 타로 + ✨ 차트는 사이드바 푸터, 입력엔 ✕ 지우기 + ▶ 전송.
            Mobile: 🎴 couple tarot + ✨ couple chart + ✕ 지우기 + ▶ send. */}
          <div className={styles.inputContainer}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={(e) => {
                // 운명 상담사와 동일 — 미리 채워진 후속질문을 탭하면 전체 선택해
                // 바로 보내거나 타이핑으로 덮어쓰기 쉽게.
                if (e.currentTarget.value.trim()) e.currentTarget.select()
              }}
              placeholder={
                animatedPlaceholder || (isKo ? '질문을 입력하세요…' : 'Type a question…')
              }
              className={styles.input}
              rows={1}
              maxLength={2000}
              disabled={isLoading}
            />
            <div className={styles.inputToolbar}>
              <div className={styles.inputToolbarLeft}>
                {/* 📎 파일 첨부 — 운명 상담사와 동일. 항상 노출. */}
                <label
                  className={styles.toolButton}
                  aria-label={isKo ? '파일 첨부' : 'Attach file'}
                  title={
                    isKo
                      ? '관계 메모·대화 등 파일 첨부 (txt/md/csv/pdf)'
                      : 'Attach a file (txt/md/csv/pdf)'
                  }
                >
                  <span className={styles.toolButtonIcon}>📎</span>
                  <input
                    type="file"
                    accept=".txt,.md,.csv,.pdf"
                    className={styles.fileInput}
                    onChange={handleFileUpload}
                  />
                </label>
                {/* 🃏 타로 + ✨ 차트는 모바일 입력 툴바에만 노출 — 데스크탑은
                    사이드바 푸터에 같은 둘이 있어 ≥1024px에선 중복을 피해 숨긴다. */}
                <button
                  type="button"
                  onClick={() => setShowTarotModal(true)}
                  disabled={isLoading || persons.length < 2}
                  className={`${styles.toolButton} ${styles.mobileOnlyTool}`}
                  aria-label={isKo ? '다음 질문 타로로 보기' : 'See your next question in tarot'}
                  title={
                    isKo
                      ? '다음 질문을 타로로 보기 — 질문 적고 스프레드 골라 카드 뽑기'
                      : 'See your next question in tarot — pick a spread and draw'
                  }
                >
                  <span className={styles.toolButtonIcon}>🃏</span>
                  <span className={styles.toolButtonLabel}>{isKo ? '타로' : 'Tarot'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowChartModal(true)}
                  disabled={persons.length < 2 || (!person1Saju && !person1Astro)}
                  className={`${styles.toolButton} ${styles.mobileOnlyTool}`}
                  aria-label={isKo ? '궁합 차트' : 'Couple chart'}
                  title={isKo ? '궁합 차트 보기' : 'View couple chart'}
                >
                  <span className={styles.toolButtonIcon}>✨</span>
                  <span className={styles.toolButtonLabel}>{isKo ? '궁합차트' : 'Chart'}</span>
                </button>
                {parsingPdf && (
                  <span className={styles.fileName}>
                    <span className={styles.loadingSpinner} />
                    {isKo ? 'PDF 읽는 중…' : 'Parsing…'}
                  </span>
                )}
                {cvName && !parsingPdf && (
                  <span className={styles.fileName}>
                    <span className={styles.fileIcon}>✓</span>
                    {cvName}
                    <button
                      type="button"
                      onClick={clearFile}
                      aria-label={isKo ? '첨부 제거' : 'Remove attachment'}
                      title={isKo ? '첨부 제거' : 'Remove attachment'}
                      style={{
                        marginLeft: 6,
                        border: 0,
                        background: 'transparent',
                        color: 'inherit',
                        cursor: 'pointer',
                        fontSize: '0.9em',
                        lineHeight: 1,
                        opacity: 0.7,
                      }}
                    >
                      ✕
                    </button>
                  </span>
                )}
              </div>
              <div className={styles.inputToolbarRight}>
                {input.trim() && !isLoading && (
                  <button
                    type="button"
                    onClick={() => setInput('')}
                    className={styles.clearButton}
                    aria-label={isKo ? '입력 지우기' : 'Clear input'}
                    title={isKo ? '입력 지우기' : 'Clear input'}
                  >
                    <span aria-hidden="true">✕</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => sendMessage()}
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
            {fileNotice && <div className={styles.fileNotice}>{fileNotice}</div>}
          </div>
        </div>
      </div>

      <InlineTarotModal
        isOpen={showTarotModal}
        onClose={() => setShowTarotModal(false)}
        onComplete={handleTarotComplete}
        lang={isKo ? 'ko' : 'en'}
        profile={{
          name: persons[0]?.name,
          birthDate: persons[0]?.date,
          birthTime: persons[0]?.time,
          city: persons[0]?.city,
          // 궁합 모달이라 단일 profile 만 받는 InlineTarotModal 시그니처 한계
          // — 두 번째 사람 컨텍스트는 결과 카드가 채팅으로 들어간 후
          // 본 채팅의 LLM 호출이 자동으로 커플 컨텍스트로 follow-up.
        }}
        initialConcern={
          isKo
            ? `${persons[0]?.name || '나'}와 ${persons[1]?.name || '상대'}, 우리 관계는 어떻게 흘러갈까?`
            : `${persons[0]?.name || 'Me'} and ${persons[1]?.name || 'partner'} — where is our relationship heading?`
        }
      />

      <ClarifierCardModal
        isOpen={showClarifierModal}
        onClose={() => setShowClarifierModal(false)}
        onConfirm={handleClarifierConfirm}
        lang={isKo ? 'ko' : 'en'}
      />

      <CompatChartModal
        open={showChartModal}
        onClose={() => setShowChartModal(false)}
        person1Saju={person1Saju}
        person2Saju={person2Saju}
        person1Astro={person1Astro}
        person2Astro={person2Astro}
        nameA={persons[0]?.name || ''}
        nameB={persons[1]?.name || ''}
        lang={isKo ? 'ko' : 'en'}
      />
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
