'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { MessageCircle, Send, Loader2, Sparkles } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { tarotLogger } from '@/lib/logger'
import { useClarifierCard } from '@/hooks/useClarifierCard'
import { updateRestorePayloadFollowup } from '@/lib/tarot/tarot-storage'
import ChatBubbleContent from '@/components/chat/ChatBubbleContent'
import { useChatAutoScroll } from '@/hooks/useChatAutoScroll'
import { useCreditModal } from '@/contexts/CreditModalContext'
import { useRequireLogin } from '@/contexts/LoginModalContext'
import type { ReadingResponse, InterpretationResult } from '../../../types'

const ClarifierCardModal = dynamic(() => import('@/components/tarot/ClarifierCardModal'), {
  ssr: false,
})

interface FollowupChatProps {
  readingResult: ReadingResponse
  interpretation: InterpretationResult | null
  userTopic: string
  language: string
  /** 자동 저장된 리딩의 서버 ID. null 이면 미저장 (게스트 등) — PATCH 호출 skip. */
  readingId?: string | null
  /**
   * 표시 테마. 기본 'dark' = 단독 타로 결과 페이지(어두운 배경) 그대로.
   * 'light' = 운명/궁합 상담사 안 인라인 타로(흰 모달) — 채팅창이 어두워
   * 안 보이던 것을 흰색 계열로.
   */
  theme?: 'dark' | 'light'
  /**
   * "이 리딩 다시 열기" 복원 시 채워짐 — 저장돼 있던 followup 대화 turn 들.
   * 채팅창을 그대로 복원해 사용자가 직전 대화를 다시 본다.
   */
  initialFollowupTurns?: Array<{ role: 'user' | 'assistant'; content: string }> | null
  /**
   * 복원하는 리딩이 이미 보충 카드를 한 장 뽑았으면 true — 클래리파이어 버튼을
   * 처음부터 잠가 한 리딩당 한 장 정책을 유지한다(복원 후 또 뽑던 버그 차단).
   */
  initialClarifierUsed?: boolean
}

type Turn = { role: 'user' | 'assistant'; content: string; pending?: boolean }

