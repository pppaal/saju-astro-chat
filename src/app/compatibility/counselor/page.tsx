'use client'

import { useEffect, useState, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useI18n } from '@/i18n/I18nProvider'
import CreditBadge from '@/components/ui/CreditBadge'
import CounselorLoadingScreen from '@/components/branding/CounselorLoading'
import { useClarifierCard } from '@/hooks/useClarifierCard'
import { useChatAutoScroll } from '@/hooks/useChatAutoScroll'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import CounselorSidebar from '@/components/destiny-map/CounselorSidebar'
import styles from './compatibility-counselor.module.css'
import { logger } from '@/lib/logger'
import { apiFetch } from '@/lib/api'
import { type TarotResultSummary } from '@/components/destiny-map/InlineTarotModal'
import { useFileUpload } from '@/components/destiny-map/hooks/useFileUpload'
import { pushRecentPair } from '@/app/compatibility/lib'
import { normalizeGender } from '@/lib/utils/gender'
import { type PickedPersonData } from './CompatPersonPickerModal'
import { fetchLatestSessionId } from '@/lib/counselor/latestSession'
import { useChatActions } from '@/lib/counselor/useChatActions'
import { useCounselorNewChat } from '@/lib/counselor/useCounselorNewChat'
import { loadPendingChat } from '@/lib/chat/pendingChat'
import { AppHeader, AppHeaderIconButton } from '@/components/ui/AppHeader'
import { useCompatCounselorChat } from './useCompatCounselorChat'
import { CompatChatArea } from './CompatChatArea'
import { CompatCounselorModals } from './CompatCounselorModals'
import { ProfileStickyBar } from './ProfileStickyBar'
import type { ChatMessage, PersonData } from './types'

// (타이프라이터 placeholder 제거 — 사용자 요청으로 운명·궁합 입력창은 움직이는
// 문구 없이 정적 placeholder 로 통일. 메인 홈 입력창만 순환 타이프라이터 유지.)

// 메인/상담 화면과 톤이 끊기지 않는 조용한 로더(따뜻한 화이트 + 헥사 마크)로
// 통일 — 운명 상담사와 동일. lang 인자는 호출부 호환을 위해 남겨두되, 로더
// 자체는 문구 없이 색·로고 연속성만으로 "로딩 걸린지도 모르게" 전환되게 한다.
function CounselorLoading(_props: { lang?: 'ko' | 'en' }) {
  void _props
  return <CounselorLoadingScreen />
}

