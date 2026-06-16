'use client'

// src/lib/counselor/useCounselorChat.ts
//
// 운명 상담사(destiny-map/Chat.tsx + useChatApi)와 궁합 상담사
// (app/compatibility/counselor)가 복붙으로 유지하던 채팅 오케스트레이션을
// 한 곳으로 모은 공용 훅. 훅이 소유하는 것은 두 화면에서 *의미가 동일한*
// 골격이다:
//
//   - 전송 파이프라인: 가드 → user 메시지 반영 → idempotency 키 할당(재시도면
//     직전 키 재사용) → pendingTurn 영속화 → 요청 → assistant placeholder →
//     스트림 소비(chunk idle 타이머) → 턴 마무리 위임
//   - "다시 시도"(retryLastAnswer): 잘린 assistant + 직전 user pop 후
//     isRetry: true 재전송 — 서버 idempotent replay 로 credit 중복 차감 방지
//   - 끊긴 턴 복원: recoverableTurnRef + localStorage pendingTurn(TTL) +
//     result 캐시 폴링(attemptRecover) + visibility/online/focus 재개
//   - 로그인/구매 왕복 후 "직전 질문 이어서 답변"(queueResumeText)
//   - 게스트 진행 드래프트(pendingChat) 자동 저장
//   - followUp 칩 상태
//
// 화면별로 실제 동작이 다른 지점(엔드포인트/요청 body, 토큰 렌더링 방식,
// 에러 카피, 세션 저장 방식, 잘림 판정 등)은 전부 config 콜백으로 주입한다 —
// 두 소비자의 기존 동작을 1:1 로 보존하는 것이 최우선이라, 훅이 임의로
// 통일하지 않는다.

import React from 'react'
import { useSession } from 'next-auth/react'
import { streamProcessor } from '@/lib/streaming'
import type { StreamResult } from '@/lib/streaming'
import {
  readPendingTurn,
  writePendingTurn,
  clearPendingTurn,
  PENDING_TURN_TTL_MS,
  type PendingTurnKind,
} from '@/lib/chat/pendingTurn'
import { savePendingChat, clearPendingChat } from '@/lib/chat/pendingChat'
import { useRecoverOnResume } from '@/hooks/useRecoverOnResume'
import {
  generateFollowUpQuestions,
  isGenericFollowUp,
} from '@/components/destiny-map/chat-followups'

/** 두 상담사 메시지 타입의 공통 분모 (destiny 는 id/streaming 도 사용). */
export interface CounselorChatMessageBase {
  role: 'system' | 'user' | 'assistant'
  content: string
  id?: string
  streaming?: boolean
  /** 스트림이 중간에 끊긴 답변 — 버블에 "다시 시도" 노출. */
  incomplete?: boolean
}

export interface CounselorSendOptions<TMsg> {
  isRetry?: boolean
  /**
   * "다시 시도"가 잘린 답+직전 user 를 막 pop 한 직후에는 state 가 아직 옛
   * 값이라, 호출자가 정리한 히스토리를 정본으로 넘긴다(궁합 상담사 경로).
   */
  historyOverride?: TMsg[]
}

export interface CounselorTurn {
  /** user 발화 (trim/가공 후) */
  text: string
  /** 이번 턴 idempotency 키 — isRetry 면 직전 턴 키 재사용 */
  idempotencyKey: string
  /** 서버 result 캐시 키 — idempotencyKey 와 동일 값 (재시도도 같은 키로 모임) */
  turnId: string
  isRetry: boolean
}

export interface CounselorStreamOutcome {
  result: StreamResult
  /** onChunk 가 마지막으로 전달한 cleaned 누적 본문 (compat 의 잘림 판정용) */
  finalContent: string
  response: Response
  turn: CounselorTurn
  /** 이번 턴에 push 된 assistant placeholder 의 id (있다면) */
  assistantMsgId?: string
}

/** completeTurn / applyRecovered 에 넘기는 훅 내부 헬퍼. */
export interface CounselorTurnHelpers {
  /** 이 턴을 끊김 복원 대상으로 등록 — recoverable ref + pendingTurn 영속화. */
  markRecoverable: (assistantMsgId?: string) => void
  /** result 캐시 폴링 시작 (visibility/중복 가드는 내부에서). */
  kickRecover: () => void
  /** 정상 완료 — 복원 단서(메모리 ref + localStorage) 정리. */
  finishTurnClean: () => void
  setFollowUpQuestions: React.Dispatch<React.SetStateAction<string[]>>
}

