'use client'

import React from 'react'
import Image from 'next/image'
import { Sparkles, Loader2 } from 'lucide-react'
import type { DrawnCard, DeckStyle } from '@/lib/tarot/tarot.types'
import type { CardInsight } from '../../types'
import { getCardImagePath } from '@/lib/tarot/tarot.types'

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
  const staticAdvice = (isKo ? meaning.adviceKo || meaning.advice : meaning.advice) || ''
  const aiInterpretation = cardInsight?.interpretation?.trim() || ''
  const dynamicTip = cardInsight?.action_tip?.trim() || ''
  // 동적 조언이 있으면 그걸 쓰고, 없으면 정적 advice 로 폴백. 둘 다 빈칸이면 박스 안 보임.
  const adviceText = dynamicTip || staticAdvice
  const adviceIsDynamic = Boolean(dynamicTip)
  const hasAiText = aiInterpretation.length > 0

  const keywords = (isKo ? meaning.keywordsKo || meaning.keywords : meaning.keywords).slice(0, 5)

  return (
    <article className="rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-indigo-500/30 transition-colors p-5 md:p-6">
      <header className="flex items-start gap-3 mb-4">
        <span className="mt-0.5 flex items-center justify-center w-9 h-9 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-base font-semibold shrink-0">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wider text-indigo-300/80">{positionTitle}</div>
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
          )}

          {/* 정적 의미 — 컴팩트 (참고용) */}
          {staticMeaning && (
            <details className="group">
              <summary className="cursor-pointer text-[11px] uppercase tracking-wider text-slate-500 hover:text-slate-400 list-none flex items-center gap-1">
                <span className="inline-block transition-transform group-open:rotate-90">▸</span>
                {isKo ? '카드의 일반 의미 (참고)' : 'General Card Meaning'}
              </summary>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed pl-3 border-l border-slate-700">
                {staticMeaning}
              </p>
            </details>
          )}

          {/* AI 해석 — 메인 박스, 시각적으로 구분 */}
          <div className="rounded-xl bg-gradient-to-br from-indigo-500/10 to-violet-500/5 border border-indigo-500/30 p-4 md:p-5 shadow-[0_0_24px_rgba(99,102,241,0.08)]">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-indigo-300" />
              <div className="text-xs uppercase tracking-wider text-indigo-300 font-medium">
                {isKo ? 'AI 해석 — 당신의 질문 기준' : 'AI Reading — For Your Question'}
              </div>
            </div>
            {hasAiText ? (
              <p className="text-base md:text-[17px] text-slate-100 leading-relaxed whitespace-pre-wrap">
                {aiInterpretation}
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

          {adviceText && (
            <div className="rounded-xl bg-amber-500/8 border border-amber-500/25 p-4">
              <div className="text-[11px] uppercase tracking-wider text-amber-300/90 mb-1.5">
                {adviceIsDynamic
                  ? isKo
                    ? '실천 조언 (질문 맞춤)'
                    : 'Action Step (For Your Question)'
                  : isKo
                    ? '실천 팁'
                    : 'Tip'}
              </div>
              <p className="text-base text-slate-100 leading-relaxed">{adviceText}</p>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
