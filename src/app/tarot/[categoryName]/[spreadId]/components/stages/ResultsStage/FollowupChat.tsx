'use client'

import React, { useState, useRef, useEffect } from 'react'
import { MessageCircle, Send, Loader2 } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { tarotLogger } from '@/lib/logger'
import type { ReadingResponse, InterpretationResult } from '../../../types'

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
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = input.trim()
    if (!q || submitting) return

    const nextHistory: Turn[] = [...history, { role: 'user', content: q }]
    setHistory(nextHistory)
    setInput('')
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
              (isKo
                ? '죄송해요, 다시 한 번 물어봐 주실래요?'
                : 'Sorry, could you ask that again?'),
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

  return (
    <section className="rounded-2xl bg-slate-900/50 border border-cyan-500/20 shadow-[0_0_24px_rgba(34,211,238,0.06)] p-5 md:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <MessageCircle className="w-4 h-4 text-cyan-300" />
        <h2 className="text-sm font-medium text-cyan-300 tracking-wider uppercase">
          {isKo ? '이 리딩에 대해 더 묻기' : 'Ask about this reading'}
        </h2>
      </div>

      {history.length > 0 && (
        <div
          ref={scrollRef}
          className="max-h-80 overflow-y-auto space-y-3 pr-1"
        >
          {history.map((t, i) => (
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
                  <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{t.content}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

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
          placeholder={
            isKo ? '더 궁금한 점을 적어주세요' : 'Ask another question'
          }
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
    </section>
  )
}
