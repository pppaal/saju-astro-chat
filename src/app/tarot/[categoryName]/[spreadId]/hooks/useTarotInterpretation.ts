'use client'

/**
 * useTarotInterpretation Hook
 * 타로 해석 가져오기 및 저장 로직 (스트리밍 지원)
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useI18n } from '@/i18n/I18nProvider'
import type { TarotQuestionAnalysisSnapshot } from '@/lib/tarot/questionFlow'
import { Spread, DrawnCard, DeckStyle } from '@/lib/tarot/tarot.types'
import { buildTarotSaveRequest, flattenTarotGuidance } from '@/lib/tarot/tarot-save-request'
import { saveReading, formatReadingForSave } from '@/lib/tarot/tarot-storage'
import { apiFetch, type ApiFetchOptions } from '@/lib/api'
import { tarotLogger } from '@/lib/logger'
import {
  extractPartialOverall,
  extractPartialCardTexts,
  extractPartialHook,
} from '@/lib/tarot/partialJsonParse'
import type { InterpretationResult, ReadingResponse } from '../types'
import type { TarotPersonalizationOptions } from './useTarotGame'

interface UseTarotInterpretationParams {
  categoryName: string | undefined
  spreadId: string | undefined
  userTopic: string
  questionAnalysis: TarotQuestionAnalysisSnapshot | null
  selectedDeckStyle: DeckStyle
  personalizationOptions: TarotPersonalizationOptions
}

export interface FetchInterpretationOptions {
  // 스트리밍 중간 진행 상황을 받아서 UI 에 progressive 하게 반영하기 위한 콜백.
  // overall_message 가 토큰 단위로 누적될 때마다 호출된다.
  onProgress?: (snapshot: InterpretationResult) => void
  // 새로고침 시 같은 리딩이 두 번 차감되지 않도록 서버에 보낼 idempotency 키.
  // 보통 페이지 단의 readingSignature(스프레드+카드 조합 해시)를 그대로 사용.
  idempotencyKey?: string
  // 크레딧 소진(402) / 게스트 한도(401) 시 페이지가 모달·메시지를 띄울 수
  // 있게 호출. hook 내부에선 fallback 로컬 카피로 그래도 답을 보여주지만,
  // 사용자가 *왜* 진짜 LLM 응답이 안 왔는지 알게 하려면 페이지 단의
  // showDepleted() 같은 전역 모달 트리거가 필요.
  onCreditError?: (kind: 'insufficient_credits' | 'login_required') => void
  // 재시도 시 이전 interpret-stream 요청을 끊기 위한 외부 abort 신호. 없으면
  // 내부 타임아웃 컨트롤러만 사용. 페이지가 재시도 직전 prior 요청을 abort 해
  // 두 스트림이 동시에 도는 레이스를 막는다.
  signal?: AbortSignal
}

interface UseTarotInterpretationReturn {
  isSaved: boolean
  saveMessage: string
  /** 서버 저장 후 부여된 ID — followup / 클래리파이어 PATCH 에 사용. */
  readingId: string | null
  fetchInterpretation: (
    result: ReadingResponse,
    options?: FetchInterpretationOptions
  ) => Promise<InterpretationResult | null>
  /**
   * 끊긴 해석 복원 — 직전 fetchInterpretation 이 완성 JSON 없이 끝났을 때,
   * 서버가 끝까지 생성해 turnId 로 캐시에 저장한 완성 리딩을 result
   * 엔드포인트로 폴링해 가져온다. 페이지가 visibilitychange 시 호출하면 된다.
   * 복원할 게 없거나(이미 성공/turnId 없음) 아직 준비 안 됐으면 null.
   * 로그인 사용자만 가능(게스트는 서버가 캐시 안 함 → 401 → null).
   */
  recoverLastInterpretation: () => Promise<InterpretationResult | null>
  handleSaveReading: (
    readingResult: ReadingResponse | null,
    spreadInfo: Spread | null,
    interpretation: InterpretationResult | null
  ) => Promise<void>
}

// Bumped 35→70s in lockstep with the server's 60s Claude timeout (after
// Haiku→Sonnet 4.5 promotion). Sonnet generating the full tarot JSON for
// 3–5 cards regularly exceeded 35s under normal load.
const STREAM_INTERPRET_TIMEOUT_MS = 70000

