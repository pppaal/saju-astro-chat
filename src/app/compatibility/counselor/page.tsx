'use client'

import { useEffect, useState, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useI18n } from '@/i18n/I18nProvider'
import CreditBadge from '@/components/ui/CreditBadge'
import BrandSplash from '@/components/branding/BrandSplash'
import ChatBubbleContent from '@/components/chat/ChatBubbleContent'
import { useClarifierCard } from '@/hooks/useClarifierCard'
import { useChatAutoScroll } from '@/hooks/useChatAutoScroll'
import CounselorSidebar from '@/components/destiny-map/CounselorSidebar'
import {
  readCompatCounselorDraft,
  writeCompatCounselorDraft,
  clearCompatCounselorDraft,
} from '@/components/destiny-map/counselorDraft'
import styles from './compatibility-counselor.module.css'
import { logger } from '@/lib/logger'
import { CompatChartModal } from './CompatChartModal'
import { streamProcessor } from '@/lib/streaming'
import { apiFetch } from '@/lib/api'
import { ChatInputArea } from '@/components/destiny-map/chat-panels'
import {
  generateFollowUpQuestions,
  isGenericFollowUp,
} from '@/components/destiny-map/chat-followups'
import { getErrorMessage as getCounselorErrorMessage } from '@/lib/counselor/errorMessage'
// InlineTarotModal 은 dynamic 이 아니라 직접 import — 이전엔 dynamic ssr:false
// 였는데 첫 클릭 시 chunk download 로 모달이 "지지직" 거리며 늦게 떴음.
// 직접 import 로 즉시 열리게. (~50KB 초기 번들 증가는 수용 — UX 우선.)
import InlineTarotModal, {
  type TarotResultSummary,
} from '@/components/destiny-map/InlineTarotModal'

const ClarifierCardModal = dynamic(() => import('@/components/tarot/ClarifierCardModal'), {
  ssr: false,
})
import { useFileUpload } from '@/components/destiny-map/hooks/useFileUpload'
import { pushRecentPair, getRecentPairs, type RecentPair } from '@/app/compatibility/lib'
import { normalizeGender } from '@/lib/utils/gender'
import { CompatPersonPickerModal, type PickedPersonData } from './CompatPersonPickerModal'
import { useCreditModal } from '@/contexts/CreditModalContext'
import { ToolHint, useToolHint } from '@/components/chat/ToolHint'
import { FollowUpChips } from '@/components/chat/FollowUpChips'

// 궁합 콘텍스트용 짧은 한 줄 프롬프트 — ChatInputArea 의 placeholderPrompts 로
// 주입. 원본 단일 placeholder("두 사람에 대해 깊이 있는…") 가 모바일에서 2줄로
// 깨지던 문제 회피 + 무엇을 물을지 막막한 사용자한테 힌트 역할.
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
  /** Stream cut mid-response → bubble shows a "다시 시도" retry button. */
  incomplete?: boolean
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

// The half-typed message in the input box isn't part of the conversation
// draft (we don't want to rewrite the whole message list on every keystroke),
// so it gets its own tiny key. Restored on mount, cleared when sent.
const COMPAT_INPUT_KEY = 'destinypal:compat-counselor:input'

// Decide whether a saved local draft belongs to the couple the URL is asking
// for. A `?persons=` entry is an explicit couple selection — we only resume
// the draft (rather than start fresh) when it's the *same* couple, so picking
// a brand-new pair doesn't resurrect the previous conversation. Matching on
// name+date+time is enough to tell two people apart here.
function sameCouple(a: PersonData[] | undefined, b: PersonData[] | undefined): boolean {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || a.length === 0) {
    return false
  }
  const key = (p: PersonData) => `${p?.name ?? ''}|${p?.date ?? ''}|${p?.time ?? ''}`
  return a.every((p, i) => key(p) === key(b[i]))
}

