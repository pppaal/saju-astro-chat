'use client'

import React, { useState, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { MessageCircle, Send, Loader2, Sparkles } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { tarotLogger } from '@/lib/logger'
import { buildClarifierUserMessage, type ClarifierCard } from '@/lib/tarot/drawClarifierCard'
import type { ReadingResponse, InterpretationResult } from '../../../types'

const ClarifierCardModal = dynamic(() => import('@/components/tarot/ClarifierCardModal'), {
  ssr: false,
})

interface FollowupChatProps {
  readingResult: ReadingResponse
  interpretation: InterpretationResult | null
  userTopic: string
  language: string
}

type Turn = { role: 'user' | 'assistant'; content: string; pending?: boolean }

export function FollowupChat({
  readingResult,
  interpretation,
  userTopic,
  language,
}: FollowupChatProps) {
  const isKo = language === 'ko'
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<Turn[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [showClarifierModal, setShowClarifierModal] = useState(false)
  // 한 리딩당 클래리파이어 한 장만 (운명상담사 동일 정책 PR #631).
  const [clarifierUsed, setClarifierUsed] = useState(false)
  const [clarifierNotice, setClarifierNotice] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  // 클래리파이어 confirm 직후 일정 시간 자동 스크롤 hijack 끄기 —
  // "카드 한 장 더 뽑기" 버튼이 채팅 박스 맨 하단이고, 사용자가 본 자리에
  // 카드/답변이 그대로 쌓이는 게 자연스러움. 자동 scrollTo 가 답변 끝까지
  // 따라가면 viewport/박스가 위로 밀려 회귀.
  const suspendAutoScrollRef = useRef(false)

  useEffect(() => {
    if (suspendAutoScrollRef.current) return
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [history])

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

  // 본 submit 로직 — 텍스트를 받아 followup 엔드포인트로 보낸다.
  // 키보드/버튼 submit 과 클래리파이어 카드 버튼 둘 다 이 함수를 쓴다.
  const sendQuestionText = async (q: string) => {
    if (!q.trim() || submitting) return

    const nextHistory: Turn[] = [...history, { role: 'user', content: q }]
    setHistory(nextHistory)
    setSubmitting(true)

    // Add placeholder assistant turn we'll fill in
    setHistory((prev) => [...prev, { role: 'assistant', content: '', pending: true }])

    try {
      const response = await apiFetch('/api/tarot/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        const errBody = await response.json().catch(() => ({}))
        throw new Error(errBody.error || 'request_failed')
      }

      const data = (await response.json()) as { answer?: string }
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
    } catch (err) {
      tarotLogger.error('followup failed', err instanceof Error ? err : undefined)
      setHistory((prev) => {
        const copy = [...prev]
        const lastIdx = copy.length - 1
        if (lastIdx >= 0 && copy[lastIdx].role === 'assistant') {
          copy[lastIdx] = {
            role: 'assistant',
            content: isKo
              ? '연결이 끊어졌어요. 잠시 후 다시 시도해 주세요.'
              : 'Connection failed. Please try again in a moment.',
          }
        }
        return copy
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = input.trim()
    if (!q || submitting) return
    setInput('')
    await sendQuestionText(q)
  }

  // 🃏 클래리파이어 카드 한 장 — 한 리딩당 한 장만. 두 번째 클릭은 모달
  // 안 열고 안내만 띄움.
  const openClarifier = () => {
    if (submitting) return
    if (clarifierUsed) {
      setClarifierNotice(
        isKo
          ? '이 리딩에서는 보충 카드를 이미 한 장 뽑았어요. 새 리딩에서 다시 뽑을 수 있어요.'
          : "You've already drawn one clarifier card for this reading."
      )
      return
    }
    setShowClarifierModal(true)
  }
  const handleClarifierConfirm = async (card: ClarifierCard) => {
    // 자동 스크롤 25 초 끄기 — "그 자리 유지" 회귀 방지 (PR #644 패턴).
    suspendAutoScrollRef.current = true
    window.setTimeout(() => {
      suspendAutoScrollRef.current = false
    }, 25000)
    setClarifierUsed(true)
    setClarifierNotice(null)
    const text = buildClarifierUserMessage(card, isKo ? 'ko' : 'en')
    await sendQuestionText(text)
  }

  return (
    <section className="rounded-2xl bg-slate-900/50 border border-cyan-500/20 shadow-[0_0_24px_rgba(34,211,238,0.06)] p-5 md:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <MessageCircle className="w-4 h-4 text-cyan-300" />
        <h2 className="text-sm font-medium text-cyan-300 tracking-wider uppercase">
          {isKo ? '이 리딩에 대해 더 묻기' : 'Ask about this reading'}
        </h2>
      </div>

      {history.length > 0 && (
        <div ref={scrollRef} className="max-h-80 overflow-y-auto space-y-3 pr-1">
          {history.map((t, i) => {
            // 클래리파이어 user 메시지에 들어있는 카드 markdown 이미지(`![alt](src)`)는
            // 그냥 텍스트로 두면 안 보임 — 추출해 별도 <img> 로 렌더하고 본문에서는
            // 제거해 중복 표시 안 되게.
            const imgMatch =
              t.role === 'user' ? /!\[([^\]]*)\]\(([^)]+)\)/.exec(t.content) : null
            const inlineImage = imgMatch
              ? { alt: imgMatch[1] || '', src: imgMatch[2] }
              : null
            const textContent = inlineImage
              ? t.content.replace(/!\[[^\]]*\]\([^)]+\)/, '').trim()
              : t.content
            return (
              <div
                key={i}
                className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-xl px-4 py-2.5 ${
                    t.role === 'user'
                      ? 'bg-indigo-500/15 border border-indigo-500/30 text-slate-100'
                      : 'bg-slate-800/60 border border-slate-700 text-slate-100'
                  }`}
                >
                  {t.pending ? (
                    <div className="flex items-center gap-2 text-cyan-200/80 text-sm">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {isKo ? '답변 준비 중…' : 'Thinking…'}
                    </div>
                  ) : (
                    <>
                      {textContent && (
                        <p className="text-[17px] leading-relaxed whitespace-pre-wrap">
                          {textContent}
                        </p>
                      )}
                      {inlineImage && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={inlineImage.src}
                          alt={inlineImage.alt}
                          loading="lazy"
                          style={{
                            display: 'block',
                            maxWidth: '180px',
                            width: '70%',
                            aspectRatio: '5 / 8.5',
                            objectFit: 'cover',
                            borderRadius: '10px',
                            marginTop: textContent ? '10px' : 0,
                            boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
                            background: 'rgba(255,255,255,0.06)',
                          }}
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {clarifierNotice && (
        <p className="text-xs text-amber-200/80 bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2">
          {clarifierNotice}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={openClarifier}
          disabled={submitting || showClarifierModal}
          aria-disabled={submitting || showClarifierModal || clarifierUsed}
          style={clarifierUsed ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
          className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-[12px] font-medium text-cyan-200 transition-colors hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          title={
            clarifierUsed
              ? isKo
                ? '이 리딩에서는 이미 한 장 뽑았어요'
                : 'Already drew one for this reading'
              : isKo
                ? '직전 리딩 흐름에 클래리파이어 카드 한 장 더 뽑기'
                : 'Draw one clarifier card to add to this reading'
          }
        >
          <Sparkles className="h-3.5 w-3.5" />
          {clarifierUsed
            ? isKo
              ? '한 장 더 뽑기 불가'
              : 'No more draws'
            : isKo
              ? '카드 한 장 더 뽑기'
              : 'Draw one more card'}
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
          className="flex-1 bg-slate-800 border border-slate-700 focus:border-cyan-500 rounded-full px-4 py-2.5 text-slate-100 placeholder-slate-500 resize-none outline-none text-sm h-11 max-h-32 transition-colors leading-6"
          disabled={submitting}
        />
        <button
          type="submit"
          disabled={!input.trim() || submitting}
          className={`p-2.5 rounded-xl transition-all ${
            input.trim() && !submitting
              ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
          aria-label="Send"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>

      {history.length === 0 && (
        <p className="text-xs text-slate-500">
          {isKo
            ? '예: "3번 카드가 왜 거기 떴나요?", "지금 결정 미루는 게 나아요?"'
            : 'e.g. "Why did the 3rd card land there?", "Should I wait on the decision?"'}
        </p>
      )}
      <ClarifierCardModal
        isOpen={showClarifierModal}
        onClose={() => setShowClarifierModal(false)}
        onConfirm={handleClarifierConfirm}
        lang={isKo ? 'ko' : 'en'}
      />
    </section>
  )
}