export interface CounselorRecoveredTurn {
  turnId: string
  userText: string
  /** 전송 당시 placeholder id — 새로고침 후 복원이면 빈 문자열일 수 있음. */
  assistantMsgId: string
  /** ||FOLLOWUP|| 마커를 제거한 완성 본문 */
  cleanContent: string
  followUps: string[]
}

export interface UseCounselorChatConfig<TMsg extends CounselorChatMessageBase> {
  /** pendingTurn / pendingChat localStorage 네임스페이스 */
  namespace: PendingTurnKind
  /**
   * 메시지 상태 — 소비자가 소유한 [state, setState] 를 주입한다.
   * (destiny 는 useChatSession 이, compat 은 어댑터가 소유.)
   */
  messagesState: [TMsg[], React.Dispatch<React.SetStateAction<TMsg[]>>]
  /** trim 후 추가 가공 (destiny: 8000자 클램프). */
  prepareText?: (trimmed: string) => string
  /**
   * 전송 직전 가드/부수효과. false 반환 시 전송을 중단한다(메시지 push 전 —
   * compat 의 로그인 게이트 + 드래프트 보존). destiny 의 위기 감지처럼
   * 차단하지 않는 부수효과는 아무것도 반환하지 않으면 된다.
   */
  beforeSend?: (text: string, options?: CounselorSendOptions<TMsg>) => boolean | void
  makeUserMessage: (text: string) => TMsg
  makeAssistantMessage: () => TMsg
  /**
   * user 메시지 화면 반영. destiny 는 기존 useChatApi 의 value-set
   * (`setMessages([...baseHistory, userMessage])`) 을, compat 은 함수형
   * append 를 쓴다 — retry 직전 pop 과의 상호작용까지 기존 동작을 보존하기
   * 위해 호출자가 결정한다.
   */
  applyUserMessage: (args: {
    setMessages: React.Dispatch<React.SetStateAction<TMsg[]>>
    userMessage: TMsg
    baseHistory: TMsg[]
  }) => void
  /** 전송 시작 시 화면별 상태 정리 (setError(null) / setNotice(null) 등). */
  onSendStart?: (text: string) => void
  /**
   * 요청 실행 — 엔드포인트/헤더/body/재시도 에러 매핑은 화면별.
   * 공용 backoff 골격은 requestCounselorStream 헬퍼로 공유한다.
   * history 는 user 메시지가 포함된 전체 히스토리 — 클램프(slice)는
   * 페이로드 빌더가 화면별 정책(-10/-20)으로 수행한다.
   */
  performRequest: (args: {
    turn: CounselorTurn
    history: TMsg[]
    registerController: (c: AbortController) => void
  }) => Promise<{ res: Response; controller: AbortController }>
  /** 응답 헤더 도착 직후, placeholder push 전 (destiny 의 x-fallback 안내). */
  onResponse?: (res: Response) => void
  /** 스트림 chunk 사이 idle 허용 시간 — 초과 시 abort → truncated 마무리. */
  chunkIdleTimeoutMs: number
  /**
   * true 면 heartbeat 등 모든 바이트 활동에 idle 타이머 재무장(destiny).
   * false 면 content chunk 에만 재무장(compat 기존 동작).
   */
  rearmIdleOnActivity: boolean
  /** 토큰 렌더 — destiny 는 버퍼링/스로틀, compat 은 직접 setMessages. */
  renderChunk: (cleaned: string) => void
  onStreamError?: (err: Error) => void
  /**
   * 스트림 종료 후 턴 마무리 — 잘림 판정·incomplete 마킹·followUp 칩·세션
   * 저장은 화면별 차이가 커서 통째로 위임한다. 복원 등록/정리는 helpers 로.
   */
  completeTurn: (
    outcome: CounselorStreamOutcome,
    helpers: CounselorTurnHelpers
  ) => void | Promise<void>
  /** 전송 파이프라인의 catch — 에러 카피/크레딧 모달 등 화면별 처리. */
  onSendFailure: (e: unknown) => void
  /**
   * true 면 언마운트 후 placeholder push / 턴 마무리를 중단한다(compat).
   * destiny 는 기존처럼 중단하지 않는다(언마운트 후에도 부분 저장·복원
   * 단서 기록이 돌던 기존 동작 보존).
   */
  haltOnUnmount: boolean
  /** 언마운트 정리 — 진행 중 스트림이 있었으면 그 user 텍스트를 넘긴다. */
  onUnmountCleanup?: (args: { inFlightUserText: string | null }) => void
  /** 끊긴 턴 result 폴링 엔드포인트. */
  resultEndpoint: (turnId: string) => string
  /**
   * 복원된 완성 본문 반영(메시지 교체/followUp/저장). false 반환 시 복원
   * 단서를 정리하지 않고 중단한다(compat: 언마운트).
   */
  applyRecovered: (
    recovered: CounselorRecoveredTurn,
    helpers: Pick<CounselorTurnHelpers, 'setFollowUpQuestions'>
  ) => boolean | void
  /** 마운트 복원 — 복원된 대화의 마지막 메시지가 살릴 만한 미완성인지. */
  isRecoverableLastMessage: (last: TMsg) => boolean
  /** "다시 시도" 시 정리된 히스토리를 historyOverride 로 넘길지 (compat). */
  retryUsesHistoryOverride: boolean
  /** 게스트 진행 드래프트(pendingChat) 자동 저장 설정. */
  draft?: {
    /** true 인 동안 저장하지 않음 (compat: isInitializing). */
    suspended?: boolean
    /** 서버 세션이 생기면 서버가 정본 — 드래프트 제거. */
    hasServerSession: boolean
    /** 저장할 payload — null 이면 저장 생략. */
    build: (messages: TMsg[]) => unknown | null
    /** messages/loading 외에 저장을 다시 트리거할 화면별 의존성. */
    deps?: React.DependencyList
  }
}

