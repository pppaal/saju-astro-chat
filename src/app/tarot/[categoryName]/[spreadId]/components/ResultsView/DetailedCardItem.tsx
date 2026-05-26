'use client'

import React from 'react'
import Image from 'next/image'
import { Sparkles, Loader2 } from 'lucide-react'
import type { DrawnCard, DeckStyle } from '@/lib/tarot/tarot.types'
import type { CardInsight } from '../../types'
import { getCardImagePath } from '@/lib/tarot/tarot.types'
import { renderHighlighted } from './highlight'

interface DetailedCardItemProps {
  drawnCard: DrawnCard
  index: number
  positionTitle: string
  positionMeaning?: string
  cardInsight?: CardInsight
  language: string
  selectedDeckStyle: DeckStyle
  translate: (key: string, fallback: string) => string
  // 부모(ResultsStage)에서 interpretation.fallback === true 일 때 (= AI 응답 대기 중) 전달
  aiPending?: boolean
}

export function DetailedCardItem({
  drawnCard,
  index,
  positionTitle,
  positionMeaning,
  cardInsight,
  language,
  selectedDeckStyle,
  translate,
  aiPending = false,
}: DetailedCardItemProps) {
  const isKo = language === 'ko'
  const meaning = drawnCard.isReversed ? drawnCard.card.reversed : drawnCard.card.upright
  const cardName = isKo ? drawnCard.card.nameKo || drawnCard.card.name : drawnCard.card.name
  const orientationLabel = drawnCard.isReversed
    ? isKo
      ? '역방향'
      : 'Reversed'
    : isKo
      ? '정방향'
      : 'Upright'

  const staticMeaning = (isKo ? meaning.meaningKo || meaning.meaning : meaning.meaning) || ''
  // 일반 의미 — 첫 2문장 또는 200자 cap (이전 전체 노출은 AI 해석을 가려서 단축).
  const trimmedStaticMeaning = (() => {
    const text = staticMeaning.trim()
    if (!text) return ''
    const sentences = text.match(/[^.!?。]+[.!?。]?/g) || [text]
    let out = sentences.slice(0, 2).join('').trim()
    if (out.length > 200) {
      const cut = out.slice(0, 200)
      const lastDot = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '))
      out = lastDot > 100 ? cut.slice(0, lastDot + 1) : `${cut.trim()}…`
    }
    return out
  })()
  const aiInterpretation = cardInsight?.interpretation?.trim() || ''
  const hasAiText = aiInterpretation.length > 0

  const keywords = (isKo ? meaning.keywordsKo || meaning.keywords : meaning.keywords).slice(0, 5)

  return (
    <article className="rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-indigo-500/30 transition-colors p-5 md:p-6">
      <header className="flex items-start gap-3 mb-4">
        <span className="mt-0.5 flex items-center justify-center w-9 h-9 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-base font-semibold shrink-0">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">
            {isKo ? '카드 자리' : 'Position'}
          </div>
          <div className="text-xs uppercase tracking-wider text-indigo-300/80">{positionTitle}</div>
          <div className="mt-2 text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">
            {isKo ? '카드명' : 'Card'}
          </div>
          <h3 className="text-xl md:text-2xl font-semibold text-slate-100 truncate">
            {cardName}
            <span className="ml-2 text-sm font-normal text-slate-400">({orientationLabel})</span>
          </h3>
          {positionMeaning && (
            <p className="mt-1 text-sm text-slate-400 leading-snug">
              <span className="text-indigo-300/70">{isKo ? '이 자리: ' : 'This seat: '}</span>
              {positionMeaning}
            </p>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-5">
        <div className="relative mx-auto md:mx-0">
          <Image
            src={getCardImagePath(drawnCard.card.id, selectedDeckStyle)}
            alt={drawnCard.card.name}
            width={180}
            height={315}
            className={`rounded-xl shadow-lg ${drawnCard.isReversed ? 'rotate-180' : ''}`}
            onError={(event) => {
              event.currentTarget.style.opacity = '0.3'
            }}
          />
          {drawnCard.isReversed && (
            <div className="absolute top-2 right-2 rotate-180 px-2 py-0.5 bg-rose-500/20 border border-rose-500/40 text-rose-200 text-[10px] rounded">
              {translate('tarot.results.reversed', 'Reversed')}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {keywords.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">
                {isKo ? '키워드' : 'Keywords'}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {keywords.map((keyword, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-0.5 text-xs rounded-full bg-slate-800 border border-slate-700 text-slate-300"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 정적 의미 — 첫 2문장만. AI 해석이 메인이라 참고 텍스트는 짧게. */}
          {trimmedStaticMeaning && (
            <div className="space-y-1.5">
              <div className="text-[11px] uppercase tracking-wider text-slate-500">
                {isKo ? '카드 일반 의미' : 'General card meaning'}
              </div>
              <p className="text-[15px] md:text-[17px] text-slate-400 leading-relaxed">
                {trimmedStaticMeaning}
              </p>
            </div>
          )}

          {/* AI 해석 — 메인 박스, 시각적으로 구분 */}
          <div className="rounded-xl bg-gradient-to-br from-indigo-500/10 to-violet-500/5 border border-indigo-500/30 p-4 md:p-5 shadow-[0_0_24px_rgba(99,102,241,0.08)]">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-indigo-300" />
              <div className="text-xs uppercase tracking-wider text-indigo-300 font-medium">
                {isKo ? '타로 마스터 리딩' : 'Tarot Master Reading'}
              </div>
            </div>
            {hasAiText ? (
              <p className="text-lg md:text-[19px] text-slate-100 leading-relaxed whitespace-pre-wrap">
                {renderHighlighted(aiInterpretation)}
              </p>
            ) : aiPending ? (
              <div className="flex items-center gap-2 text-sm text-indigo-200/80 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>
                  {isKo
                    ? 'AI가 이 카드를 당신의 질문에 맞춰 해석 중이에요…'
                    : 'AI is reading this card for your question…'}
                </span>
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">
                {isKo ? '해석을 준비 중입니다…' : 'Preparing interpretation…'}
              </p>
            )}
          </div>

          {/* 실천 팁/조언 박스 제거 — 사용자 요청. AI 해석 안에 시간 앵커 + 행동 안내가 이미 들어있음. */}
        </div>
      </div>
    </article>
  )
}