// 클라 생성 turnId — 끊겨도 서버가 끝까지 생성해 이 키로 캐시에 저장하고,
// 돌아온 사용자가 result 엔드포인트로 복원한다 (counselor / 인라인 타로와 동일).
function genTurnId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `t-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

// 스트리밍 도중 새로고침해도 "같은 해석"이 다시 뜨도록, 진행 중 turnId 를
// readingSignature 기준으로 sessionStorage 에 보관한다. 새 페이지(새로고침)에서
// fetchInterpretation 이 이 turnId 로 서버 캐시(완성본)를 먼저 폴링해, 있으면
// 재생성(=다른 글) 없이 동일 해석을 복원한다. 완료/만료 시 정리.
const RECOVER_TURN_PREFIX = 'tarot:recoverTurn:'
const RECOVER_TURN_WINDOW_MS = 10 * 60 * 1000

function storeRecoverTurn(sig: string | undefined, turnId: string): void {
  if (typeof window === 'undefined' || !sig) return
  try {
    window.sessionStorage.setItem(
      `${RECOVER_TURN_PREFIX}${sig}`,
      JSON.stringify({ turnId, ts: Date.now() })
    )
  } catch {
    /* quota 등 무시 */
  }
}

function readRecoverTurn(sig: string | undefined): string | null {
  if (typeof window === 'undefined' || !sig) return null
  try {
    const raw = window.sessionStorage.getItem(`${RECOVER_TURN_PREFIX}${sig}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { turnId?: string; ts?: number }
    if (!parsed.turnId || !parsed.ts) return null
    // 오래된 turnId 는 무시(같은 카드 재드로우 등으로 인한 stale 복원 방지).
    if (Date.now() - parsed.ts > RECOVER_TURN_WINDOW_MS) {
      clearRecoverTurn(sig)
      return null
    }
    return parsed.turnId
  } catch {
    return null
  }
}

function clearRecoverTurn(sig: string | undefined): void {
  if (typeof window === 'undefined' || !sig) return
  try {
    window.sessionStorage.removeItem(`${RECOVER_TURN_PREFIX}${sig}`)
  } catch {
    /* 무시 */
  }
}

// result 엔드포인트를 짧게 폴링해 서버가 캐시한 완성 리딩을 복원한다(과금 없음 —
// GET). ready 면 같은 parseStreamedInterpretation 경로로 변환해 반환, 아직이거나
// 게스트(401)면 null → 호출자는 정상 스트림으로 폴백한다.
async function pollTurnResult(
  turnId: string,
  result: ReadingResponse,
  isKorean: boolean,
  maxAttempts: number
): Promise<InterpretationResult | null> {
  for (let i = 0; i < maxAttempts; i++) {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return null
    try {
      const res = await apiFetch(
        `/api/tarot/interpret-stream/result?turnId=${encodeURIComponent(turnId)}`,
        { method: 'GET' }
      )
      if (res.ok) {
        const data = (await res.json()) as { ready?: boolean; content?: string }
        if (data.ready && typeof data.content === 'string' && data.content.length > 0) {
          const recovered = parseStreamedInterpretation(
            data.content,
            result.drawnCards,
            result.spread.positions,
            isKorean
          )
          if (recovered.overall_message.trim().length > 0) return recovered
        }
      } else if (res.status === 401) {
        return null // 게스트는 서버가 캐시 안 함 → 복구 불가.
      }
    } catch {
      /* 네트워크 흔들림 — 다음 시도 */
    }
    await new Promise((r) => setTimeout(r, 1500))
  }
  return null
}

class RequestTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`)
    this.name = 'RequestTimeoutError'
  }
}

async function apiFetchWithTimeout(
  url: string,
  init: ApiFetchOptions,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController()
  let timedOut = false
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  const externalSignal = init.signal

  const onExternalAbort = () => {
    if (!controller.signal.aborted) {
      controller.abort()
    }
  }

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort()
    } else {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true })
    }
  }

  timeoutId = setTimeout(() => {
    timedOut = true
    if (!controller.signal.aborted) {
      controller.abort()
    }
  }, timeoutMs)

  try {
    return await apiFetch(url, {
      ...init,
      signal: controller.signal,
    })
  } catch (error) {
    if (timedOut) {
      throw new RequestTimeoutError(timeoutMs)
    }
    throw error
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort)
    }
  }
}

/**
 * SSE 스트림에서 JSON 텍스트를 누적 수집하여 파싱
 */
async function consumeSSEStream(
  response: Response,
  onChunk?: (accumulated: string) => void
): Promise<string> {
  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let accumulated = ''
  let lineBuffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    lineBuffer += decoder.decode(value, { stream: true })
    const lines = lineBuffer.split('\n')
    lineBuffer = lines.pop() || ''

    let changed = false
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') continue
        try {
          const parsed = JSON.parse(data)
          if (parsed.content) {
            accumulated += parsed.content
            changed = true
          }
        } catch {
          // 불완전한 청크 무시
        }
      }
    }
    if (changed && onChunk) onChunk(accumulated)
  }

  lineBuffer += decoder.decode()
  if (lineBuffer.startsWith('data: ')) {
    const data = lineBuffer.slice(6)
    if (data && data !== '[DONE]') {
      try {
        const parsed = JSON.parse(data)
        if (parsed.content) {
          accumulated += parsed.content
          onChunk?.(accumulated)
        }
      } catch {
        // 무시 가능한 마지막 청크
      }
    }
  }

  return accumulated
}

/**
 * 스트리밍 JSON 응답을 InterpretationResult로 변환
 */
function parseStreamedInterpretation(
  jsonText: string,
  cards: DrawnCard[],
  _positions: ReadingResponse['spread']['positions'],
  isKorean: boolean
): InterpretationResult {
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON found')

  // 현재 스키마는 { overall, cards: [{ position, interpretation }], advice } 만 emit.
  // 자리(position) 는 LLM 이 질문 맥락에 맞춰 직접 명명 — spread.positions 무시.
  // Haiku 가 가끔 invalid JSON (trailing comma, 누락된 닫는 brace 등) 을 emit
  // 하는데 그때는 partial parser 가 만든 overall/cards 값을 폴백으로 쓰자.
  // outer try-catch 가 한 번 더 막아주지만, 여기서도 한 번 더 가드 — 완전
  // 폴백(local fallback) 보다 partial 결과가 더 사용자에게 유용.
  type ParsedShape = {
    overall?: string
    advice?: string
    hook?: string
    cards?: Array<{ position?: string; interpretation?: string }>
    // 서버 정적 폴백 마커 — true 면 진짜 LLM 리딩이 아니라 서비스 실패 폴백.
    degraded?: boolean
  }
  let parsed: ParsedShape
  try {
    parsed = JSON.parse(jsonMatch[0]) as ParsedShape
  } catch {
    // 부분 파서가 누적한 텍스트로 최소 overall(+ 가능하면 hook)은 살린다.
    const salvagedOverall = extractPartialOverall(jsonText) || ''
    const salvagedCardTexts = extractPartialCardTexts(jsonText)
    parsed = {
      overall: salvagedOverall,
      hook: extractPartialHook(jsonText) || undefined,
      cards: salvagedCardTexts.map((t) => ({ interpretation: t })),
    }
  }
  const parsedCards = Array.isArray(parsed.cards) ? parsed.cards : []

  // 서버 정적 폴백(degraded:true)이면 진짜 리딩이 아니다 — fallback:true +
  // emergency_fallback 으로 표시해 페이지가 실패로 처리(재시도 노출 + 캐시
  // skip)하게 한다. 직전엔 fallback:false 로 하드코딩돼 에러 폴백이 진짜
  // 리딩처럼 렌더되고 캐시까지 됐다(새로고침해도 에러문구가 "내 리딩"으로).
  const isDegradedFallback = parsed.degraded === true

  return {
    overall_message: parsed.overall || '',
    hook: (parsed.hook || '').trim() || undefined,
    card_insights: cards.map((dc, i) => {
      const cardData = parsedCards[i]
      const fallbackMeaning = dc.isReversed
        ? isKorean
          ? dc.card.reversed.meaningKo || dc.card.reversed.meaning
          : dc.card.reversed.meaning
        : isKorean
          ? dc.card.upright.meaningKo || dc.card.upright.meaning
          : dc.card.upright.meaning
      return {
        position:
          (cardData?.position || '').trim() || (isKorean ? `${i + 1}번 카드` : `Card ${i + 1}`),
        card_name: dc.card.name,
        is_reversed: dc.isReversed,
        interpretation: (cardData?.interpretation || '').trim() || fallbackMeaning || '',
      }
    }),
    guidance:
      parsed.advice || (isKorean ? '카드의 메시지에 귀 기울여보세요.' : 'Listen to the cards.'),
    affirmation: isKorean ? '오늘 하루도 나답게 가면 돼요.' : 'Just be yourself today.',
    fallback: isDegradedFallback,
    interpretation_source: isDegradedFallback ? 'emergency_fallback' : 'stream_sse_fallback',
  }
}

function detectFocusKeyword(question: string, isKorean: boolean): string {
  const q = question.toLowerCase()

  if (isKorean) {
    if (/(흐름|전반|전체|방향|큰 ?그림)/.test(q)) return '\uD604\uC7AC \uD750\uB984'
    if (/(연애|사랑|결혼|썸|관계)/.test(q)) return '관계'
    if (/(이직|취업|승진|커리어|직장|면접)/.test(q)) return '커리어'
    if (/(돈|재정|투자|매출|수입|지출)/.test(q)) return '재정'
    if (/(건강|몸|컨디션|휴식|스트레스)/.test(q)) return '건강'
    return '핵심 이슈'
  }

  if (/(overall|general).*(flow|direction)|big picture|current flow/.test(q)) return 'overall flow'
  if (/(love|relationship|marriage|dating)/.test(q)) return 'relationships'
  if (/(career|job|promotion|interview|work)/.test(q)) return 'career'
  if (/(money|finance|income|budget|invest)/.test(q)) return 'finance'
  if (/(health|wellness|stress|rest|energy)/.test(q)) return 'health'
  return 'current flow'
}

function buildPersonalizedFallback(
  result: ReadingResponse,
  userTopic: string,
  isKorean: boolean,
  personalizationOptions: TarotPersonalizationOptions
): InterpretationResult {
  const fallbackCardNames = result.drawnCards
    .map((dc) => (isKorean ? dc.card.nameKo || dc.card.name : dc.card.name))
    .slice(0, 3)
    .join(', ')
  const focus = detectFocusKeyword(userTopic, isKorean)
  const perspectiveHints = [
    personalizationOptions.includeSaju ? (isKorean ? '사주 관점 포함' : 'Saju lens included') : '',
    personalizationOptions.includeAstrology
      ? isKorean
        ? '점성술 관점 포함'
        : 'Astrology lens included'
      : '',
  ].filter(Boolean)

  return {
    overall_message: isKorean
      ? `질문 주제(${focus}) 기준으로 ${fallbackCardNames} 카드가 공통적으로 말하는 방향은 '속도보다 기준 정렬'입니다. 지금은 결론을 서두르기보다 핵심 조건 1개를 정해 실행 가능한 단위로 쪼개는 것이 유리합니다.`
      : `For your ${focus} question, the shared direction from ${fallbackCardNames} is to prioritize clear criteria over speed. Instead of forcing a fast answer, define one key condition and break it into executable steps.`,
    card_insights: result.drawnCards.map((dc, idx) => {
      const positionTitle = isKorean ? `${idx + 1}번 카드` : `Card ${idx + 1}`
      const cardName = isKorean ? dc.card.nameKo || dc.card.name : dc.card.name

      return {
        position: positionTitle,
        card_name: dc.card.name,
        is_reversed: dc.isReversed,
        interpretation: isKorean
          ? dc.isReversed
            ? `${positionTitle}의 ${cardName}(역방향)은 '${focus}'에서 누락된 조건을 먼저 점검하라는 신호입니다. 지금 당장 결정하기보다 체크리스트 3개를 만든 뒤 재판단하세요.`
            : `${positionTitle}의 ${cardName}는 '${focus}'에서 우선순위를 분명히 하라는 신호입니다. 오늘 바로 실행할 1단계 행동을 확정하면 흐름이 좋아집니다.`
          : dc.isReversed
            ? `${cardName} reversed at ${positionTitle} suggests reviewing missing conditions in your ${focus} before committing. Build a 3-item checklist, then decide.`
            : `${cardName} at ${positionTitle} highlights priority clarity for your ${focus}. Lock one immediate next step today to improve momentum.`,
      }
    }),
    guidance: isKorean
      ? [
          {
            title: '오늘 20분 액션',
            detail: `'${focus}' 관련 핵심 조건 1개를 정하고, 20분 내 실행 가능한 행동 1개로 전환하세요.`,
          },
          {
            title: '리스크 차단',
            detail: '결정 전에 실패 시나리오 1개와 대응책 1개를 미리 적어두세요.',
          },
          {
            title: '재확인 포인트',
            detail:
              perspectiveHints.length > 0
                ? `${perspectiveHints.join(', ')} 기준으로 48시간 내 한 번 더 리딩을 비교해보세요.`
                : '48시간 내 같은 질문으로 다시 리딩해 변화 흐름을 비교해보세요.',
          },
        ]
      : [
          {
            title: '20-minute action',
            detail: `Choose one key condition for your ${focus} and convert it into one task you can execute within 20 minutes.`,
          },
          {
            title: 'Risk guardrail',
            detail:
              'Write one failure scenario and one response plan before finalizing your decision.',
          },
          {
            title: 'Re-check point',
            detail:
              perspectiveHints.length > 0
                ? `Re-run and compare within 48 hours with ${perspectiveHints.join(', ')}.`
                : 'Re-run the same question within 48 hours and compare pattern changes.',
          },
        ],
    affirmation: isKorean
      ? '깊은 해석은 작은 실행에서 시작됩니다.'
      : 'Deep clarity starts from one concrete step.',
    fallback: true,
    interpretation_source: 'local_personalized_fallback',
  }
}

export function useTarotInterpretation({
  categoryName,
  spreadId,
  userTopic,
  questionAnalysis,
  selectedDeckStyle,
  personalizationOptions,
}: UseTarotInterpretationParams): UseTarotInterpretationReturn {
  const { data: session } = useSession()
  const { language } = useI18n()
  const [isSaved, setIsSaved] = useState(false)
  // 서버 저장 후 부여된 readingId — 클래리파이어 / followup 채팅을
  // PATCH 로 같은 row 에 추가 저장할 때 사용.
  const [readingId, setReadingId] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string>('')

  // Mount lifecycle ref so post-await setStates in handleSaveReading
  // bail out cleanly after the user navigates away mid-save.
  const mountedRef = useRef(true)
  // The saveMessage banner auto-clears after 3s. Tracking the timer in a
  // ref means (a) we can clear it on unmount so React doesn't fire a
  // setSaveMessage('') on a torn-down tree, and (b) a second rapid save
  // (e.g. clarifier card draw immediately after the main save) clears
  // the previous timer instead of stacking two 3s timeouts that race.
  const saveMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 끊긴 해석 복원용 컨텍스트 — 직전 요청이 완성 JSON 없이 끝났을 때 채워진다.
  // recoverLastInterpretation 이 turnId 로 result 엔드포인트를 폴링해 완성
  // 리딩을 같은 parseStreamedInterpretation 경로로 변환한다. 성공/정상완료 시 null.
  const recoverableRef = useRef<{
    turnId: string
    result: ReadingResponse
    isKorean: boolean
  } | null>(null)
  const recoveringRef = useRef(false)

  const scheduleClearSaveMessage = useCallback(() => {
    if (saveMessageTimerRef.current) {
      clearTimeout(saveMessageTimerRef.current)
    }
    saveMessageTimerRef.current = setTimeout(() => {
      saveMessageTimerRef.current = null
      if (!mountedRef.current) return
      setSaveMessage('')
    }, 3000)
  }, [])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (saveMessageTimerRef.current) {
        clearTimeout(saveMessageTimerRef.current)
        saveMessageTimerRef.current = null
      }
    }
  }, [])

  const fetchInterpretation = useCallback(
    async (
      result: ReadingResponse,
      options?: FetchInterpretationOptions
    ): Promise<InterpretationResult | null> => {
      const isKorean = (language || 'ko') === 'ko'

      const cardPayload = result.drawnCards.map((dc) => {
        const meaning = dc.isReversed ? dc.card.reversed : dc.card.upright
        // position / positionKo / positionMeaning 은 더 이상 클라이언트에서
        // 보내지 않는다 — LLM 이 사용자 질문 맥락에 맞춰 직접 명명한다.
        return {
          name: dc.card.name,
          nameKo: dc.card.nameKo,
          isReversed: dc.isReversed,
          // Payload slimming for high-card spreads to reduce timeout pressure.
          keywords: (meaning.keywords || []).slice(0, 8),
          keywordsKo: (meaning.keywordsKo || []).slice(0, 8),
        }
      })

      // 이 해석 요청의 고유 id — 끊겨도 서버가 끝까지 생성해 이 키로 캐시에
      // 저장하고, 돌아온 사용자가 recoverLastInterpretation 으로 복원한다.
      // readingSignature(=idempotencyKey) 기준으로 진행 중 turnId 를 보관해 둔
      // 게 있으면(스트리밍 도중 새로고침) 그 turnId 를 재사용해, 먼저 서버
      // 캐시(완성본)를 폴링한다 → 있으면 재생성(다른 글) 없이 동일 해석 복원.
      const sig = options?.idempotencyKey
      const storedTurnId = readRecoverTurn(sig)
      const turnId = storedTurnId || genTurnId()
      // 진행 중 turnId 보관(완료/만료 시 정리) — 새로고침 복원 진입점.
      storeRecoverTurn(sig, turnId)
      recoverableRef.current = { turnId, result, isKorean }

      // 새로고침 복원이면 우선 캐시된 완성 리딩을 짧게 폴링(과금 없음).
      // 준비됐으면 동일 해석을 그대로 반환하고 스트림/차감을 건너뛴다.
      if (storedTurnId) {
        const recovered = await pollTurnResult(storedTurnId, result, isKorean, 5)
        if (recovered) {
          clearRecoverTurn(sig)
          recoverableRef.current = null
          return recovered
        }
        // 아직 준비 안 됨(또는 게스트) → 같은 turnId 로 정상 스트림 폴백.
      }

      // questionMeta / questionContext 메타라벨은 system prompt 의 0단계 가 동일 정보를
      // LLM 이 직접 추출하므로 중복. 보내지 않는다 (50-100 tokens / call 절감).
      const requestBody = {
        categoryId: categoryName,
        spreadId,
        spreadTitle: result.spread.title,
        cards: cardPayload,
        userQuestion: userTopic,
        language: language || 'ko',
        // 서버 발급 단일-사용 nonce — draw 응답에서 받은 그대로 전달.
        // 차감 면제(무료 재해석) 판정을 서버 토큰에 묶기 위함.
        drawNonce: result.drawNonce,
        // 끊김 복구용 turnId — 서버가 끝까지 생성한 완성 리딩을 이 키로 캐시.
        turnId,
      }
      // (recoverableRef 는 위 turnId 확정 직후 이미 등록 — 정상 완료 시 아래에서 해제.)

      // 1) 스트리밍 엔드포인트 우선 — 깨끗한 LLM 출력 (post-processor 템플릿 없음)
      const interpretHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (options?.idempotencyKey) {
        interpretHeaders['x-idempotency-key'] = options.idempotencyKey
      }

      try {
        const response = await apiFetchWithTimeout(
          '/api/tarot/interpret-stream',
          {
            method: 'POST',
            headers: interpretHeaders,
            body: JSON.stringify(requestBody),
            signal: options?.signal,
          },
          STREAM_INTERPRET_TIMEOUT_MS
        )

        // 크레딧 소진 / 비로그인 — 페이지에 알림 트리거. 그 뒤엔 기존대로
        // local fallback 으로 떨어져 사용자가 적어도 무언가는 보게 함.
        if (response.status === 402) {
          options?.onCreditError?.('insufficient_credits')
        } else if (response.status === 401) {
          options?.onCreditError?.('login_required')
        }

        if (response.ok) {
          const contentType = response.headers.get('content-type') || ''

          if (contentType.includes('text/event-stream') && response.body) {
            // SSE 스트림 처리 — 청크마다 overall 부분만 progressive 하게 UI 에 흘려보냄.
            const baseSnapshot: InterpretationResult = {
              overall_message: '',
              card_insights: result.drawnCards.map((dc, i) => ({
                position: isKorean ? `${i + 1}번 카드` : `Card ${i + 1}`,
                card_name: dc.card.name,
                is_reversed: dc.isReversed,
                interpretation: '',
              })),
              guidance: '',
              affirmation: '',
              fallback: true,
              interpretation_source: 'stream_sse_fallback',
            }
            // 스트리밍 진행 업데이트 스로틀 — 매 SSE 청크마다 부분 JSON 파싱
            // (extractPartial*)+setInterpretation 리렌더가 돌면 메인 스레드가
            // 막혀 로딩 애니메이션(BrandSplash 등)이 렉 걸린다. ~120ms 간격으로만
            // 파싱·반영하면 타이핑 효과는 유지(초당 ~8회)하면서 부하를 크게 줄인다.
            // 최종 완성본은 아래 parseStreamedInterpretation 이 전체 텍스트로 다시
            // 만들므로 중간 스로틀로 내용이 누락되지 않는다.
            let lastProgressAt = 0
            const PROGRESS_THROTTLE_MS = 120
            const jsonText = await consumeSSEStream(response, (accumulated) => {
              if (!options?.onProgress) return
              const now = Date.now()
              if (now - lastProgressAt < PROGRESS_THROTTLE_MS) return
              lastProgressAt = now
              const partialOverall = extractPartialOverall(accumulated) || ''
              const partialCards = extractPartialCardTexts(accumulated)
              // 카드별 해석을 baseSnapshot.card_insights 위에 덮어쓴다 — 아직 안 온 카드는 빈 문자열 유지.
              const updatedInsights = baseSnapshot.card_insights.map((ci, i) => {
                const text = partialCards[i]
                if (!text) return ci
                return { ...ci, interpretation: text }
              })
              if (partialOverall.length > 0 || partialCards.length > 0) {
                options.onProgress({
                  ...baseSnapshot,
                  overall_message: partialOverall,
                  card_insights: updatedInsights,
                })
              }
            })
            const streamed = parseStreamedInterpretation(
              jsonText,
              result.drawnCards,
              result.spread.positions,
              isKorean
            )
            // 유효한 overall 이 나왔으면 정상 완료 — 복원 컨텍스트 해제.
            // (비었으면 끊김/잘림으로 보고 recoverableRef 유지 → 페이지가
            //  visibilitychange 시 recoverLastInterpretation 으로 복원.)
            if (streamed.overall_message.trim().length > 0) {
              recoverableRef.current = null
              clearRecoverTurn(sig)
            }
            return streamed
          }

          // JSON 응답 (스트림이 죽고 non-stream JSON 으로 내려온 경우)
          const data = await response.json()
          if (data.overall || data.overall_message) {
            // non-stream JSON 정상 응답 — 복원 컨텍스트 해제.
            recoverableRef.current = null
            clearRecoverTurn(sig)
            const sourceInsights = Array.isArray(data.card_insights)
              ? (data.card_insights as Record<string, unknown>[])
              : Array.isArray(data.cards)
                ? (data.cards as Record<string, unknown>[])
                : []

            const normalizedInsights = result.drawnCards.map((drawnCard, i) => {
              const ci = sourceInsights[i] || {}
              const fallbackInterpretation = drawnCard.isReversed
                ? language === 'ko'
                  ? drawnCard.card.reversed.meaningKo || drawnCard.card.reversed.meaning
                  : drawnCard.card.reversed.meaning
                : language === 'ko'
                  ? drawnCard.card.upright.meaningKo || drawnCard.card.upright.meaning
                  : drawnCard.card.upright.meaning

              return {
                position:
                  (ci.position as string) ||
                  (language === 'ko' ? `${i + 1}번 카드` : `Card ${i + 1}`),
                card_name: drawnCard.card.name,
                is_reversed: drawnCard.isReversed,
                interpretation:
                  ((ci.interpretation as string) || '').trim() ||
                  fallbackInterpretation ||
                  (language === 'ko'
                    ? '카드 메시지를 읽고 현재 상황과 연결해보세요.'
                    : 'Connect this card message to your current situation.'),
              }
            })

            return {
              overall_message: data.overall_message || data.overall || '',
              hook: (data.hook || '').trim() || undefined,
              card_insights: normalizedInsights,
              guidance:
                data.guidance ||
                data.advice ||
                (isKorean ? '카드의 메시지에 귀 기울여보세요.' : 'Listen to the cards.'),
              affirmation: isKorean ? '오늘 하루도 나답게 가면 돼요.' : 'Just be yourself today.',
              fallback: false,
              interpretation_source: 'stream_json_fallback',
            }
          }
        }

        throw new Error('Stream interpretation failed')
      } catch (streamError) {
        tarotLogger.error(
          'Streaming interpretation failed, falling back to local copy',
          streamError instanceof Error ? streamError : undefined
        )
      }

      // 2) Final fallback with personalized renderable copy. The legacy
      // non-stream `/api/tarot/interpret` route was a second LLM round-trip
      // through Claude — same model, different transport. The interpret-
      // stream path above already retries once internally; if both fail we
      // fall straight to the deterministic local copy below.
      return buildPersonalizedFallback(result, userTopic, isKorean, personalizationOptions)
    },
    [categoryName, spreadId, language, userTopic, personalizationOptions]
  )

  // 끊긴 해석 복원 — recoverableRef 에 등록된 turnId 를 result 엔드포인트로
  // 폴링한다. ready=true 면 완성 리딩(raw JSON)을 정상 완료와 동일한
  // parseStreamedInterpretation 경로로 변환해 반환한다. 보이는 동안만 ~30×2s
  // 재시도. counselor 의 attemptRecover 와 동일 결. 로그인 사용자만 가능.
  const recoverLastInterpretation = useCallback(async (): Promise<InterpretationResult | null> => {
    const info = recoverableRef.current
    if (!info || recoveringRef.current) return null
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return null
    recoveringRef.current = true
    try {
      for (let i = 0; i < 30; i++) {
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') break
        if (recoverableRef.current?.turnId !== info.turnId) break // 새 요청이 덮어씀
        try {
          const res = await apiFetch(
            `/api/tarot/interpret-stream/result?turnId=${encodeURIComponent(info.turnId)}`,
            { method: 'GET' }
          )
          if (res.ok) {
            const data = (await res.json()) as { ready?: boolean; content?: string }
            if (data.ready && typeof data.content === 'string' && data.content.length > 0) {
              const recovered = parseStreamedInterpretation(
                data.content,
                info.result.drawnCards,
                info.result.spread.positions,
                info.isKorean
              )
              if (recovered.overall_message.trim().length > 0) {
                recoverableRef.current = null
                return recovered
              }
            }
          } else if (res.status === 401) {
            // 게스트는 서버가 캐시 안 함 → 복구 불가. 폴링 중단.
            break
          }
        } catch {
          /* 네트워크 흔들림 — 다음 루프에서 재시도 */
        }
        await new Promise((r) => setTimeout(r, 2000))
      }
      return null
    } finally {
      recoveringRef.current = false
    }
  }, [])

  const handleSaveReading = useCallback(
    async (
      _readingResult: ReadingResponse | null,
      _spreadInfo: Spread | null,
      interpretation: InterpretationResult | null
    ) => {
      if (!_readingResult || !_spreadInfo || isSaved) {
        return
      }

      const readingResult = _readingResult
      const spreadInfo = _spreadInfo

      try {
        const resolvedSpreadId = spreadId || spreadInfo.id

        if (!resolvedSpreadId) {
          throw new Error('Missing spreadId for tarot save request')
        }

        const guidanceText = flattenTarotGuidance(interpretation?.guidance)
        const saveInterpretation = interpretation
          ? {
              overall_message: interpretation.overall_message,
              guidance: guidanceText,
              card_insights: interpretation.card_insights,
            }
          : null

        if (session?.user) {
          const savePayload = buildTarotSaveRequest({
            question: userTopic,
            spreadInfo,
            readingResult,
            interpretation,
            categoryName: categoryName || undefined,
            spreadId: resolvedSpreadId,
            selectedDeckStyle,
            language: language || 'ko',
            questionAnalysis,
          })

          const preferredSaveResponse = await apiFetch('/api/tarot/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(savePayload),
          })

          if (!preferredSaveResponse.ok) {
            const status = preferredSaveResponse.status
            const errorPayload = (await preferredSaveResponse.json().catch(() => null)) as {
              error?: {
                message?: string
                // route 는 apiError(code,msg,{details:[...]}) 로 보내 → 서버 응답은
                // error.details.details[] 형태. 평평한 error.details[] 도 호환.
                details?:
                  | Array<{ path?: string; message?: string }>
                  | { details?: Array<{ path?: string; message?: string }> }
              }
              message?: string
            } | null
            const rawDetails = errorPayload?.error?.details
            const issues = Array.isArray(rawDetails) ? rawDetails : rawDetails?.details
            const first = Array.isArray(issues) ? issues[0] : undefined
            const detailMsg = first ? `${first.path ?? ''} ${first.message ?? ''}`.trim() : ''
            const reason = detailMsg || errorPayload?.error?.message || errorPayload?.message || ''
            // HTTP 상태를 항상 앞에 — 401(로그인)/402(크레딧)/400(데이터)/500(서버)
            // 을 한눈에 구분. 무음 실패 끝.
            throw new Error(`${status}${reason ? ` ${reason}` : ''}`)
          }

          // 서버가 부여한 readingId 회수 — 이후 클래리파이어 / followup
          // 채팅 PATCH 호출에 사용. 옛 응답은 `{success, readingId}`,
          // 신형 wrap 은 `{data: {readingId}}` 둘 다 흡수.
          const savedJson = (await preferredSaveResponse.json().catch(() => null)) as {
            readingId?: string
            data?: { readingId?: string }
          } | null
          const newReadingId = savedJson?.readingId ?? savedJson?.data?.readingId ?? null
          if (!mountedRef.current) return
          if (newReadingId) {
            setReadingId(newReadingId)
          }
          setIsSaved(true)
          setSaveMessage(language === 'ko' ? '저장되었습니다!' : 'Saved!')
          scheduleClearSaveMessage()
          return
        } else {
          const formattedReading = formatReadingForSave(
            userTopic,
            spreadInfo,
            readingResult.drawnCards,
            saveInterpretation,
            categoryName || '',
            resolvedSpreadId,
            selectedDeckStyle,
            questionAnalysis
          )
          saveReading(formattedReading)
        }

        if (!mountedRef.current) return
        setIsSaved(true)
        setSaveMessage(language === 'ko' ? '저장되었습니다!' : 'Saved!')
        scheduleClearSaveMessage()
      } catch (error) {
        tarotLogger.error('Failed to save reading', error instanceof Error ? error : undefined)
        if (!mountedRef.current) return
        const reason = error instanceof Error ? error.message : ''
        // 실패 메시지는 자동 clear 하지 않는다 — 사용자가 원인을 확인/캡처하고
        // 수동 저장 버튼으로 재시도할 수 있게 유지.
        setSaveMessage(
          language === 'ko'
            ? reason
              ? `저장 실패: ${reason}`
              : '저장 실패'
            : reason
              ? `Save failed: ${reason}`
              : 'Save failed'
        )
      }
    },
    [
      categoryName,
      spreadId,
      selectedDeckStyle,
      language,
      isSaved,
      session,
      userTopic,
      questionAnalysis,
      scheduleClearSaveMessage,
    ]
  )

  return {
    isSaved,
    saveMessage,
    readingId,
    fetchInterpretation,
    recoverLastInterpretation,
    handleSaveReading,
  }
}