function CompatibilityCounselorContent() {
  const { locale } = useI18n()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { showDepleted, showGuestLimit } = useCreditModal()

  const [persons, setPersons] = useState<PersonData[]>([])
  const [person1Saju, setPerson1Saju] = useState<Record<string, unknown> | null>(null)
  const [person2Saju, setPerson2Saju] = useState<Record<string, unknown> | null>(null)
  const [person1Astro, setPerson1Astro] = useState<Record<string, unknown> | null>(null)
  const [person2Astro, setPerson2Astro] = useState<Record<string, unknown> | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  // redirecting state — picker 모달 통합 후로 set 호출처는 없지만 loading
  // 가드(if isInitializing || redirecting) 의 의미적 키워드는 유지.
  const [redirecting] = useState(false)
  /** persons 가 비어 있을 때 picker 모달 노출 여부 — URL 에 ?persons= /
   *  ?session= 둘 다 없는 신규 진입 + 새 채팅 직후에 true. */
  const [showPicker, setShowPicker] = useState(false)
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
  // 클래리파이어 confirm 직후 일정 시간 자동 스크롤 hijack 끄기 — "한 장 더
  // 뽑기" 버튼이 채팅 맨 하단이라 사용자는 이미 그 자리를 보고 있어 답변
  // 토큰마다 messagesEnd 따라가면 viewport 가 위로 밀려 "왜 다시 올라가냐"
  // 회귀.
  const suspendAutoScrollRef = useRef(false)
  // 직전 user turn 의 idempotencyKey 를 보관. "다시 시도" 가 같은 키로 재요청
  // 하면 서버가 idempotent replay 로 인식해 *추가 credit 차감 없이* Claude
  // 호출만 다시 돌린다(라우트의 idemStore.isReplay 분기). 새 user 발화가
  // 들어오면 새 UUID 로 덮어씀.
  const lastTurnIdemKeyRef = useRef<string | null>(null)
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
  // 입력창 도구 안내 — 첫 답변 후 ~ 3 user 턴까지만 1회. 도구 사용 시 자동 dismiss.
  const { dismissed: toolHintDismissed, dismiss: dismissToolHint } = useToolHint('compat')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chartFetchRef = useRef(false)
  // Track mount lifecycle so the post-await setStates inside sendMessage
  // and fetchPersonData below bail out cleanly when the user navigates
  // away mid-stream. PR #890 applied the same pattern to useChatApi.
  const mountedRef = useRef(true)
  // The latest sendMessage's AbortController — sendMessage still creates
  // its own per-call controller for header timeout / chunk-idle, but we
  // stash a reference here so unmount can abort whatever's running.
  const inFlightAbortRef = useRef<AbortController | null>(null)
  // Same idea for the chart-data prefetch — 4 parallel /api/saju and
  // /api/astrology fetches that otherwise keep running and fire 4
  // setStates after the user navigates away.
  const chartFetchAbortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (inFlightAbortRef.current) {
        try {
          inFlightAbortRef.current.abort()
        } catch {
          // already aborted — ignore
        }
        inFlightAbortRef.current = null
      }
      if (chartFetchAbortRef.current) {
        try {
          chartFetchAbortRef.current.abort()
        } catch {
          // already aborted — ignore
        }
        chartFetchAbortRef.current = null
      }
    }
  }, [])
  const isKo = locale === 'ko'
  /** ChatInputArea 의 focusToken — 갱신 시 textarea 다시 focus.
   *  refactor 전 inputRef.current?.focus() 자리를 대체. */
  const [focusToken, setFocusToken] = useState(0)

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

        // 2) Local draft resume: the conversation otherwise lives only in
        //    React state, so a refresh / mobile re-entry / webview eviction
        //    wiped it (guests had nothing saved server-side at all). Resume
        //    the draft when there's no explicit ?session=, and — if the URL
        //    carries ?persons= — only when it's the same couple, so picking a
        //    new pair still starts fresh.
        const personsParam = searchParams.get('persons')
        const draft = readCompatCounselorDraft()
        if (draft && draft.messages.length > 0) {
          let draftPersons: PersonData[] | undefined =
            (draft.meta?.persons as PersonData[] | undefined) ?? undefined
          if (personsParam) {
            try {
              const requested = JSON.parse(decodeURIComponent(personsParam)) as PersonData[]
              if (!sameCouple(draftPersons, requested)) {
                draftPersons = undefined // different couple — fall through to fresh start
              }
            } catch {
              // unparseable ?persons= — ignore and treat as draft resume
            }
          }
          if (!personsParam || draftPersons) {
            const restoredMsgs = draft.messages.filter(
              (m): m is ChatMessage => !!m && (m.role === 'user' || m.role === 'assistant')
            )
            if (restoredMsgs.length > 0) {
              if (draft.sessionId) setChatSessionId(draft.sessionId)
              if (draft.meta?.chatTitle) setChatTitle(draft.meta.chatTitle)
              setMessages(restoredMsgs)
              if (draft.meta?.persons) setPersons(draft.meta.persons as PersonData[])
              if (draft.meta?.person1Saju !== undefined) setPerson1Saju(draft.meta.person1Saju)
              if (draft.meta?.person2Saju !== undefined) setPerson2Saju(draft.meta.person2Saju)
              if (draft.meta?.person1Astro !== undefined) setPerson1Astro(draft.meta.person1Astro)
              if (draft.meta?.person2Astro !== undefined) setPerson2Astro(draft.meta.person2Astro)
              return // skip fresh-start path
            }
          }
        }

        // 3) Fresh-start path: ?persons=... from the form.
        if (personsParam) {
          const parsed = JSON.parse(decodeURIComponent(personsParam)) as PersonData[]
          setPersons(parsed)

          // 다음 번에 자동으로 채워주려고 최근 페어로 저장 (localStorage).
          // useCompatibilityForm 이 다음 입력 페이지 진입 시 첫 번째 페어를
          // 그대로 카드 두 장에 부어넣는다.
          if (parsed.length >= 2 && parsed[0]?.name && parsed[1]?.name) {
            const toRecent = (p: PersonData) => ({
              name: p.name,
              date: p.date,
              time: p.time,
              gender: p.gender,
              cityQuery: p.city || '',
              lat: p.latitude ?? null,
              lon: p.longitude ?? null,
              timeZone: p.timeZone || '',
              relation: p.relation,
            })
            pushRecentPair([toRecent(parsed[0]), toRecent(parsed[1])])
          }

          if (parsed.length >= 2) {
            await fetchPersonData(parsed)
          }
        } else {
          // 4) Direct entry with no couple — inline picker 모달 노출.
          //    이전엔 /compatibility 입력 페이지로 빠졌다가 ?persons= 로 돌아
          //    오는 흐름이었는데 같은 화면 안에서 picker → chat 으로 흐름이
          //    끊기지 않게 모달로 통합. useCompatibilityForm 안에서 직전 페어
          //    (localStorage) 가 두 카드에 자동으로 채워지므로 사용자는 그냥
          //    "분석 시작" 한 번만 누르면 끝.
          setShowPicker(true)
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

  // Persist the conversation (+ couple snapshot) locally on every change so
  // a refresh / mobile re-entry resumes it — works for guests too, who get
  // no server-side save. Skipped while initializing so we never clobber a
  // freshly-restored draft with the empty starting state.
  useEffect(() => {
    if (isInitializing) return
    if (messages.length === 0) return
    writeCompatCounselorDraft({
      sessionId: chatSessionId ?? null,
      locale: locale === 'ko' ? 'ko' : 'en',
      messages,
      meta: {
        persons,
        person1Saju,
        person2Saju,
        person1Astro,
        person2Astro,
        chatTitle,
      },
    })
  }, [
    isInitializing,
    messages,
    chatSessionId,
    locale,
    persons,
    person1Saju,
    person2Saju,
    person1Astro,
    person2Astro,
    chatTitle,
  ])

  const fetchPersonData = async (personList: PersonData[]) => {
    chartFetchRef.current = true
    // Abort any previous chart prefetch before kicking off a new one
    // (e.g. picker switch / sidebar new-chat) and register the new
    // controller so unmount can cancel mid-flight.
    if (chartFetchAbortRef.current) {
      try {
        chartFetchAbortRef.current.abort()
      } catch {
        /* already aborted — ignore */
      }
    }
    const controller = new AbortController()
    chartFetchAbortRef.current = controller
    try {
      // gender는 대운 순/역행에 필수. /api/saju가 required로 받으니 빠뜨리면 fetch 실패.
      // /api/saju · /api/astrology 는 이제 차트 계산만 하고 LLM 해석은 하지
      // 않는다 (dead code 제거됨). 궁합 상담사는 chart 데이터만 받아 자체
      // LLM(streamClaudeAsSSE) 으로 통합 해석.
      const sajuPayload = (p: PersonData) => ({
        birthDate: p.date,
        birthTime: p.time,
        // 공용 normalizer — 'M'/'F'/'Male'/'Female'/'male'/'female' 다 처리.
        // 이전 `.toLowerCase().startsWith('f')` 도 known input 에선 동작
        // 했지만 다른 normalizer 호출처와 시그니처/시맨틱 통일.
        gender: normalizeGender(p.gender) === 'female' ? 'female' : 'male',
        calendarType: 'solar' as const,
        timezone: p.timeZone || 'Asia/Seoul',
        latitude: p.latitude || 37.5665,
        longitude: p.longitude || 126.978,
      })
      // timeZone은 /api/astrology Zod 스키마에서 필수(min 1). 빠뜨리면
      // 검증 400으로 떨어져 점성 데이터가 영영 안 들어온다.
      const astroPayload = (p: PersonData) => ({
        date: p.date,
        time: p.time,
        latitude: p.latitude || 37.5665,
        longitude: p.longitude || 126.978,
        timeZone: p.timeZone || 'Asia/Seoul',
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
          signal: controller.signal,
        }),
        fetch('/api/saju', {
          method: 'POST',
          headers: apiHeaders,
          body: JSON.stringify(sajuPayload(personList[1])),
          signal: controller.signal,
        }),
        fetch('/api/astrology', {
          method: 'POST',
          headers: apiHeaders,
          body: JSON.stringify(astroPayload(personList[0])),
          signal: controller.signal,
        }),
        fetch('/api/astrology', {
          method: 'POST',
          headers: apiHeaders,
          body: JSON.stringify(astroPayload(personList[1])),
          signal: controller.signal,
        }),
      ])

      if (!mountedRef.current || controller.signal.aborted) return
      if (saju1Res.ok) {
        const json = await saju1Res.json()
        if (!mountedRef.current || controller.signal.aborted) return
        setPerson1Saju(json)
      }
      if (saju2Res.ok) {
        const json = await saju2Res.json()
        if (!mountedRef.current || controller.signal.aborted) return
        setPerson2Saju(json)
      }
      if (astro1Res.ok) {
        const json = await astro1Res.json()
        if (!mountedRef.current || controller.signal.aborted) return
        setPerson1Astro(json)
      }
      if (astro2Res.ok) {
        const json = await astro2Res.json()
        if (!mountedRef.current || controller.signal.aborted) return
        setPerson2Astro(json)
      }
    } catch (e) {
      // Aborted via unmount or fresh prefetch — silent bail.
      const name = (e as Error & { name?: string })?.name
      if (name === 'AbortError') return
      logger.error('Failed to fetch person data:', { error: e })
    } finally {
      if (chartFetchAbortRef.current === controller) {
        chartFetchAbortRef.current = null
      }
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

  // 자동 스크롤 — 공통 hook (destiny / followup 동일). externalRef 로 기존
  // messagesEndRef 그대로 사용.
  useChatAutoScroll({
    messages,
    loading: isLoading,
    suspendRef: suspendAutoScrollRef,
    externalRef: messagesEndRef,
  })

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

  // Pop the soft keyboard the moment the page is ready — focusToken 갱신만
  // 하면 ChatInputArea 내부 effect 가 textarea 에 focus. iOS Safari 는 사용자
  // 제스처 밖이면 무시(=커서만 위치) — 정상 동작.
  // 자동 height 조절은 ChatInputArea 안에서 직접 처리하므로 별도 effect 불필요.
  useEffect(() => {
    if (!isInitializing) {
      setFocusToken((n) => n + 1)
    }
  }, [isInitializing])

  // Restore a half-typed message once the page is ready, so a crash / refresh
  // mid-composition doesn't throw away what the user was writing.
  const inputRestoredRef = useRef(false)
  useEffect(() => {
    if (isInitializing || inputRestoredRef.current) return
    inputRestoredRef.current = true
    try {
      const saved = window.localStorage.getItem(COMPAT_INPUT_KEY)
      if (saved) setInput((cur) => (cur ? cur : saved))
    } catch {
      // private mode / quota — ignore
    }
  }, [isInitializing])

  // Mirror the input box to localStorage as the user types; clear it once the
  // box is empty (e.g. after send or new chat).
  useEffect(() => {
    if (isInitializing) return
    try {
      if (input) window.localStorage.setItem(COMPAT_INPUT_KEY, input)
      else window.localStorage.removeItem(COMPAT_INPUT_KEY)
    } catch {
      // ignore
    }
  }, [input, isInitializing])

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
      isKo ? '이 대화를 삭제할까요? 되돌릴 수 없어요.' : 'Delete this chat? This cannot be undone.'
    )
    if (!confirmed) return
    try {
      await fetch(`/api/counselor/session/list?sessionId=${encodeURIComponent(chatSessionId)}`, {
        method: 'DELETE',
      })
    } catch (err) {
      logger.warn('[CompatCounselor] delete failed', { err })
    }
    clearCompatCounselorDraft()
    setMessages([])
    setChatSessionId(undefined)
    setChatTitle(null)
    clarifier.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clarifier.reset 은 hook 내부 useCallback 이라 stable. clarifier 객체는 매 render 새 reference.
  }, [chatSessionId, isKo])

  const sendMessage = useCallback(
    async (textOverride?: string, options?: { isRetry?: boolean }) => {
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
        // 새로고침/탭 복제 등 같은 turn 재진입 시 서버가 중복 차감 안 하도록
        // 매 user 메시지 마다 UUID 생성. "다시 시도" 일 때는 직전 turn 의
        // 키를 그대로 재사용 — 서버가 idempotent replay 로 인식해 credit
        // 추가 차감 없이 Claude 만 다시 호출. (부분 응답 후 끊긴 케이스도
        // 첫 호출에서 *이미* 차감됐기 때문에 재시도가 또 차감되면 중복.)
        const reusedKey = options?.isRetry ? lastTurnIdemKeyRef.current : null
        const idempotencyKey =
          reusedKey ||
          (typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `t${Date.now()}-${Math.random().toString(36).slice(2)}`)
        lastTurnIdemKeyRef.current = idempotencyKey
        // 운명 상담사의 useChatApi 패턴을 그대로 이식 — 헤더 도착까지의 절대
        // 시간 cap 과 chunk 사이 idle cap 을 분리해서 관리한다. 헤더가 30s
        // 안에 안 오면 abort, 헤더 받은 뒤엔 chunk idle 45s 기준으로 따로
        // 관리(아래 streamProcessor 호출부에서 reset).
        const HEADER_TIMEOUT_MS = 30_000
        const CHUNK_IDLE_TIMEOUT_MS = 45_000
        const MAX_RETRY_ATTEMPTS = 2
        const RETRY_BASE_DELAY_MS = 1_000
        // 5xx / 헤더 타임아웃은 운명 상담사처럼 자동 재시도(exponential backoff).
        // 같은 idempotencyKey 를 다시 보내므로 credit 중복 차감은 없다 (서버
        // idemStore.isReplay). retry 동안에도 controller / headerTimer 는
        // attempt 마다 새로 만든다.
        const requestBody = JSON.stringify({
          persons,
          person1Saju,
          person2Saju,
          person1Astro,
          person2Astro,
          lang: locale,
          messages: recentHistory,
          useRag: true,
          ...(cvText ? { cvText } : {}),
        })
        let response: Response | null = null
        let controller = new AbortController()
        let attempt = 0
        while (true) {
          controller = new AbortController()
          // Register controller so the component-level unmount cleanup
          // (above) can abort whatever attempt is currently in flight.
          inFlightAbortRef.current = controller
          const headerTimer = setTimeout(() => controller.abort(), HEADER_TIMEOUT_MS)
          try {
            response = await apiFetch('/api/compatibility/counselor', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-idempotency-key': idempotencyKey,
              },
              body: requestBody,
              signal: controller.signal,
            })
            clearTimeout(headerTimer)
            if (response.ok) break
            // 401/402/4xx 같은 *유저 액션* 에러는 재시도해도 의미 없음 — 그대로
            // 아래 not-ok 분기에서 throw. 5xx 만 재시도.
            if (response.status >= 500 && attempt < MAX_RETRY_ATTEMPTS) {
              attempt++
              await new Promise((r) => setTimeout(r, RETRY_BASE_DELAY_MS * attempt))
              continue
            }
            break
          } catch (err) {
            clearTimeout(headerTimer)
            const name = (err as Error & { name?: string }).name
            // 헤더 타임아웃(AbortError) / 네트워크 끊김은 자동 재시도.
            if (
              (name === 'AbortError' || name === 'TimeoutError') &&
              attempt < MAX_RETRY_ATTEMPTS
            ) {
              attempt++
              await new Promise((r) => setTimeout(r, RETRY_BASE_DELAY_MS * attempt))
              continue
            }
            throw err
          }
        }
        if (!response) {
          // 위 while 안에서 response 가 설정되지 않은 채 빠져나오는 경로는
          // 없지만 TypeScript narrowing 위해 가드.
          throw new Error('No response received')
        }

        if (!response.ok) {
          if (response.status === 401) {
            // 401 두 가지: (a) 진짜 로그인 필요, (b) 게스트 무료 2 회 한도
            // 도달 (서버가 X-Guest-Limit-Reached: 1 헤더 동봉). 메시지가 달라
            // 헤더로 분기.
            if (response.headers.get('x-guest-limit-reached') === '1') {
              throw new Error('guest_limit_reached')
            }
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
        if (!mountedRef.current) return
        setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

        // chunk idle timer — chunk 가 들어올 때마다 reset. 일정 시간 동안 한
        // byte 도 안 오면 응답이 진짜 멈춘 것으로 보고 abort. controller.abort()
        // 가 reader.read() 도 종료시켜 streamProcessor 가 truncated 로 마무리,
        // 그러면 페이지가 "다시 시도" 버튼을 자동 노출. 서버 heartbeat 가
        // 있어도 chunk 자체가 끊긴 케이스(클라 ↔ edge 사이 NAT drop 등) 는
        // 여기로 잡힌다.
        let idleTimer: ReturnType<typeof setTimeout> | null = null
        const armIdleTimer = () => {
          if (idleTimer) clearTimeout(idleTimer)
          idleTimer = setTimeout(() => controller.abort(), CHUNK_IDLE_TIMEOUT_MS)
        }
        armIdleTimer()

        let finalAssistantContent = ''
        const result = await streamProcessor.process(response, {
          onChunk: (_accumulated, cleaned) => {
            armIdleTimer()
            finalAssistantContent = cleaned
            if (!mountedRef.current) return
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
        if (idleTimer) clearTimeout(idleTimer)
        if (!mountedRef.current) return
        // 스트림이 ||FOLLOWUP|| 마커 전에 끊겼다면(모바일 LTE drop / 서버 idle
        // abort / Claude disconnect) 메시지를 "다시 시도" 버튼이 붙는 incomplete
        // 상태로 마킹. 단, 서버가 X-Counselor-Fallback: 1 을 달아 보낸 응답
        // (안전 차단 / 완결성 부족 / Claude 에러 시 generic 안내문) 은 *완결된*
        // 메시지지만 마커가 없을 뿐이라 truncated 로 보면 안 됨 → 헤더로 분기.
        const isServerFallback = response.headers.get('x-counselor-fallback') === '1'
        const wasTruncated = !isServerFallback && (!result.success || result.truncated)
        if (wasTruncated && finalAssistantContent) {
          setMessages((prev) => {
            const updated = [...prev]
            const lastIdx = updated.length - 1
            if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
              updated[lastIdx] = { ...updated[lastIdx], incomplete: true }
            }
            return updated
          })
        }
        // 운명 상담사와 동일 패턴 — LLM 의 generic followup ("더 알려줘",
        // "tell me more" 등) 을 클라이언트에서 결정적으로 필터링 + 부족분만
        // theme 기반 폴백으로 보충. 이전엔 LLM 2개 ≥ 면 그대로 / 미만이면
        // 폴백 전체 교체 였는데, 그 경우 LLM generic 답이 그대로 노출되거나
        // 답변 무관 폴백이 통째로 표시됐음.
        const lang = locale === 'ko' ? 'ko' : 'en'
        const goodAiFollowUps = result.followUps.filter((q) => !isGenericFollowUp(q, lang))
        const needed = 2 - goodAiFollowUps.length
        const merged =
          needed > 0
            ? [
                ...goodAiFollowUps,
                ...generateFollowUpQuestions(text, lang, 2, finalAssistantContent).filter(
                  (q) => !goodAiFollowUps.includes(q)
                ),
              ].slice(0, 2)
            : goodAiFollowUps.slice(0, 2)
        setFollowUpQuestions(merged)

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
              if (!mountedRef.current) return
              if (data?.success && data.session?.id && !chatSessionId) {
                setChatSessionId(data.session.id)
              }
            })
            .catch((err) =>
              logger.warn('[CompatCounselor] chat-history save failed', { error: err })
            )
        }
      } catch (e) {
        // Aborted via unmount — silent bail; nothing to setState into.
        const errName = (e as Error & { name?: string })?.name
        if (errName === 'AbortError' || !mountedRef.current) {
          return
        }
        logger.error('Chat error:', { error: e })
        const errMsg = (e as Error).message || ''
        if (errMsg === 'login_required') {
          setError(
            isKo
              ? '로그인이 필요한 프리미엄 기능입니다.'
              : 'Login required for this premium feature.'
          )
        } else if (errMsg === 'guest_limit_reached') {
          // 게스트 무료 2 회 한도 — 로그인 유도 모달 + 인라인 안내(모달 닫아도 남게).
          showGuestLimit()
          setError(
            isKo
              ? '궁합 상담 무료 체험 2회를 모두 사용했어요. 로그인하면 가입 보너스 5 크레딧으로 계속 이용할 수 있어요.'
              : 'You have used both free guest turns. Sign in to claim your 5-credit signup bonus and continue.'
          )
        } else if (errMsg === 'payment_required') {
          // 크레딧 소진 → 인라인 에러 대신 전역 크레딧 안내 모달을 띄운다
          // (운명 상담사·타로와 동일한 UX).
          showDepleted()
        } else {
          // Use the shared counselor localizer — same 429/5xx/timeout
          // branches as 운명상담사. Previously this concatenated the raw
          // `[Failed (500): RateLimitError: …]` tag into the user-visible
          // bubble; that stack-shape string is now hidden behind a friendly
          // "잠시 후 다시 시도해 주세요" message (still logged above for
          // debugging).
          const fallback = isKo
            ? '오류가 발생했습니다. 다시 시도해 주세요.'
            : 'An error occurred. Please try again.'
          setError(getCounselorErrorMessage(e, isKo ? 'ko' : 'en', fallback))
        }
      } finally {
        // Clear our in-flight slot if it still points at this call's
        // controller (a later call may have already replaced it).
        if (inFlightAbortRef.current && inFlightAbortRef.current.signal.aborted) {
          inFlightAbortRef.current = null
        }
        if (mountedRef.current) setIsLoading(false)
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
      showGuestLimit,
    ]
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // "다시 시도" — 잘린 assistant 답변과 그 직전 user 메시지를 둘 다 pop 한 뒤
  // 동일 user 텍스트로 재요청. isRetry: true 로 직전 turn 의 idempotencyKey 를
  // 재사용해 서버 idempotent replay 분기로 credit 중복 차감을 막는다. 부분
  // 응답 후 끊긴 케이스도 첫 호출에서 *이미* 차감됐기 때문에 같은 키 재사용
  // 이 정상적인 보호 동선.
  const retryLastAnswer = useCallback(() => {
    if (isLoading) return
    const len = messages.length
    if (len < 2) return
    if (messages[len - 1].role !== 'assistant') return
    if (messages[len - 2].role !== 'user') return
    const lastUserText = messages[len - 2].content
    setMessages((prev) => prev.slice(0, -2))
    setFollowUpQuestions([])
    void sendMessage(lastUserText, { isRetry: true })
  }, [isLoading, messages, sendMessage])

  // 🃏 클래리파이어 — 공통 hook (운명상담사 / followup 동일).
  const clarifier = useClarifierCard({
    lang: isKo ? 'ko' : 'en',
    onSendUserText: sendMessage,
    onLockedNotice: setError,
    suspendAutoScrollRef,
    disabled: isLoading || persons.length < 2,
  })

  // 인라인 picker → 두 사람 확정 시 fetchPersonData 로 사주/점성 불러와서 채팅 시작.
  // URL 도 ?persons= 로 갱신해 새로고침 / 공유 링크에 대응 (replace 라 뒤로가기 X).
  const handlePickerSubmit = useCallback(
    async (picked: PickedPersonData[]) => {
      if (picked.length < 2) return
      const personsData = picked.map((p) => ({
        name: p.name,
        date: p.date,
        time: p.time,
        city: p.city,
        latitude: p.latitude,
        longitude: p.longitude,
        timeZone: p.timeZone,
        relation: p.relation,
        gender: p.gender,
      }))
      setPersons(personsData)
      // 다음 번 자동 채움용 localStorage 저장.
      const toRecent = (p: (typeof personsData)[number]) => ({
        name: p.name,
        date: p.date,
        time: p.time,
        gender: p.gender,
        cityQuery: p.city || '',
        lat: p.latitude ?? null,
        lon: p.longitude ?? null,
        timeZone: p.timeZone || '',
        relation: p.relation,
      })
      pushRecentPair([toRecent(personsData[0]), toRecent(personsData[1])])
      // URL 동기화 — 새로고침해도 같은 페어 유지.
      router.replace(
        `/compatibility/counselor?persons=${encodeURIComponent(JSON.stringify(personsData))}`
      )
      setShowPicker(false)
      chartFetchRef.current = false
      await fetchPersonData(personsData)
    },
    [router]
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
          // Drop the local draft so the next remount starts genuinely empty
          // instead of resurrecting the conversation we just left.
          clearCompatCounselorDraft()
          setMessages([])
          setError(null)
          setInput('')
          setChatSessionId(undefined)
          setChatTitle(null)
          clarifier.reset()
          // 새 채팅 = 새 폼. persons 초기화 → picker 모달 자동 노출.
          // 사용자: "새로운 채팅창은 새로운 폼 나오고"
          setPersons([])
          setPerson1Saju(null)
          setPerson2Saju(null)
          setPerson1Astro(null)
          setPerson2Astro(null)
          chartFetchRef.current = false
          setShowPicker(true)
          setFocusToken((n) => n + 1)
        }}
        serviceType="compat"
        enableGrouping
        lightTheme
        /* 타로/카드 뽑기/궁합차트 버튼은 입력창 도구로 통일 — 사이드바는
           채팅 목록 전용. (이전엔 사이드바 + 입력창 양쪽에 있어 중복 + 헷갈림.) */
      />
      <div className={styles.mainColumn}>
        {/* Header — locale toggle removed (lives on main / entry page only).
            Heart accent kept next to the title to preserve the page's tone. */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button
              type="button"
              data-icon-only="true"
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

        {/* 두 사람 sticky 바 — 헤더 바로 아래. 클릭하면 최근 본 페어
            popover 열려서 다른 관계로 즉시 전환. persons 비어 있는 동안엔
            (=초기 로딩) 렌더 생략. */}
        {persons[0]?.name && persons[1]?.name && (
          <ProfileStickyBar
            persons={persons}
            isKo={isKo}
            onSwitchPair={(pair) => {
              // 다른 페어 골랐을 때 — 현재 채팅 컨텍스트 통째로 새 페어로 갈아끼우려고
              // 같은 라우트에 ?persons= 새로 전달 + replace 로 뒤로가기 히스토리에
              // 안 쌓이게. router.replace 가 동일 path → 새 search 면 페이지 리프레시,
              // useEffect 가 새 페어로 fetchPersonData 다시 호출.
              const payload = pair.persons.map((p) => ({
                name: p.name,
                date: p.date,
                time: p.time,
                gender: p.gender || 'M',
                city: p.cityQuery,
                latitude: p.lat ?? undefined,
                longitude: p.lon ?? undefined,
                timeZone: p.timeZone,
                relation: p.relation,
              }))
              router.replace(
                `/compatibility/counselor?persons=${encodeURIComponent(JSON.stringify(payload))}`
              )
            }}
            onPickOther={() => router.push('/compatibility')}
          />
        )}

        {/* Chat */}
        <div className={styles.chatWrapper}>
          <div className={styles.messagesContainer}>
            {/* 에러는 컨테이너 맨 위 — destiny noticeBar 와 같은 패턴.
                메시지 뒤 인라인이면 사용자가 새 메시지로 가려 못 보던 회귀. */}
            {error && <div className={styles.errorMessage}>{error}</div>}
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
              // 잘림 감지된 마지막 assistant 메시지에만 "다시 시도" 노출.
              // 스트리밍 중엔 숨김 — 새 토큰이 들어오는 동안 깜빡이지 않도록.
              const showRetry = isLastAssistant && !isLoading && msg.incomplete

              return (
                <div key={idx} className={`${styles.message} ${isUser ? styles.userMessage : ''}`}>
                  <div className={styles.messageAvatar} aria-hidden="true">
                    {isUser ? '\u{1F464}' : '\u{1F495}'}
                  </div>
                  <div className={styles.messageBubble}>
                    <ChatBubbleContent
                      role={msg.role}
                      content={msg.content}
                      pending={showTyping}
                      pendingNode={
                        <span className={styles.thinkingMessage}>
                          <span className={styles.typing}>
                            <span />
                            <span />
                            <span />
                          </span>
                          <span className={styles.thinkingText}>
                            {isKo
                              ? '두 분의 흐름을 깊이 읽고 있어요...'
                              : 'Reading the flow between the two of you…'}
                          </span>
                        </span>
                      }
                      theme="light"
                    />
                    {showRetry && (
                      <button
                        type="button"
                        className={styles.retryButton}
                        onClick={retryLastAnswer}
                        aria-label={isKo ? '다시 시도' : 'Retry'}
                      >
                        <span aria-hidden="true">{'↻'}</span>
                        {isKo ? '답변이 끊겼어요 · 다시 시도' : 'Cut off · Retry'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}

            {/* clarifier "카드 한 장 더 뽑기" — input 툴바가 아니라 타로
                결과 메시지 직후 노출 (운명상담사 MessagesPanel 패턴과 동일).
                마지막 메시지가 🃏 로 시작하는 타로 결과일 때만 보임. */}
            {(() => {
              const last = messages.length > 0 ? messages[messages.length - 1] : null
              const lastIsTarot =
                last?.role === 'assistant' && (last?.content || '').trimStart().startsWith('🃏')
              if (!lastIsTarot || isLoading) return null
              const cb = clarifier.buttonProps
              if (cb.disabled) return null
              return (
                <div className={styles.postAnswerActions}>
                  <button
                    type="button"
                    onClick={cb.onClick}
                    className={styles.clarifierActionBtn}
                    aria-label={clarifier.buttonLabel}
                  >
                    <span className={styles.clarifierActionIcon} aria-hidden="true">
                      🃏
                    </span>
                    {clarifier.buttonLabel}
                  </button>
                </div>
              )
            })()}

            {!isLoading && messages.length > 0 && (
              <FollowUpChips
                questions={followUpQuestions}
                lang={isKo ? 'ko' : 'en'}
                onPick={(q) => sendMessage(q)}
                styles={styles as never}
              />
            )}

            {/* 도구 안내 — 첫 답변(turn 1) 에만 1회 노출. turn 2+ 자동 X.
                "다시 안 보기" 또는 도구 사용 시 영구 dismiss (localStorage).
                이전엔 turn 1~3 까지 매번 노출이라 이미 아는 사용자한테
                반복 노출 짜증 — 1회로 축소. */}
            {(() => {
              const userTurns = messages.filter((m) => m.role === 'user').length
              const hasAssistantAnswer = messages.some((m) => m.role === 'assistant')
              if (toolHintDismissed || isLoading || !hasAssistantAnswer || userTurns !== 1) {
                return null
              }
              return (
                <ToolHint lang={isKo ? 'ko' : 'en'} variant="compat" onDismiss={dismissToolHint} />
              )
            })()}

            <div ref={messagesEndRef} />
          </div>

          {/* Input — 운명 상담사와 동일한 ChatInputArea 공용 컴포넌트.
              📎 파일 / 🃏 타로 / ✨ 궁합차트 + ✕ + ▶ 전송. 모든 화면 크기에서
              세 도구 모두 노출 (사이드바 푸터에 같은 진입점 없음). */}
          <ChatInputArea
            input={input}
            loading={isLoading}
            cvName={cvName}
            parsingPdf={parsingPdf}
            usedFallback={false}
            labels={{
              placeholder: isKo ? '질문을 입력하세요…' : 'Type a question…',
              send: isKo ? '전송' : 'Send',
              uploadCv: isKo
                ? '관계 메모·대화 등 파일 첨부 (txt/md/csv/pdf)'
                : 'Attach a file (txt/md/csv/pdf)',
              parsingPdf: isKo ? 'PDF 읽는 중…' : 'Parsing…',
            }}
            lang={locale}
            placeholderPrompts={isKo ? TYPEWRITER_PROMPTS_KO : TYPEWRITER_PROMPTS_EN}
            onInputChange={setInput}
            onKeyDown={handleKeyDown}
            onSend={() => sendMessage()}
            onFileUpload={(e) => {
              dismissToolHint()
              void handleFileUpload(e)
            }}
            onClearFile={clearFile}
            onOpenTarot={() => {
              dismissToolHint()
              setShowTarotModal(true)
            }}
            onOpenChart={() => {
              dismissToolHint()
              setShowChartModal(true)
            }}
            tarotDisabled={persons.length < 2}
            chartDisabled={persons.length < 2 || (!person1Saju && !person1Astro)}
            tarot={{
              ariaLabel: isKo ? '다음 질문 타로로 보기' : 'See your next question in tarot',
              title: isKo
                ? '다음 질문을 타로로 보기 — 질문 적고 스프레드 골라 카드 뽑기'
                : 'See your next question in tarot — pick a spread and draw',
            }}
            chart={{
              label: isKo ? '궁합차트' : 'Chart',
              ariaLabel: isKo ? '궁합 차트' : 'Couple chart',
              title: isKo ? '궁합 차트 보기' : 'View couple chart',
            }}
            focusToken={focusToken}
            theme="light"
          />
          {fileNotice && <div className={styles.fileNotice}>{fileNotice}</div>}
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
        origin="compat"
      />

      <ClarifierCardModal {...clarifier.modalProps} />

      {showPicker && (
        <CompatPersonPickerModal
          onSubmit={(picked) => void handlePickerSubmit(picked)}
          subtitle={
            isKo ? '두 사람의 정보로 채팅을 시작해요.' : 'Enter two profiles to start chatting.'
          }
        />
      )}

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

/**
 * 헤더 sticky 바 — 클릭하면 최근 본 페어 popover 가 열려서 다른 관계로
 * 즉시 전환할 수 있다. 현재 페어는 popover 에서 제외 (이미 보고 있음).
 * "다른 사람으로 보기" 항목으로 입력 페이지(/compatibility) 이동.
 */
function ProfileStickyBar({
  persons,
  isKo,
  onSwitchPair,
  onPickOther,
}: {
  persons: PersonData[]
  isKo: boolean
  onSwitchPair: (pair: RecentPair) => void
  onPickOther: () => void
}) {
  const [open, setOpen] = useState(false)
  const [pairs, setPairs] = useState<RecentPair[]>([])
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setPairs(getRecentPairs())
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // 현재 페어와 같은 항목은 popover 에서 제외 — 자기 자신으로 전환은 의미 X.
  const currentKey = `${persons[0]?.name?.trim()}|${persons[0]?.date}|${persons[1]?.name?.trim()}|${persons[1]?.date}`
  const otherPairs = pairs.filter(
    (p) =>
      `${p.persons[0].name.trim()}|${p.persons[0].date}|${p.persons[1].name.trim()}|${p.persons[1].date}` !==
      currentKey
  )

  return (
    <div ref={wrapperRef} className={styles.profileStickyBarWrap}>
      <button
        type="button"
        className={styles.profileStickyBar}
        onClick={() => setOpen((o) => !o)}
        aria-label={isKo ? '대상 인물 — 다른 관계로 전환' : 'Subjects — switch relationship'}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className={styles.profileStickyName}>{persons[0].name}</span>
        <span className={styles.profileStickyArrow} aria-hidden="true">
          ↔
        </span>
        <span className={styles.profileStickyName}>{persons[1].name}</span>
        <span className={styles.profileStickyChevron} aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div role="menu" className={styles.profileStickyDropdown}>
          {otherPairs.length > 0 && (
            <>
              <div className={styles.profileStickyDropdownLabel}>
                {isKo ? '최근 본 관계' : 'Recent relationships'}
              </div>
              {otherPairs.map((pair, idx) => (
                <button
                  key={idx}
                  type="button"
                  role="menuitem"
                  className={styles.profileStickyDropdownItem}
                  onClick={() => {
                    setOpen(false)
                    onSwitchPair(pair)
                  }}
                >
                  <span className={styles.profileStickyName}>{pair.persons[0].name}</span>
                  <span className={styles.profileStickyArrow} aria-hidden="true">
                    ↔
                  </span>
                  <span className={styles.profileStickyName}>{pair.persons[1].name}</span>
                </button>
              ))}
              <div className={styles.profileStickyDropdownDivider} />
            </>
          )}
          <button
            type="button"
            role="menuitem"
            className={styles.profileStickyDropdownItem}
            onClick={() => {
              setOpen(false)
              onPickOther()
            }}
          >
            {isKo ? '+ 다른 사람으로 보기' : '+ Pick someone else'}
          </button>
        </div>
      )}
    </div>
  )
}
