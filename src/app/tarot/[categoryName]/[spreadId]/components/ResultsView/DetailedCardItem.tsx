'use client'

import React from 'react'
import Image from 'next/image'
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

  const keywords = (isKo ? meaning.keywordsKo || meaning.keywords : meaning.keywords).slice(0, 5)

  return (
    <article className="rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-indigo-500/30 transition-colors p-5 md:p-6">
      <header className="flex items-start gap-3 mb-4">
        <span className="mt-0.5 flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-sm font-semibold shrink-0">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wider text-indigo-300/80">{positionTitle}</div>
          <h3 className="text-lg font-semibold text-slate-100 truncate">
            {cardName}
            <span className="ml-2 text-xs font-normal text-slate-400">({orientationLabel})</span>
          </h3>
          {positionMeaning && (
            <p className="mt-1 text-xs text-slate-400 leading-snug">
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

          {staticMeaning && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">
                {isKo ? '카드의 의미' : 'Card Meaning'}
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{staticMeaning}</p>
            </div>
          )}

          {aiInterpretation && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-indigo-300/80 mb-1">
                {isKo ? '질문 기준 해석' : 'Reading for Your Question'}
              </div>
              <p className="text-[15px] text-slate-100 leading-relaxed whitespace-pre-wrap">
                {aiInterpretation}
              </p>
            </div>
          )}

          {staticAdvice && (
            <div className="rounded-xl bg-indigo-500/5 border border-indigo-500/15 p-3">
              <div className="text-[11px] uppercase tracking-wider text-indigo-300 mb-1">
                {isKo ? '실천 팁' : 'Tip'}
              </div>
              <p className="text-sm text-slate-200 leading-relaxed">{staticAdvice}</p>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