export interface UseCounselorChatReturn<TMsg extends CounselorChatMessageBase> {
  messages: TMsg[]
  setMessages: React.Dispatch<React.SetStateAction<TMsg[]>>
  input: string
  setInput: React.Dispatch<React.SetStateAction<string>>
  loading: boolean
  followUpQuestions: string[]
  setFollowUpQuestions: React.Dispatch<React.SetStateAction<string[]>>
  sendMessage: (textOverride?: string, options?: CounselorSendOptions<TMsg>) => Promise<void>
  /** 잘린 마지막 답변 재요청 — 직전 turn idempotencyKey 재사용. */
  retryLastAnswer: () => void
  attemptRecover: () => Promise<void>
  /**
   * 복원 시 떼어둔 '미답변 user 질문'을 등록 — 인증 확인되는 대로 1회 자동
   * 재전송("직전 질문 이어서 답변").
   */
  queueResumeText: (text: string) => void
  /**
   * 재시도/자동 재전송이 거쳐야 하는 바깥 send 래퍼(가드 포함). destiny 는
   * Chat.tsx 의 handleSend 래퍼를 등록한다. 미등록이면 내부 sendMessage 사용.
   */
  outerSendRef: React.MutableRefObject<
    ((text?: string, options?: CounselorSendOptions<TMsg>) => void | Promise<void>) | null
  >
}

/**
 * LLM followUp 의 generic 질문("더 알려줘" 류)을 결정적으로 필터링하고,
 * 부족분만 theme 기반 폴백으로 보충 — 두 상담사 동일 패턴의 단일 출처.
 */
export function mergeCounselorFollowUps(args: {
  aiFollowUps: string[]
  userText: string
  assistantContent: string
  lang: 'ko' | 'en'
  count?: number
}): string[] {
  const count = args.count ?? 2
  const goodAiFollowUps = args.aiFollowUps.filter((q) => !isGenericFollowUp(q, args.lang))
  const needed = count - goodAiFollowUps.length
  return needed > 0
    ? [
        ...goodAiFollowUps,
        ...generateFollowUpQuestions(args.userText, args.lang, count, args.assistantContent).filter(
          (q) => !goodAiFollowUps.includes(q)
        ),
      ].slice(0, count)
    : goodAiFollowUps.slice(0, count)
}