function CompatibilityCounselorContent() {
  const { locale } = useI18n()
  const searchParams = useSearchParams()
  const router = useRouter()
  // '새 채팅' 세션 정리를 운명 상담사와 완전히 동일하게 공유 — 드래프트 정리 +
  // URL ?session= 제거 + 상태 리셋. resume 효과에 자동복원 가드(autoResumeAttemptedRef)
  // 를 달아 bare URL 이 돼도 직전 채팅을 다시 끌어오지 않으므로 strip 을 켤 수 있다.
  const startNewChat = useCounselorNewChat('/compatibility/counselor', 'compat')

  const [persons, setPersons] = useState<PersonData[]>([])
  const [person1Saju, setPerson1Saju] = useState<Record<string, unknown> | null>(null)
  const [person2Saju, setPerson2Saju] = useState<Record<string, unknown> | null>(null)
  const [person1Astro, setPerson1Astro] = useState<Record<string, unknown> | null>(null)
  const [person2Astro, setPerson2Astro] = useState<Record<string, unknown> | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  /** persons 가 비어 있을 때 picker 모달 노출 여부 — URL 에 ?persons= /
   *  ?session= 둘 다 없는 신규 진입 + 새 채팅 직후에 true. */
  const [showPicker, setShowPicker] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
  // 파일 첨부 — 운명 상담사와 동일한 훅. 업로드 텍스트(cvText)는 전송
  // payload 로 전달돼 라우트가 현재 턴 프롬트에 주입한다.
  const [fileNotice, setFileNotice] = useState<string | null>(null)
  const { cvText, cvName, parsingPdf, handleFileUpload, clearFile } = useFileUpload({
    lang: locale,
    setNotice: setFileNotice,
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chartFetchRef = useRef(false)
  // Track mount lifecycle so the post-await setStates inside the chat hook
  // and fetchPersonData below bail out cleanly when the user navigates
  // away mid-stream. PR #890 applied the same pattern to useChatApi.
  const mountedRef = useRef(true)
  // Chart-data prefetch abort — 4 parallel /api/saju and /api/astrology
  // fetches that otherwise keep running and fire 4 setStates after the
  // user navigates away. (스트림 쪽 abort 는 공용 훅이 자체 관리.)
  const chartFetchAbortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
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

  // 공용 상담 채팅 훅(운명 상담사와 동일 골격) — 메시지/입력/전송 스트림/
  // idempotency 재사용/끊긴 턴 복원/다시 시도/드래프트 저장 오케스트레이션.
  const {
    messages,
    setMessages,
    input,
    setInput,
    loading: isLoading,
    followUpQuestions,
    sendMessage,
    retryLastAnswer,
    queueResumeText,
  } = useCompatCounselorChat({
    locale,
    isKo,
    persons,
    person1Saju,
    person2Saju,
    person1Astro,
    person2Astro,
    chatSessionId,
    setChatSessionId,
    chatTitle,
    cvText,
    isInitializing,
    mountedRef,
    setError,
  })

  // 자동 "최근 채팅 이어보기"는 최초 진입 1회만 허용 — '새 채팅'으로 URL 이
  // bare 가 돼도 직전 채팅을 다시 끌어오지 않도록 가드(운명 상담사와 동일 패턴).
  const autoResumeAttemptedRef = useRef(false)
  useEffect(() => {
    if (!searchParams) {
      return
    }

    const initializeData = async () => {
      try {
        const sessionParam = searchParams.get('session')
        const personsParam = searchParams.get('persons')

        // 이번이 최초 진입인지 기록. 최초 1회에 한해서만 "가장 최근 채팅 자동
        // 이어보기"를 허용한다. 이후(예: 새 채팅으로 bare URL 이 된 재실행)엔
        // 자동복원을 건너뛰어 새 채팅이 옛 대화로 덮이지 않게 한다. 명시적
        // ?session= resume 은 이 가드와 무관하게 항상 동작한다.
        const isFirstEntry = !autoResumeAttemptedRef.current
        autoResumeAttemptedRef.current = true

        // 게스트 진행 드래프트 복원 — 비로그인/크레딧 소진 상태로 채팅하다 한도에
        // 걸려 로그인·크레딧 구매로 페이지가 풀 리로드돼도, 직전 채팅을 그대로
        // 되살린다(게스트는 서버 저장이 안 되므로 localStorage 드래프트가 유일한
        // 단서). ?session= 명시 진입이 아니면 서버 자동 resume 보다 우선한다 —
        // 방금까지 보던 진행분이 가장 최근이기 때문. 다음 턴부터는 (로그인 후)
        // 서버에 저장되며 드래프트는 정리된다.
        if (!sessionParam) {
          const draft = loadPendingChat<{
            persons: PersonData[]
            person1Saju: Record<string, unknown> | null
            person2Saju: Record<string, unknown> | null
            person1Astro: Record<string, unknown> | null
            person2Astro: Record<string, unknown> | null
            messages: ChatMessage[]
            chatTitle: string | null
          }>('compat')
          if (
            draft &&
            Array.isArray(draft.persons) &&
            draft.persons.length >= 2 &&
            Array.isArray(draft.messages) &&
            draft.messages.length > 0
          ) {
            setPersons(draft.persons)
            setPerson1Saju(draft.person1Saju ?? null)
            setPerson2Saju(draft.person2Saju ?? null)
            setPerson1Astro(draft.person1Astro ?? null)
            setPerson2Astro(draft.person2Astro ?? null)
            {
              const restoredMsgs = draft.messages.filter(
                (m): m is ChatMessage => !!m && (m.role === 'user' || m.role === 'assistant')
              )
              // 마지막이 아직 답을 못 받은 user 질문이면 떼어내 자동 재전송 대상으로.
              // (로그인/구매 왕복 후 "직전 질문 이어서 답변" — 인증 확인 시 1회
              // 재전송은 공용 훅이 처리. 안 떼면 sendMessage 가 user 메시지를 한 번
              // 더 추가해 같은 질문이 두 번 뜬다.)
              if (
                restoredMsgs.length > 0 &&
                restoredMsgs[restoredMsgs.length - 1]?.role === 'user'
              ) {
                const last = restoredMsgs.pop()
                const t = last && typeof last.content === 'string' ? last.content.trim() : ''
                if (t) queueResumeText(t)
              }
              setMessages(restoredMsgs)
            }
            if (draft.chatTitle) setChatTitle(draft.chatTitle)
            // 복원한 대화는 맨 아래(최신)부터 보여줘야 함 — 기본은 TOP 정렬이라
            // 사용자가 직접 스크롤해야 했던 회귀. destiny Chat.tsx 와 동일 패턴.
            scrollToBottomImmediate()
            return // 서버 자동 resume / picker 건너뜀
          }
        }

        // ChatGPT 식 "마지막 채팅 이어서 띄우기" — ?session= / ?persons= 둘 다
        // 없는 맨몸 진입이면 가장 최근 궁합 채팅을 자동으로 이어 띄운다.
        // (비로그인이면 null → 아래에서 picker 로 떨어짐.)
        let resumeId: string | null = sessionParam
        if (!resumeId && !personsParam && isFirstEntry) {
          resumeId = await fetchLatestSessionId('compat')
        }

        // 1) Past-chat resume path: ?session=<id> 또는 자동 resume. Restore both
        //    the conversation and the couple snapshot we saved alongside.
        if (resumeId) {
          try {
            const res = await apiFetch(
              `/api/counselor/session/load?sessionId=${encodeURIComponent(resumeId)}`
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
                // 과거 세션 resume — 최신 메시지(맨 아래)로 즉시 스크롤. destiny
                // Chat.tsx 의 scrollToLatest() 와 동일 (기본 TOP 정렬 회귀 방지).
                scrollToBottomImmediate()
                return // skip fresh-start path
              }
            }
          } catch (loadErr) {
            logger.warn('[CompatCounselor] resume past chat failed', { error: loadErr })
            // fall through to fresh-start path
          }
        }

        // 2) Fresh-start path: ?persons=... from the form.
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
          // 3) Direct entry with no couple — inline picker 모달 노출.
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
    if (isInitializing) return
    if (persons.length < 2) return
    if (person1Saju || person2Saju || person1Astro || person2Astro) return
    if (chartFetchRef.current) return
    fetchPersonData(persons)
  }, [isInitializing, persons, person1Saju, person2Saju, person1Astro, person2Astro])

  // 자동 스크롤 — 공통 hook (destiny / followup 동일). externalRef 로 기존
  // messagesEndRef 그대로 사용.
  const { scrollToBottomImmediate } = useChatAutoScroll({
    messages,
    loading: isLoading,
    suspendRef: suspendAutoScrollRef,
    externalRef: messagesEndRef,
  })

  // dvh layout requires html/body scroll lock — same trick as destiny-counselor.
  useBodyScrollLock()

  // 채팅 준비되면 입력창에 focus — focusToken 갱신만 하면 ChatInputArea
  // 내부 effect 가 textarea 에 focus.
  // 단, picker 폼(모달)이 떠 있는 동안엔 focus 하지 않는다 — 모달 뒤
  // 입력창에 focus 가 가면 모바일에서 폼만 봤는데 키보드가 자동으로
  // 올라오는 회귀("궁합폼 열면 키보드 자동으로 뜸"). picker 를 닫고
  // (=제출) 채팅으로 들어올 때 showPicker→false 로 effect 가 다시 돌아 focus.
  useEffect(() => {
    if (!isInitializing && !showPicker) {
      setFocusToken((n) => n + 1)
    }
  }, [isInitializing, showPicker])

  // ⋮ 메뉴 + Rename / Delete 모달 — 공용 hook 으로 위임. 인앱 PromptModal 로
  // 통일 + optimistic title update + rollback + 401 토스트는 hook 안에서 처리.
  // 페이지는 onRenamed/onDeleted/onError 콜백으로 자기 state 정리만 담당.
  const chatActions = useChatActions({
    sessionId: chatSessionId ?? null,
    title: chatTitle,
    lang: locale,
    onRenamed: useCallback((nextTitle: string) => {
      setChatTitle(nextTitle || null)
    }, []),
    onDeleted: useCallback(() => {
      setMessages([])
      setChatSessionId(undefined)
      setChatTitle(null)
      clarifier.reset()
      // eslint-disable-next-line react-hooks/exhaustive-deps -- clarifier.reset 은 hook 내부 useCallback 이라 stable.
    }, []),
    onError: useCallback(({ kind, status }: { kind: 'rename' | 'delete'; status?: number }) => {
      logger.warn('[CompatCounselor] action failed', { kind, status })
    }, []),
  })

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
      // 새 커플 = 새 대화. 이전 커플의 메시지/세션/제목/차트를 비우지 않으면
      // 새 커플 채팅이 옛 대화에 이어붙고 옛 세션 ID 로 저장되는 정합성 버그.
      // (직접 진입·새 채팅 경로는 이미 빈 상태라 무해.)
      setMessages([])
      setChatSessionId(undefined)
      setChatTitle(null)
      setPerson1Saju(null)
      setPerson2Saju(null)
      setPerson1Astro(null)
      setPerson2Astro(null)
      // URL 동기화 — 새로고침해도 같은 페어 유지.
      router.replace(
        `/compatibility/counselor?persons=${encodeURIComponent(JSON.stringify(personsData))}`
      )
      setShowPicker(false)
      chartFetchRef.current = false
      await fetchPersonData(personsData)
    },
    [router, setMessages]
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
    [isKo, persons, setMessages]
  )

  if (isInitializing) {
    return <CounselorLoading lang={isKo ? 'ko' : 'en'} />
  }

  return (
    <main className={`${styles.page} ${styles.fadeIn}`}>
      <CounselorSidebar
        open={sidebarOpen}
        activeSessionId={chatSessionId}
        activeSessionTitle={chatTitle}
        onClose={() => setSidebarOpen(false)}
        onNewChat={() => {
          if (isLoading) return
          // 세션 정리(드래프트 + URL ?session= 제거)는 운명 상담사와 공유하는
          // useCounselorNewChat 으로 통일. 상태 리셋 + picker 노출은 아래 onReset.
          startNewChat(() => {
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
          })
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
        <AppHeader
          layout="counselor"
          theme="light"
          sticky
          onMenuClick={() => setSidebarOpen(true)}
          menuLabel={isKo ? '메뉴' : 'Menu'}
          title={
            <>
              {!chatTitle && (
                <span className={styles.headerHeart} aria-hidden="true">
                  {'❤️'}
                </span>
              )}
              {chatTitle?.trim() || (isKo ? '궁합 상담사' : 'Compatibility Counselor')}
            </>
          }
          rightSlot={
            <>
              {/* 세션이 생기기 전(첫 진입)에도 ⋮ 자리를 차지하도록 항상 렌더하고,
                  세션 없으면 visibility:hidden 으로 숨긴다. 이전엔 chatSessionId
                  생길 때 ⋮ 가 pop-in 하며 옆의 CreditBadge 를 왼쪽으로 밀어
                  상단 우측이 "움직이던" layout shift 가 있었음. */}
              <div
                ref={chatActions.chatMenuRef}
                className={styles.chatMenuArea}
                aria-hidden={!chatSessionId}
                style={chatSessionId ? undefined : { visibility: 'hidden' }}
              >
                <AppHeaderIconButton
                  onClick={chatActions.toggleChatMenu}
                  label={isKo ? '대화 메뉴' : 'Chat menu'}
                  aria-expanded={chatActions.chatMenuOpen}
                  aria-haspopup="menu"
                  tabIndex={chatSessionId ? undefined : -1}
                >
                  <span aria-hidden="true">{'⋮'}</span>
                </AppHeaderIconButton>
                {chatSessionId && chatActions.chatMenuOpen && (
                  <div role="menu" className={styles.chatMenuDropdown}>
                    <button
                      type="button"
                      role="menuitem"
                      className={styles.chatMenuItem}
                      onClick={chatActions.openRenameModal}
                    >
                      <span>{isKo ? '이름 변경' : 'Rename'}</span>
                      <span aria-hidden="true" className={styles.chatMenuIcon}>
                        {'✎'}
                      </span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className={`${styles.chatMenuItem} ${styles.chatMenuItemDanger}`}
                      onClick={chatActions.openDeleteModal}
                    >
                      <span>{isKo ? '삭제' : 'Delete'}</span>
                      <span aria-hidden="true" className={styles.chatMenuIcon}>
                        {'🗑'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
              <div className={styles.creditBadgeWrap}>
                <CreditBadge variant="compact" />
              </div>
            </>
          }
        />

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
              // 새 페어 = 새 대화. 이전 대화/세션/제목/차트를 비워야 옛 커플
              // 세션에 새 커플 메시지가 섞이지 않는다. (initializeData 가
              // ?persons= 만 보고는 대화를 초기화하지 않기 때문에 여기서 처리.)
              setMessages([])
              setChatSessionId(undefined)
              setChatTitle(null)
              setPerson1Saju(null)
              setPerson2Saju(null)
              setPerson1Astro(null)
              setPerson2Astro(null)
              chartFetchRef.current = false
              router.replace(
                `/compatibility/counselor?persons=${encodeURIComponent(JSON.stringify(payload))}`
              )
            }}
            onPickOther={() => setShowPicker(true)}
          />
        )}

        {/* Chat — 메시지 목록 + 입력창 (분해된 채팅 영역 컴포넌트) */}
        <CompatChatArea
          isKo={isKo}
          locale={locale}
          messages={messages}
          isLoading={isLoading}
          error={error}
          followUpQuestions={followUpQuestions}
          input={input}
          onInputChange={setInput}
          sendMessage={sendMessage}
          retryLastAnswer={retryLastAnswer}
          clarifier={clarifier}
          messagesEndRef={messagesEndRef}
          cvName={cvName}
          parsingPdf={parsingPdf}
          onFileUpload={(e) => {
            void handleFileUpload(e)
          }}
          onClearFile={clearFile}
          fileNotice={fileNotice}
          onOpenTarot={() => {
            setShowTarotModal(true)
          }}
          onOpenChart={() => {
            setShowChartModal(true)
          }}
          tarotDisabled={persons.length < 2}
          chartDisabled={
            persons.length < 2 || (!person1Saju && !person1Astro && !person2Saju && !person2Astro)
          }
          focusToken={focusToken}
        />
      </div>

      <CompatCounselorModals
        isKo={isKo}
        locale={locale}
        persons={persons}
        showTarotModal={showTarotModal}
        onCloseTarot={() => setShowTarotModal(false)}
        onTarotComplete={handleTarotComplete}
        clarifierModalProps={clarifier.modalProps}
        showPicker={showPicker}
        onPickerSubmit={(picked) => void handlePickerSubmit(picked)}
        showChartModal={showChartModal}
        onCloseChart={() => setShowChartModal(false)}
        person1Saju={person1Saju}
        person2Saju={person2Saju}
        person1Astro={person1Astro}
        person2Astro={person2Astro}
        chatTitle={chatTitle}
        chatActions={chatActions}
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