// 32-bit FNV-1a — 결정적 멱등키 생성용(보안 아님, 충돌만 충분히 낮으면 됨).
function fnv1a(str: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

// 테마별 색 팔레트 — dark 는 기존 CSS 변수 그대로(단독 페이지 무변화),
// light 는 인라인 모달의 흰 배경에 맞춘 라이트 톤.
interface FollowupPalette {
  panelBg: string
  panelBorder: string
  panelBlur: string
  accent: string
  accentSoft: string
  userBubbleBg: string
  userBubbleBorder: string
  bubbleText: string
  asstBubbleBg: string
  asstBubbleBorder: string
  inputBg: string
  inputBorder: string
  inputText: string
  inputFocusBorder: string
  sendActiveBg: string
  sendActiveText: string
  sendIdleBg: string
  sendIdleText: string
  noticeBg: string
  noticeBorder: string
  hint: string
  placeholderClass: string
  bubbleTheme: 'dark' | 'light'
}

const DARK_PALETTE: FollowupPalette = {
  panelBg: 'rgba(17, 24, 39, 0.42)',
  panelBorder: 'var(--ds-gold-line)',
  panelBlur: 'blur(16px)',
  accent: 'var(--ds-gold-on-dark)',
  accentSoft: 'var(--ds-gold-on-dark-soft)',
  userBubbleBg: 'rgba(212, 181, 114, 0.15)',
  userBubbleBorder: 'var(--ds-gold-line)',
  bubbleText: 'var(--ds-dark-text)',
  asstBubbleBg: 'var(--ds-dark-surface-strong)',
  asstBubbleBorder: 'var(--ds-dark-border)',
  inputBg: 'var(--ds-dark-surface-strong)',
  inputBorder: 'var(--ds-dark-border)',
  inputText: 'var(--ds-dark-text)',
  inputFocusBorder: 'var(--ds-gold-line)',
  sendActiveBg: 'var(--ds-gold-on-dark)',
  sendActiveText: 'var(--ds-dark-bg)',
  sendIdleBg: 'var(--ds-dark-surface-strong)',
  sendIdleText: 'var(--ds-dark-text-subtle)',
  noticeBg: 'rgba(212, 181, 114, 0.10)',
  noticeBorder: 'var(--ds-gold-line)',
  hint: 'var(--ds-dark-text-subtle)',
  placeholderClass: 'placeholder-slate-500',
  bubbleTheme: 'dark',
}

const LIGHT_PALETTE: FollowupPalette = {
  panelBg: '#ffffff',
  panelBorder: '#e7e5e4',
  panelBlur: 'none',
  accent: '#a07a3c',
  accentSoft: '#8a6730',
  userBubbleBg: 'rgba(160, 122, 60, 0.12)',
  userBubbleBorder: '#e7d8b8',
  bubbleText: '#1c1917',
  asstBubbleBg: '#f5f5f4',
  asstBubbleBorder: '#e7e5e4',
  inputBg: '#ffffff',
  inputBorder: '#e7e5e4',
  inputText: '#1c1917',
  inputFocusBorder: '#a07a3c',
  sendActiveBg: '#a07a3c',
  sendActiveText: '#ffffff',
  sendIdleBg: '#f5f5f4',
  sendIdleText: '#a8a29e',
  noticeBg: 'rgba(160, 122, 60, 0.08)',
  noticeBorder: '#e7d8b8',
  hint: '#78716c',
  placeholderClass: 'placeholder-stone-400',
  bubbleTheme: 'light',
}

export function FollowupChat({
  readingResult,
  interpretation,
  userTopic,
  language,
  readingId,
  theme = 'dark',
  initialFollowupTurns,
  initialClarifierUsed = false,
}: FollowupChatProps) {
  const isKo = language === 'ko'
  const pal = theme === 'light' ? LIGHT_PALETTE : DARK_PALETTE
  const { showDepleted } = useCreditModal()
  const requireLogin = useRequireLogin()
  // 라이브 세션 복원 슬롯 키 — useTarotGame 이 첫 드로우 때 URL 에 심는다.
  // 이 키로 followup 대화를 같은 슬롯에 갱신해 새로고침 후에도 대화가 복원된다.
  const searchParams = useSearchParams()
  const restoreKey = searchParams?.get('restoreKey') || null
  const [input, setInput] = useState('')
  // 복원 진입이면 저장돼 있던 turn 으로 채팅창 시드 — 그 외엔 빈 채팅.
  const [history, setHistory] = useState<Turn[]>(() =>
    initialFollowupTurns && initialFollowupTurns.length > 0
      ? initialFollowupTurns.map((t) => ({ role: t.role, content: t.content }))
      : []
  )
  const [submitting, setSubmitting] = useState(false)
  const [clarifierNotice, setClarifierNotice] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  // Track mount lifecycle so the post-await setHistory / setSubmitting
  // inside sendQuestionText below bail when the user navigates away
  // mid-call. Without this, navigating off the results page while
  // /api/tarot/followup is still streaming fires setState on a dead tree.
  const mountedRef = useRef(true)
  // In-flight followup AbortController. Unmount aborts it so the
  // request and the PATCH save fire-and-forget don't keep running for a
  // torn-down component.
  const followupAbortRef = useRef<AbortController | null>(null)
  // 자동저장(readingId)이 아직 안 끝났을 때 뽑힌 보충 카드를 잠시 보관 →
  // readingId 가 도착하면 flush 해 clarifierCard 컬럼을 채운다(자동저장 경합으로
  // 보충카드가 기록에 안 남던 회귀 방지).
  const pendingClarifierRef = useRef<{
    name: string
    nameKo?: string
    isReversed: boolean
  } | null>(null)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (followupAbortRef.current) {
        try {
          followupAbortRef.current.abort()
        } catch {
          // already aborted — ignore
        }
        followupAbortRef.current = null
      }
    }
  }, [])

  // 자동 스크롤 — destiny/compat 와 같은 공통 hook. endRef 를 박스 내부
  // 맨 끝에 박으면 hook 이 박스(parent) scrollTop 으로 따라간다.
  const { endRef } = useChatAutoScroll({
    messages: history,
  })

  // 결과 페이지에 채팅 박스가 처음 마운트될 때 — 텍스트영역 자동 포커스 → 모바일 키보드 자동.
  // (IntersectionObserver 로 박스가 보일 때만 focus 하면 페이지 상단에 깜빡 튀는 현상 방지)
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries[0]?.isIntersecting
        if (visible) {
          el.focus({ preventScroll: true })
          io.disconnect()
        }
      },
      { threshold: 0.4 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // 저장된 리딩에 followup 채팅 / 클래리파이어 카드를 PATCH 로 추가.
  // readingId 가 없으면 (게스트 / 저장 실패) skip — 동작 자체엔 영향 없음.
  // sendBeacon 은 페이지 떠날 때만; 평소엔 fetch.
  const patchSavedReading = useCallback(
    async (patch: {
      clarifierCard?: { name: string; nameKo?: string; isReversed: boolean }
      followupTurns?: Turn[]
    }) => {
      if (!readingId) return
      const body: Record<string, unknown> = {}
      if (patch.clarifierCard) body.clarifierCard = patch.clarifierCard
      if (patch.followupTurns) {
        // pending placeholder turn 은 빼고 저장 — 빈 assistant content 가
        // DB 에 남으면 히스토리에 어색하게 보임.
        body.followupTurns = patch.followupTurns
          .filter((t) => t.content.trim().length > 0)
          .map((t) => ({ role: t.role, content: t.content }))
        if ((body.followupTurns as Turn[]).length === 0) return
      }
      if (Object.keys(body).length === 0) return
      try {
        await apiFetch(`/api/tarot/save/${readingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } catch (err) {
        tarotLogger.error('[FollowupChat] PATCH failed', err instanceof Error ? err : undefined)
      }
    },
    [readingId]
  )

  // 자동저장이 늦게 끝나 readingId 가 보충 카드 추첨 이후에 도착한 경우,
  // 보관해 둔 보충 카드를 그때 PATCH 로 기록에 반영한다(경합 보정).
  useEffect(() => {
    if (readingId && pendingClarifierRef.current) {
      void patchSavedReading({ clarifierCard: pendingClarifierRef.current })
      pendingClarifierRef.current = null
    }
  }, [readingId, patchSavedReading])

  // 대화가 바뀔 때마다 라이브 복원 슬롯(sessionStorage)에 followup turn 을
  // 반영 → 새로고침해도 결과 화면 대화창이 그대로 복원된다(서버 readingId 가
  // 없는 게스트/저장 전 상태에서도 동작). pending placeholder 는 제외.
  useEffect(() => {
    if (!restoreKey) return
    const turns = history
      .filter((t) => !t.pending && t.content.trim().length > 0)
      .map((t) => ({ role: t.role, content: t.content }))
    if (turns.length === 0) return
    updateRestorePayloadFollowup(restoreKey, { followupTurns: turns })
  }, [history, restoreKey])

  // 본 submit 로직 — 텍스트를 받아 followup 엔드포인트로 보낸다.
  // 키보드/버튼 submit 과 클래리파이어 카드 버튼 둘 다 이 함수를 쓴다.
  const sendQuestionText = async (q: string) => {
    if (!q.trim() || submitting) return

    const nextHistory: Turn[] = [...history, { role: 'user', content: q }]
    setHistory(nextHistory)
    setSubmitting(true)

    // Add placeholder assistant turn we'll fill in
    setHistory((prev) => [...prev, { role: 'assistant', content: '', pending: true }])

    // 멱등키: 직전엔 매 전송 랜덤 UUID 라, 답이 오기 전 페이지를 떠났다가
    // (서버는 req.signal 에 안 묶여 끝까지 생성+1차감+답캐시) 같은 질문을 다시
    // 보내면 새 UUID → 새 차감(중복 과금)이었다. (카드 조합 + 현재 턴 위치 +
    // 질문) 기반 결정적 키로 바꿔, 같은 지점에서 같은 질문 재전송은 서버가
    // 'replay' 로 인식해 캐시 답을 무과금 반환한다(이탈/새로고침/더블클릭 커버).
    // 턴 위치(history.length)를 넣어, 멀티턴 도중 같은 문구를 의도적으로 다시
    // 물으면(앞 답이 누적된 새 맥락) 키가 달라 새로 생성·정상 차감되게 한다
    // (질문만 넣으면 옛 캐시 답이 반환되는 회귀 방지).
    const cardSig = readingResult.drawnCards
      .map((dc) => `${dc.card.name}${dc.isReversed ? 'R' : 'U'}`)
      .join('|')
    const idempotencyKey = `tf-${fnv1a(`${cardSig}#${history.length}#${q.trim()}`)}`

    // Cancel any previous in-flight followup before starting a new one,
    // and register the new controller so unmount can abort it.
    if (followupAbortRef.current) {
      try {
        followupAbortRef.current.abort()
      } catch {
        /* already aborted — ignore */
      }
    }
    const controller = new AbortController()
    followupAbortRef.current = controller

    try {
      const response = await apiFetch('/api/tarot/followup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': idempotencyKey,
        },
        body: JSON.stringify({
          // 서버가 같은 행에 followup turn 을 직접 append 하도록 readingId 전달.
          // 클라 PATCH(replace)가 유실돼도 유료 후속 대화가 기록에 남는 안전망.
          ...(readingId ? { readingId } : {}),
          spreadTitle: readingResult.spread.title,
          originalQuestion: userTopic,
          overallMessage: interpretation?.overall_message,
          cards: readingResult.drawnCards.map((dc, i) => {
            const pos = readingResult.spread.positions[i]
            return {
              position: pos?.title || `Card ${i + 1}`,
              positionKo: pos?.titleKo,
              name: dc.card.name,
              nameKo: dc.card.nameKo,
              isReversed: dc.isReversed,
            }
          }),
          history: nextHistory,
          question: q,
          language,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        // 402 → 크레딧 소진. 전역 모달 (showDepleted) 노출.
        if (response.status === 402) {
          if (mountedRef.current) showDepleted()
          throw new Error('insufficient_credits')
        }
        // 401 → 미인증. apiFetch 가 전역 로그인 모달을 띄운다.
        if (response.status === 401) {
          throw new Error('login_required')
        }
        const errBody = await response.json().catch(() => ({}))
        throw new Error(errBody.error || 'request_failed')
      }

      const data = (await response.json()) as { answer?: string }
      if (!mountedRef.current) return
      const answer = data.answer?.trim() || ''
      setHistory((prev) => {
        const copy = [...prev]
        const lastIdx = copy.length - 1
        if (lastIdx >= 0 && copy[lastIdx].role === 'assistant') {
          copy[lastIdx] = {
            role: 'assistant',
            content:
              answer ||
              (isKo ? '죄송해요, 다시 한 번 물어봐 주실래요?' : 'Sorry, could you ask that again?'),
          }
        }
        return copy
      })
      // followupTurns 영속화는 서버(/api/tarot/followup)가 readingId 로 원자적
      // append(appendTarotFollowupTurns) 해 둔다 — 단일 writer(SSOT). 예전엔 여기서
      // 클라가 전체 history 를 PATCH-replace 로 또 썼는데, 서버 concat 과 동시에
      // 같은 행을 덮어써 멀티탭/기기에서 lost-update(한쪽 유료 turn 소실)가 났다.
      // 클라 replace 를 제거해 두 writer 가 다투지 않게 한다. (sessionStorage 복원은
      // 아래 updateRestorePayloadFollowup effect 가 별도로 유지.)
    } catch (err) {
      // Aborted via unmount — silently bail out. No setState, no logger
      // noise; the component is gone.
      const errName = (err as Error & { name?: string })?.name
      if (errName === 'AbortError' || !mountedRef.current) {
        return
      }
      tarotLogger.error('followup failed', err instanceof Error ? err : undefined)
      const errMsg = err instanceof Error ? err.message : String(err)
      // 크레딧 / 게스트 한도 / 일반 에러를 메시지로 구분 노출. 모달은 위
      // showDepleted() 가 이미 띄움 — 이 라인은 보조 안내.
      const fallbackContent =
        errMsg === 'insufficient_credits'
          ? isKo
            ? '크레딧이 부족해요. 충전 후 다시 시도해 주세요.'
            : 'Out of credits. Please top up and try again.'
          : errMsg === 'login_required'
            ? isKo
              ? '로그인이 필요해요. 로그인하면 가입 보너스 5 크레딧으로 계속 이용할 수 있어요.'
              : 'Login required. Sign in to claim your 5-credit signup bonus and continue.'
            : isKo
              ? '연결이 끊어졌어요. 잠시 후 다시 시도해 주세요.'
              : 'Connection failed. Please try again in a moment.'
      setHistory((prev) => {
        const copy = [...prev]
        const lastIdx = copy.length - 1
        if (lastIdx >= 0 && copy[lastIdx].role === 'assistant') {
          copy[lastIdx] = { role: 'assistant', content: fallbackContent }
        }
        return copy
      })
    } finally {
      if (followupAbortRef.current === controller) {
        followupAbortRef.current = null
      }
      if (mountedRef.current) setSubmitting(false)
    }
  }

  // "한 장 더 뽑아줘" 류 텍스트가 입력으로 들어오면 LLM 한테 보내봐야
  // 프롬프트로는 막아도 가끔 "[보충 카드 2] ..." 같은 가짜 카드를 만들어 답을
  // 보내는 회귀가 있다. 그래서 클라이언트에서 한 번 더 인텐트 매치 →
  // - 클래리파이어 잠금 상태면 잠금 안내만 띄우고 API 호출 skip
  // - 잠금 아니면 채팅 input 을 비우고 클래리파이어 모달을 자동으로 연다
  //   (사용자가 위쪽 버튼을 못 찾았을 때의 동선 회복).
  const matchesDrawIntent = (text: string): boolean => {
    const t = text.trim().toLowerCase()
    if (!t) return false
    // 한국어 — "카드 더", "한 장 더", "추가 카드", "보충 카드", "더 뽑"
    if (/(카드\s*더|한\s*장\s*더|추가\s*카드|보충\s*카드|더\s*뽑)/.test(t)) return true
    // 영어 — "draw (a/one) more", "another card", "pull another", "one more card"
    if (/\b(draw|pull)\b.*\b(more|another|one)\b/.test(t)) return true
    if (/\b(another|one\s*more)\s+card\b/.test(t)) return true
    return false
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = input.trim()
    if (!q || submitting) return

    // 비로그인 → 로그인 모달 ("Sign in, it's FREE!") 먼저, API 호출 skip.
    if (!requireLogin()) return

    if (matchesDrawIntent(q)) {
      setInput('')
      if (clarifier.isLocked) {
        setClarifierNotice(
          isKo
            ? '이번 대화에서는 보충 카드를 이미 한 장 뽑았어요. 새 대화를 시작하면 다시 뽑을 수 있어요.'
            : "You've already drawn one clarifier card in this chat. Start a new chat to draw another."
        )
        return
      }
      clarifier.buttonProps.onClick()
      return
    }

    setInput('')
    await sendQuestionText(q)
  }

  // 🃏 클래리파이어 카드 — 공통 hook (운명상담사/궁합상담사 동일).
  // 새 카드 결과는 안쪽 대화창의 자동 스크롤로 노출 — 섹션 전체를 강제로
  // 스크롤하지 않는다(페이지가 위로 튀던 회귀 방지).
  const clarifier = useClarifierCard({
    lang: isKo ? 'ko' : 'en',
    onSendUserText: (text) => {
      setClarifierNotice(null)
      // 비로그인 사용자는 followup API 가 401 → 우리 로그인 모달 (Saju · Astrology
      // · Tarot — Sign in, it's FREE!) 을 먼저 띄워 깔끔하게 안내. true 면 인증
      // 완료 → 그대로 진행.
      if (!requireLogin()) return
      // 새 카드 메시지 + 답변은 안쪽 대화창(max-h-80 overflow-y-auto)에 쌓이고
      // useChatAutoScroll 이 그 컨테이너를 맨 아래로 따라간다 → 그대로 보이게 둔다.
      // (이전: containerRef.scrollIntoView({ block:'start' }) 로 섹션 전체를
      //  뷰포트 맨 위로 끌어올려 "페이지가 위로 튀고 진행이 안 됨" 회귀.)
      void sendQuestionText(text)
    },
    // 클래리파이어 카드는 별도 컬럼 (TarotReading.clarifierCard) 에도 저장 —
    // followup 채팅 turn 안의 이미지 markdown 보다 구조화된 쿼리/통계용 데이터로.
    onCardPicked: (card) => {
      const lite = { name: card.name, nameKo: card.nameKo, isReversed: card.isReversed }
      // readingId 가 아직이면(자동저장 진행 중) 보관해 뒀다가 도착 시 flush.
      if (readingId) {
        void patchSavedReading({ clarifierCard: lite })
      } else {
        pendingClarifierRef.current = lite
      }
      // 라이브 복원 슬롯에도 반영 → 새로고침 후에도 보충카드 잠금 유지.
      updateRestorePayloadFollowup(restoreKey, { clarifierCard: lite })
    },
    onLockedNotice: setClarifierNotice,
    // suspendAutoScrollRef 는 일부러 주지 않는다 — 여기 대화창은 자체 overflow
    // 스크롤 박스라 새 메시지가 오면 안쪽 컨테이너가 따라 내려가야(자동 스크롤)
    // 새 카드 결과가 보인다. 자동 스크롤을 끄면 답변이 박스 아래로 가려져
    // "진행이 안 됨" 으로 보이는 회귀가 난다.
    disabled: submitting,
    // 복원한 리딩이 이미 보충 카드를 뽑았으면 버튼을 처음부터 잠근다.
    initiallyUsed: initialClarifierUsed,
    // 스프레드에 이미 깔린 카드들 — 보충 카드가 이 중 하나와 겹치지 않게 제외
    // (같은 리딩에 같은 카드가 두 번 나오는 물리 덱 불가능한 중복 방지).
    excludeCardNames: readingResult.drawnCards.map((dc) => dc.card.name),
  })

  return (
    <section
      className="rounded-2xl p-5 md:p-6 space-y-4 border"
      style={{
        background: pal.panelBg,
        borderColor: pal.panelBorder,
        backdropFilter: pal.panelBlur,
        WebkitBackdropFilter: pal.panelBlur,
      }}
    >
      <div className="flex items-center gap-2">
        <MessageCircle className="w-4 h-4" style={{ color: pal.accent }} />
        <h2 className="text-sm font-medium tracking-wider uppercase" style={{ color: pal.accent }}>
          {isKo ? '이 리딩에 대해 더 묻기' : 'Ask about this reading'}
        </h2>
      </div>

      {history.length > 0 && (
        <div className="max-h-[60vh] min-h-[200px] overflow-y-auto space-y-3 pr-1">
          {history.map((t, i) => (
            <div key={i} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className="max-w-[88%] rounded-xl px-4 py-2.5 text-[17px] leading-relaxed whitespace-pre-wrap border"
                style={
                  t.role === 'user'
                    ? {
                        background: pal.userBubbleBg,
                        borderColor: pal.userBubbleBorder,
                        color: pal.bubbleText,
                      }
                    : {
                        background: pal.asstBubbleBg,
                        borderColor: pal.asstBubbleBorder,
                        color: pal.bubbleText,
                      }
                }
              >
                <ChatBubbleContent
                  role={t.role}
                  content={t.content}
                  pending={t.pending}
                  pendingNode={
                    <div
                      className="flex items-center gap-2 text-sm"
                      style={{ color: pal.accentSoft }}
                    >
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {isKo ? '답변 준비 중…' : 'Thinking…'}
                    </div>
                  }
                  theme={pal.bubbleTheme}
                />
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      )}

      {clarifierNotice && (
        <p
          className="text-xs rounded-md px-3 py-2 border"
          style={{
            background: pal.noticeBg,
            borderColor: pal.noticeBorder,
            color: pal.accentSoft,
          }}
        >
          {clarifierNotice}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          {...clarifier.buttonProps}
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            background: pal.noticeBg,
            borderColor: pal.noticeBorder,
            color: pal.accentSoft,
          }}
        >
          <Sparkles className="h-3.5 w-3.5" />
          {clarifier.buttonLabel}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit(e)
            }
          }}
          placeholder={isKo ? '더 궁금한 점을 적어주세요' : 'Ask another question'}
          rows={1}
          className={`flex-1 rounded-full px-4 py-2.5 text-sm h-11 max-h-32 outline-none resize-none transition-colors leading-6 border ${pal.placeholderClass}`}
          style={{
            background: pal.inputBg,
            borderColor: pal.inputBorder,
            color: pal.inputText,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = pal.inputFocusBorder
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = pal.inputBorder
          }}
          disabled={submitting}
        />
        <button
          type="submit"
          disabled={!input.trim() || submitting}
          className="p-2.5 rounded-xl transition-all"
          style={
            input.trim() && !submitting
              ? {
                  background: pal.sendActiveBg,
                  color: pal.sendActiveText,
                  cursor: 'pointer',
                }
              : {
                  background: pal.sendIdleBg,
                  color: pal.sendIdleText,
                  cursor: 'not-allowed',
                }
          }
          aria-label="Send"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>

      {history.length === 0 && (
        <p className="text-xs" style={{ color: pal.hint }}>
          {isKo
            ? '예: "3번 카드가 왜 거기 떴나요?", "지금 결정 미루는 게 나아요?"'
            : 'e.g. "Why did the 3rd card land there?", "Should I wait on the decision?"'}
        </p>
      )}
      <ClarifierCardModal {...clarifier.modalProps} />
    </section>
  )
}