export interface CounselorStreamRequestOptions {
  /** 시도마다 새 signal 로 호출되는 실제 fetch. */
  doFetch: (signal: AbortSignal) => Promise<Response>
  /** 응답 헤더 도착까지 허용 시간 — 넘으면 abort 후 재시도/실패. */
  headerTimeoutMs: number
  /** 추가 재시도 허용 횟수 (최초 시도 제외). */
  maxRetryAttempts: number
  /** backoff 기본 지연 — n번째 재시도 전 base*n 만큼 대기. */
  retryBaseDelayMs: number
  /** 시도마다 만들어지는 AbortController 등록 (언마운트 abort 용). */
  registerController?: (c: AbortController) => void
  onAttemptStart?: (attempt: number) => void
  /** 응답 도착 직후 (ok 여부 무관) — destiny 의 connectionStatus 갱신. */
  onResponse?: (res: Response, elapsedMs: number) => void
  /** ok 응답 추가 검증/상태 정리 (destiny: body 존재 확인) — throw 가능. */
  afterOk?: (res: Response) => void
  /**
   * !ok 응답 처리. canRetry(5xx + 재시도 여유) 면 'retry' 를 반환해 backoff
   * 재시도할 수 있고, 그 외에는 반드시 throw 해야 한다 (401/402 매핑 등).
   */
  onNotOk: (
    res: Response,
    attempt: number,
    canRetry: boolean
  ) => 'retry' | never | Promise<'retry' | never>
  /** abort/timeout 류 발생 시 매번 (재시도 여부와 무관) — destiny 'slow'. */
  onTimeoutLike?: () => void
  onRetryScheduled?: (nextAttempt: number, reason: 'status' | 'timeout') => void
  /** 타임아웃 재시도 소진 시 던질 에러 변환 (기본: 원본 rethrow). */
  mapExhaustedTimeout?: (err: unknown) => unknown
}

/**
 * 상담 스트림 요청 공용 골격 — 헤더 타임아웃 / 5xx·타임아웃 backoff 재시도.
 * 같은 idempotency 키를 재전송하므로 서버 idemStore.claim 의 원자적 선점으로
 * credit 중복 차감은 없다. 에러 매핑/로깅 등 화면별 차이는 콜백으로 주입.
 */
