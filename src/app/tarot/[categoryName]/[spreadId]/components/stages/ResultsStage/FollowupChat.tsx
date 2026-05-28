'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { MessageCircle, Send, Loader2, Sparkles } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { tarotLogger } from '@/lib/logger'
import { useClarifierCard } from '@/hooks/useClarifierCard'
import ChatBubbleContent from '@/components/chat/ChatBubbleContent'
import { useChatAutoScroll } from '@/hooks/useChatAutoScroll'
import { useCreditModal } from '@/contexts/CreditModalContext'
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
}

type Turn = { role: 'user' | 'assistant'; content: string; pending?: boolean }

export function FollowupChat({
  readingResult,
  interpretation,
  userTopic,
  language,
  readingId,
}: FollowupChatProps) {
  const isKo = language === 'ko'
  const { showDepleted } = useCreditModal()
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<Turn[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [clarifierNotice, setClarifierNotice] = useState<string | null>(null)
  // containerRef — 클래리파이어 confirm 직후 페이지 viewport 를 채팅 박스
  // 시작 위치로 가져오기 위해 section 자체에 박는다.
  const containerRef = useRef<HTMLElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  // 클래리파이어 confirm 직후 일정 시간 자동 스크롤 hijack 끄기 — 자세한
  // 정책은 useClarifierCard hook 참조.
  const suspendAutoScrollRef = useRef(false)

  // 자동 스크롤 — destiny/compat 와 같은 공통 hook. endRef 를 박스 내부
  // 맨 끝에 박으면 hook 이 박스(parent) scrollTop 으로 따라간다.
  const { endRef } = useChatAutoScroll({
    messages: history,
    suspendRef: suspendAutoScrollRef,
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

  // 본 submit 로직 — 텍스트를 받아 followup 엔드포인트로 보낸다.
  // 키보드/버튼 submit 과 클래리파이어 카드 버튼 둘 다 이 함수를 쓴다.
  const sendQuestionText = async (q: string) => {
    if (!q.trim() || submitting) return

    const nextHistory: Turn[] = [...history, { role: 'user', content: q }]
    setHistory(nextHistory)
    setSubmitting(true)

    // Add placeholder assistant turn we'll fill in
    setHistory((prev) => [...prev, { role: 'assistant', content: '', pending: true }])

    // 새로고침/탭 복제 등 같은 질문 재진입 시 서버가 중복 차감 안 하도록
    // 매 user 질문마다 UUID 생성해 x-idempotency-key 헤더로 전달.
    const idempotencyKey =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `t${Date.now()}-${Math.random().toString(36).slice(2)}`

    try {
      const response = await apiFetch('/api/tarot/followup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': idempotencyKey,
        },
        body: JSON.stringify({
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
      })

      if (!response.ok) {
        // 402 → 크레딧 소진. 전역 모달 (showDepleted) 노출.
        if (response.status === 402) {
          showDepleted()
          throw new Error('insufficient_credits')
        }
        // 401 → 게스트 한도 도달 또는 미인증. 메시지로 안내.
        if (response.status === 401) {
          throw new Error('guest_or_login_required')
        }
        const errBody = await response.json().catch(() => ({}))
        throw new Error(errBody.error || 'request_failed')
      }

      const data = (await response.json()) as { answer?: string }
      const answer = data.answer?.trim() || ''
      let finalHistory: Turn[] = []
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
        finalHistory = copy
        return copy
      })
      // 한 turn 응답 받은 직후 자동 저장 — 저장된 리딩이면 (readingId 있음)
      // 같은 row 의 followupTurns 컬럼 갱신. 게스트는 readingId 없어 skip.
      void patchSavedReading({ followupTurns: finalHistory })
    } catch (err) {
      tarotLogger.error('followup failed', err instanceof Error ? err : undefined)
      const errMsg = err instanceof Error ? err.message : String(err)
      // 크레딧 / 게스트 한도 / 일반 에러를 메시지로 구분 노출. 모달은 위
      // showDepleted() 가 이미 띄움 — 이 라인은 보조 안내.
      const fallbackContent =
        errMsg === 'insufficient_credits'
          ? isKo
            ? '크레딧이 부족해요. 충전 후 다시 시도해 주세요.'
            : 'Out of credits. Please top up and try again.'
          : errMsg === 'guest_or_login_required'
            ? isKo
              ? '무료 체험 한도에 도달했어요. 로그인하면 가입 보너스 5 크레딧으로 계속 이용할 수 있어요.'
              : 'Free trial limit reached. Sign in to claim your 5-credit signup bonus and continue.'
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
      setSubmitting(false)
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
  // onSendUserText 안에서 main 의 viewport scroll fix 도 함께 (사용자가
  // 페이지 위쪽에 있을 때 클래리파이어 결과 안 보이는 회귀 방지).
  const clarifier = useClarifierCard({
    lang: isKo ? 'ko' : 'en',
    onSendUserText: (text) => {
      setClarifierNotice(null)
      // 두 frame 뒤 scroll — modal close + history 갱신 commit 이 paint 된
      // 다음에 가져와야 새 카드 메시지 위치가 정확.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
      })
      void sendQuestionText(text)
    },
    // 클래리파이어 카드는 별도 컬럼 (TarotReading.clarifierCard) 에도 저장 —
    // followup 채팅 turn 안의 이미지 markdown 보다 구조화된 쿼리/통계용 데이터로.
    onCardPicked: (card) => {
      void patchSavedReading({
        clarifierCard: {
          name: card.name,
          nameKo: card.nameKo,
          isReversed: card.isReversed,
        },
      })
    },
    onLockedNotice: setClarifierNotice,
    suspendAutoScrollRef,
    disabled: submitting,
  })

  return (
    <section
      ref={containerRef}
      className="rounded-2xl p-5 md:p-6 space-y-4 border"
      style={{
        background: 'rgba(17, 24, 39, 0.42)',
        borderColor: 'var(--ds-gold-line)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      <div className="flex items-center gap-2">
        <MessageCircle className="w-4 h-4" style={{ color: 'var(--ds-gold-on-dark)' }} />
        <h2
          className="text-sm font-medium tracking-wider uppercase"
          style={{ color: 'var(--ds-gold-on-dark)' }}
        >
          {isKo ? '이 리딩에 대해 더 묻기' : 'Ask about this reading'}
        </h2>
      </div>

      {history.length > 0 && (
        <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
          {history.map((t, i) => (
            <div key={i} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className="max-w-[88%] rounded-xl px-4 py-2.5 text-[17px] leading-relaxed whitespace-pre-wrap border"
                style={
                  t.role === 'user'
                    ? {
                        background: 'rgba(212, 181, 114, 0.15)',
                        borderColor: 'var(--ds-gold-line)',
                        color: 'var(--ds-dark-text)',
                      }
                    : {
                        background: 'var(--ds-dark-surface-strong)',
                        borderColor: 'var(--ds-dark-border)',
                        color: 'var(--ds-dark-text)',
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
                      style={{ color: 'var(--ds-gold-on-dark-soft)' }}
                    >
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {isKo ? '답변 준비 중…' : 'Thinking…'}
                    </div>
                  }
                  theme="dark"
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
            background: 'rgba(212, 181, 114, 0.10)',
            borderColor: 'var(--ds-gold-line)',
            color: 'var(--ds-gold-on-dark-soft)',
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
            background: 'rgba(212, 181, 114, 0.10)',
            borderColor: 'var(--ds-gold-line)',
            color: 'var(--ds-gold-on-dark-soft)',
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
          className="flex-1 rounded-full px-4 py-2.5 text-sm h-11 max-h-32 outline-none resize-none transition-colors leading-6 border placeholder-slate-500"
          style={{
            background: 'var(--ds-dark-surface-strong)',
            borderColor: 'var(--ds-dark-border)',
            color: 'var(--ds-dark-text)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--ds-gold-line)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--ds-dark-border)'
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
                  background: 'var(--ds-gold-on-dark)',
                  color: 'var(--ds-dark-bg)',
                  cursor: 'pointer',
                }
              : {
                  background: 'var(--ds-dark-surface-strong)',
                  color: 'var(--ds-dark-text-subtle)',
                  cursor: 'not-allowed',
                }
          }
          aria-label="Send"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>

      {history.length === 0 && (
        <p className="text-xs" style={{ color: 'var(--ds-dark-text-subtle)' }}>
          {isKo
            ? '예: "3번 카드가 왜 거기 떴나요?", "지금 결정 미루는 게 나아요?"'
            : 'e.g. "Why did the 3rd card land there?", "Should I wait on the decision?"'}
        </p>
      )}
      <ClarifierCardModal {...clarifier.modalProps} />
    </section>
  )
}