export async function requestCounselorStream(
  opts: CounselorStreamRequestOptions
): Promise<{ res: Response; controller: AbortController }> {
  let attempt = 0
  while (true) {
    const controller = new AbortController()
    opts.registerController?.(controller)
    opts.onAttemptStart?.(attempt)
    const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now()
    const headerTimer = setTimeout(() => controller.abort(), opts.headerTimeoutMs)
    try {
      const res = await opts.doFetch(controller.signal)
      clearTimeout(headerTimer)
      const elapsed =
        (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt
      opts.onResponse?.(res, elapsed)
      if (res.ok) {
        opts.afterOk?.(res)
        return { res, controller }
      }
      // 401/402/4xx 같은 *유저 액션* 에러는 재시도해도 의미 없음 — onNotOk
      // 가 그대로 throw. 5xx 만 backoff 재시도.
      const canRetry = res.status >= 500 && attempt < opts.maxRetryAttempts
      const decision = await opts.onNotOk(res, attempt, canRetry)
      if (decision === 'retry' && canRetry) {
        attempt += 1
        opts.onRetryScheduled?.(attempt, 'status')
        await new Promise((r) => setTimeout(r, opts.retryBaseDelayMs * attempt))
        continue
      }
      // onNotOk 는 'retry' 가 아니면 throw 해야 한다 — 방어적 가드.
      throw new Error(`Failed (${res.status})`)
    } catch (err) {
      clearTimeout(headerTimer)
      const name = (err as Error & { name?: string })?.name
      // 헤더 타임아웃(AbortError) / 네트워크 끊김은 자동 재시도.
      if (name === 'AbortError' || name === 'TimeoutError') {
        opts.onTimeoutLike?.()
        if (attempt < opts.maxRetryAttempts) {
          attempt += 1
          opts.onRetryScheduled?.(attempt, 'timeout')
          await new Promise((r) => setTimeout(r, opts.retryBaseDelayMs * attempt))
          continue
        }
        throw opts.mapExhaustedTimeout ? opts.mapExhaustedTimeout(err) : err
      }
      throw err
    }
  }
}

export function useCounselorChat<TMsg extends CounselorChatMessageBase>(
  config: UseCounselorChatConfig<TMsg>
): UseCounselorChatReturn<TMsg> {
  const [messages, setMessages] = config.messagesState

  const [input, setInput] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [followUpQuestions, setFollowUpQuestions] = React.useState<string[]>([])

  // ---- 최신값 ref 동기화 -------------------------------------------------
  // sendMessage/retryLastAnswer 를 stable 하게 유지하면서도 콜백은 "마지막
  // 커밋 시점" 값을 읽는다 — 기존 두 구현의 useCallback closure 와 동일한
  // 시점 의미론(특히 retry 직후의 의도된 staleness)을 그대로 보존한다.
  const configRef = React.useRef(config)
  const messagesRef = React.useRef(messages)
  const loadingRef = React.useRef(loading)
  const inputRef = React.useRef(input)
  React.useEffect(() => {
    configRef.current = config
    messagesRef.current = messages
    loadingRef.current = loading
    inputRef.current = input
  })

  // 직전 user turn 의 idempotencyKey 보관 — "다시 시도" 시 같은 키 재사용으로
  // 서버가 idempotent replay 분기를 타게 해 credit 추가 차감 방지.
  const lastTurnIdemKeyRef = React.useRef<string | null>(null)
  // 끊긴 턴 복원 대상 — 서버는 연결이 끊겨도 끝까지 생성해 turnId 로 캐시에
  // 저장한다(claudeSSE keepGeneratingOnDisconnect). 이 정보로 result 를 폴링.
  const recoverableTurnRef = React.useRef<{
    turnId: string
    userText: string
    assistantMsgId: string
  } | null>(null)
  const recoveringRef = React.useRef(false)
  // 마운트 1회 복원 가드 — 새 전송이 시작되면 무효화.
  const mountRecoverDoneRef = React.useRef(false)
  // 로그인/구매 왕복 후 복원 시 떼어둔 '미답변 user 질문' — 인증 확인되는 대로
  // 1회 자동 재전송. nonce 는 등록 직후 효과를 재평가시키는 트리거.
  const pendingResumeTextRef = React.useRef<string | null>(null)
  const resumeSentRef = React.useRef(false)
  const [resumeNonce, setResumeNonce] = React.useState(0)
  const mountedRef = React.useRef(true)
  // 진행 중 요청/스트림의 AbortController — 언마운트 시 abort.
  const inFlightAbortRef = React.useRef<AbortController | null>(null)
  const inFlightTurnRef = React.useRef<{ userText: string; controller: AbortController } | null>(
    null
  )
  const outerSendRef = React.useRef<
    ((text?: string, options?: CounselorSendOptions<TMsg>) => void | Promise<void>) | null
  >(null)

  React.useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      const inflight = inFlightTurnRef.current
      if (inflight) {
        try {
          inflight.controller.abort()
        } catch {
          // already aborted — ignore
        }
      }
      if (inFlightAbortRef.current) {
        try {
          inFlightAbortRef.current.abort()
        } catch {
          // already aborted — ignore
        }
        inFlightAbortRef.current = null
      }
      // destiny: 스트리밍 도중 이탈 시 버퍼에 남은 부분 응답을 저장 경로로 넘김.
      configRef.current.onUnmountCleanup?.({ inFlightUserText: inflight?.userText ?? null })
      inFlightTurnRef.current = null
    }
  }, [])

  // ---- 끊긴 턴 복원 (result 캐시 폴링) ------------------------------------
  const attemptRecover = React.useCallback(async () => {
    const info = recoverableTurnRef.current
    if (!info || recoveringRef.current) return
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
    recoveringRef.current = true
    try {
      // 서버가 아직 생성 중이면 ready=false → 2초 간격 재시도 (보이는 동안만).
      for (let i = 0; i < 30; i++) {
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') break
        if (recoverableTurnRef.current?.turnId !== info.turnId) break // 새 턴이 덮어씀
        try {
          const res = await fetch(configRef.current.resultEndpoint(info.turnId), {
            credentials: 'include',
          })
          if (res.ok) {
            const data = (await res.json()) as { ready?: boolean; content?: string }
            if (data.ready && typeof data.content === 'string' && data.content.length > 0) {
              // 복원 답안에도 정상 스트림과 동일한 후처리 — ||FOLLOWUP|| 마커를
              // 떼어내고(안 그러면 본문에 그대로 노출됨) 후속질문 칩으로 변환.
              const { cleanContent, followUps } = streamProcessor.extractFollowUpQuestions(
                data.content
              )
              const applied = configRef.current.applyRecovered(
                {
                  turnId: info.turnId,
                  userText: info.userText,
                  assistantMsgId: info.assistantMsgId,
                  cleanContent,
                  followUps,
                },
                { setFollowUpQuestions }
              )
              if (applied === false) return // 언마운트 등 — 단서 정리 없이 중단
              recoverableTurnRef.current = null
              clearPendingTurn(configRef.current.namespace)
              return
            }
          }
        } catch {
          /* 네트워크 흔들림 — 다음 루프에서 재시도 */
        }
        await new Promise((r) => setTimeout(r, 2000))
      }
    } finally {
      recoveringRef.current = false
    }
  }, [setFollowUpQuestions])

  useRecoverOnResume(attemptRecover)

  // 새로고침/페이지 이탈 후 복원 — remount 로 recoverableTurnRef(메모리)는
  // 사라져도, localStorage 의 turnId 가 아직 살아 있고(서버 캐시 TTL 내)
  // 복원된 대화의 마지막이 미완성 assistant 면 result 캐시를 폴링해 완성본으로
  // 갈아끼운다. 마운트당 1회, 새 전송이 시작되면 sendMessage 가 무효화.
  React.useEffect(() => {
    if (mountRecoverDoneRef.current) return
    if (loading) return
    const ns = configRef.current.namespace
    const pending = readPendingTurn(ns)
    if (!pending) {
      mountRecoverDoneRef.current = true
      return
    }
    if (Date.now() - pending.ts > PENDING_TURN_TTL_MS) {
      clearPendingTurn(ns)
      mountRecoverDoneRef.current = true
      return
    }
    // 대화가 아직 복원되는 중일 수 있다(드래프트/서버 resume 은 비동기) —
    // 메시지가 채워질 때까지 기다렸다가 마지막이 미완성일 때만 복원한다.
    const last = messages[messages.length - 1]
    if (!last) return
    if (!configRef.current.isRecoverableLastMessage(last)) {
      // 복원된 대화가 미완성으로 끝나지 않음 → 살릴 게 없음.
      clearPendingTurn(ns)
      mountRecoverDoneRef.current = true
      return
    }
    mountRecoverDoneRef.current = true
    recoverableTurnRef.current = {
      turnId: pending.turnId,
      userText: pending.userText,
      // id 가 없으면 applyRecovered 의 폴백(끝의 미완성 assistant 탐색)이 처리.
      assistantMsgId: last.id ?? '',
    }
    void attemptRecover()
  }, [messages, loading, attemptRecover])

  // ---- 전송 파이프라인 -----------------------------------------------------
  const sendMessage = React.useCallback(
    async (textOverride?: string, options?: CounselorSendOptions<TMsg>) => {
      const cfg = configRef.current
      const trimmed = (textOverride ?? inputRef.current).trim()
      const text = cfg.prepareText ? cfg.prepareText(trimmed) : trimmed
      if (!text || loadingRef.current) {
        return
      }
      // 가드(로그인 게이트 등)에 막히면 마운트 복원 경로를 건드리지 않고 중단.
      if (cfg.beforeSend?.(text, options) === false) {
        return
      }

      // 새 전송 시작 → 마운트 복원 경로 무효화. 직전 미완성 턴의 영속 turnId 는
      // 아래 writePendingTurn 이 이 턴의 키로 즉시 덮어쓴다.
      mountRecoverDoneRef.current = true

      setFollowUpQuestions([])
      const userMessage = cfg.makeUserMessage(text)
      // "다시 시도"는 pop 직후라 state 가 아직 옛 값일 수 있음 — 호출자가 정리한
      // historyOverride 가 있으면 그걸 정본으로 쓴다(궁합 경로).
      const baseHistory = options?.historyOverride ?? messagesRef.current
      const historyWithUser = [...baseHistory, userMessage]
      cfg.applyUserMessage({ setMessages, userMessage, baseHistory })
      if (!textOverride) setInput('')
      setLoading(true)
      cfg.onSendStart?.(text)

      // 새로고침/탭 복제 등 같은 turn 재진입 시 서버가 중복 차감 안 하도록
      // 매 user 메시지마다 UUID 생성. "다시 시도"는 직전 turn 키 재사용 —
      // 서버가 idempotent replay 로 인식해 credit 추가 차감 없이 Claude 만
      // 다시 호출한다(부분 응답 후 끊긴 케이스도 첫 호출에서 이미 차감됨).
      const reusedKey = options?.isRetry ? lastTurnIdemKeyRef.current : null
      const idempotencyKey =
        reusedKey ||
        (typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `t${Date.now()}-${Math.random().toString(36).slice(2)}`)
      lastTurnIdemKeyRef.current = idempotencyKey
      const turn: CounselorTurn = {
        text,
        idempotencyKey,
        turnId: idempotencyKey,
        isRetry: !!options?.isRetry,
      }

      // 전송 시점에 곧바로 pendingTurn 영속화 — 어떤 식으로 끊겨도(백그라운드
      // abort/stall 포함) result 캐시 복원 단서가 남는다. 정상 완료 시
      // finishTurnClean 으로 지움. retry 도 같은 turnId 라 덮어써 무방.
      writePendingTurn(cfg.namespace, { turnId: idempotencyKey, userText: text, ts: Date.now() })

      const helpers: CounselorTurnHelpers = {
        markRecoverable: (assistantMsgId?: string) => {
          recoverableTurnRef.current = {
            turnId: turn.turnId,
            userText: turn.text,
            assistantMsgId: assistantMsgId ?? '',
          }
          writePendingTurn(cfg.namespace, {
            turnId: turn.turnId,
            userText: turn.text,
            ts: Date.now(),
          })
        },
        kickRecover: () => {
          void attemptRecover()
        },
        finishTurnClean: () => {
          recoverableTurnRef.current = null
          clearPendingTurn(cfg.namespace)
        },
        setFollowUpQuestions,
      }

      try {
        const { res, controller } = await cfg.performRequest({
          turn,
          history: historyWithUser,
          registerController: (c) => {
            inFlightAbortRef.current = c
          },
        })

        cfg.onResponse?.(res)
        if (cfg.haltOnUnmount && !mountedRef.current) return

        const assistantMessage = cfg.makeAssistantMessage()
        const assistantMsgId = assistantMessage.id
        setMessages((prev) => [...prev, assistantMessage])

        inFlightTurnRef.current = { userText: text, controller }
        try {
          // chunk idle 타이머 — 일정 시간 한 byte 도 안 오면 응답이 멈춘 것으로
          // 보고 abort. controller.abort() 가 reader.read() 도 종료시켜
          // streamProcessor 가 truncated 로 마무리 → "다시 시도" 노출 경로.
          let idleTimer: ReturnType<typeof setTimeout> | null = null
          const armIdleTimer = () => {
            if (idleTimer) clearTimeout(idleTimer)
            idleTimer = setTimeout(() => controller.abort(), cfg.chunkIdleTimeoutMs)
          }
          armIdleTimer()

          let finalContent = ''
          const result = await streamProcessor.process(res, {
            // 서버 heartbeat(`: hb`) 포함 어떤 바이트든 들어오면 재무장 —
            // destiny 만 사용(긴 thinking pause 오탐 방지). compat 은 기존
            // 동작(콘텐츠 chunk 에만 재무장)을 유지한다.
            onActivity: cfg.rearmIdleOnActivity ? () => armIdleTimer() : undefined,
            onChunk: (_accumulated, cleaned) => {
              armIdleTimer()
              finalContent = cleaned
              cfg.renderChunk(cleaned)
            },
            onError: (err) => cfg.onStreamError?.(err),
          })
          if (idleTimer) clearTimeout(idleTimer)
          if (cfg.haltOnUnmount && !mountedRef.current) return

          await cfg.completeTurn(
            { result, finalContent, response: res, turn, assistantMsgId },
            helpers
          )
        } finally {
          inFlightTurnRef.current = null
        }
      } catch (e) {
        cfg.onSendFailure(e)
      } finally {
        // 이 호출의 controller 가 아직 in-flight 슬롯에 남아 있으면 정리
        // (나중 호출이 이미 교체했을 수 있음).
        if (inFlightAbortRef.current && inFlightAbortRef.current.signal.aborted) {
          inFlightAbortRef.current = null
        }
        if (!cfg.haltOnUnmount || mountedRef.current) setLoading(false)
      }
    },
    [setMessages, setFollowUpQuestions, attemptRecover]
  )

  // ---- "다시 시도" ---------------------------------------------------------
  // 잘린 assistant 답변과 직전 user 메시지를 함께 pop 한 뒤 isRetry: true 로
  // 재요청 — 직전 turn 의 idempotencyKey 를 재사용해 서버 idempotent replay
  // 분기로 credit 중복 차감을 막는다.
  const retryLastAnswer = React.useCallback(() => {
    const cfg = configRef.current
    if (loadingRef.current) return
    const msgs = messagesRef.current
    const len = msgs.length
    if (len < 2) return
    if (msgs[len - 1].role !== 'assistant') return
    if (msgs[len - 2].role !== 'user') return
    const lastUserText = msgs[len - 2].content
    // setMessages 는 비동기라 sendMessage 가 읽는 히스토리는 아직 옛 값 —
    // compat 은 정리된 히스토리를 historyOverride 로 명시해 정본으로 쓴다.
    const trimmedHistory = msgs.slice(0, -2)
    setMessages((prev) => prev.slice(0, -2))
    setFollowUpQuestions([])
    const send = outerSendRef.current ?? sendMessage
    void send(
      lastUserText,
      cfg.retryUsesHistoryOverride
        ? { isRetry: true, historyOverride: trimmedHistory }
        : { isRetry: true }
    )
  }, [setMessages, setFollowUpQuestions, sendMessage])

  // ---- 로그인 후 "직전 질문 이어서 답변" ------------------------------------
  const queueResumeText = React.useCallback((text: string) => {
    pendingResumeTextRef.current = text
    // ref 만 쓰면 등록 후 effect 가 재평가되지 않는 경우(인증이 이미 확정된
    // 마운트 등)가 있어 nonce 로 명시 트리거.
    setResumeNonce((n) => n + 1)
  }, [])

  const { status: authStatus } = useSession()
  React.useEffect(() => {
    if (resumeSentRef.current) return
    const text = pendingResumeTextRef.current
    if (!text) return
    // 게스트(미인증)면 보류 — 전송해도 다시 한도에 막히므로.
    if (authStatus !== 'authenticated') return
    if (loading) return
    resumeSentRef.current = true
    pendingResumeTextRef.current = null
    const id = window.setTimeout(() => {
      const send = outerSendRef.current ?? sendMessage
      void send(text)
    }, 0)
    return () => window.clearTimeout(id)
  }, [authStatus, loading, resumeNonce, sendMessage])

  // ---- 게스트 진행 드래프트 보존 -------------------------------------------
  // 한도→로그인/구매 왕복 후 복원용. 서버 세션이 생기면 서버가 정본이므로
  // 드래프트 제거. 스트리밍 중엔 저장하지 않고 턴이 끝난 최종 상태만 기록.
  const draft = config.draft
  React.useEffect(() => {
    const cfg = configRef.current
    const d = cfg.draft
    if (!d) return
    if (d.suspended) return
    if (loading) return
    if (d.hasServerSession) {
      clearPendingChat(cfg.namespace)
      return
    }
    const payload = d.build(messages)
    if (payload != null) {
      savePendingChat(cfg.namespace, payload)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- build/suspended 는 ref 로 최신을 읽고, 화면별 추가 저장 트리거는 draft.deps 로 주입한다.
  }, [loading, messages, draft?.suspended, draft?.hasServerSession, ...(draft?.deps ?? [])])

  return {
    messages,
    setMessages,
    input,
    setInput,
    loading,
    followUpQuestions,
    setFollowUpQuestions,
    sendMessage,
    retryLastAnswer,
    attemptRecover,
    queueResumeText,
    outerSendRef,
  }
}
