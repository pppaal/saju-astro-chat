'use client'

import React from 'react'
import Image from 'next/image'
import { Sparkles, Loader2 } from 'lucide-react'
import type { DrawnCard, DeckStyle } from '@/lib/tarot/tarot.types'
import type { CardInsight } from '../../types'
import { getCardImagePath } from '@/lib/tarot/tarot.types'
import { renderWithLastSentenceHighlight } from './highlight'

// 카드 이미지(1~2MB animated webp)는 AI 해석 스트리밍 중에 *절대* 다시
// reconcile 되면 안 된다. token 마다 부모(ResultsStage→DetailedCardsSection
// →DetailedCardItem) 가 매번 re-render 되는데, 이미지가 같이 reconcile 되면
// animated webp decoding/GPU upload 가 매 frame 일어나 초반 1-2초 렉. React
// .memo 로 cardId+deckStyle+isReversed 가 같으면 skip → token 흘러도 이미지
// 부분은 한 번만 그려짐.
const CardImage = React.memo(function CardImage({
  cardId,
  deckStyle,
  altName,
  isReversed,
}: {
  cardId: number
  deckStyle: DeckStyle
  altName: string
  isReversed: boolean
}) {
  return (
    <Image
      src={getCardImagePath(cardId, deckStyle)}
      alt={altName}
      width={180}
      height={315}
      className={`rounded-xl shadow-lg ${isReversed ? 'rotate-180' : ''}`}
      unoptimized
      onError={(event) => {
        event.currentTarget.style.opacity = '0.3'
      }}
    />
  )
})

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

function DetailedCardItemBase({
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
    <article className="rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-[rgba(212,181,114,0.3)] transition-colors p-5 md:p-6">
      <header className="flex items-start gap-3 mb-4">
        <span className="mt-0.5 flex items-center justify-center w-9 h-9 rounded-full bg-[rgba(212,181,114,0.15)] border border-[rgba(212,181,114,0.3)] text-[#d4b572] text-base font-semibold shrink-0">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">
            {isKo ? '카드 자리' : 'Position'}
          </div>
          <div className="text-xs uppercase tracking-wider text-[rgba(212,181,114,0.8)]">
            {positionTitle}
          </div>
          <div className="mt-2 text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">
            {isKo ? '카드명' : 'Card'}
          </div>
          <h3 className="text-xl md:text-2xl font-semibold text-slate-100 truncate">
            {cardName}
            <span className="ml-2 text-sm font-normal text-slate-400">({orientationLabel})</span>
          </h3>
          {positionMeaning && (
            <p className="mt-1 text-sm text-slate-400 leading-snug">
              <span className="text-[rgba(212,181,114,0.7)]">
                {isKo ? '이 자리: ' : 'This seat: '}
              </span>
              {positionMeaning}
            </p>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-5">
        <div className="relative mx-auto md:mx-0">
          <CardImage
            cardId={drawnCard.card.id}
            deckStyle={selectedDeckStyle}
            altName={drawnCard.card.name}
            isReversed={drawnCard.isReversed}
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
          <div className="rounded-xl bg-gradient-to-br from-[rgba(212,181,114,0.1)] to-[rgba(193,155,86,0.05)] border border-[rgba(212,181,114,0.3)] p-4 md:p-5 shadow-[0_0_24px_rgba(212,181,114,0.08)]">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-[#d4b572]" />
              <div className="text-xs uppercase tracking-wider text-[#d4b572] font-medium">
                {isKo ? '타로 마스터 리딩' : 'Tarot Master Reading'}
              </div>
            </div>
            {hasAiText ? (
              <p className="text-lg md:text-[19px] text-slate-100 leading-relaxed whitespace-pre-wrap">
                {renderWithLastSentenceHighlight(aiInterpretation, !aiPending)}
              </p>
            ) : aiPending ? (
              <div className="flex items-center gap-2 text-sm text-[rgba(232,204,138,0.8)] py-2">
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

// AI 해석 스트리밍 중엔 부모가 ~120ms 마다 새 interpretation 스냅샷을 만들어
// card_insights 배열·객체가 매 틱 새로 생성된다. memo 없이는 카드 N장이 매
// 틱(초당 ~8회) 전부 리렌더 → 메인스레드가 막혀 로딩/카드 애니가 렉. 이 카드의
// *실제로 보이는* 값(해석 텍스트·자리·역방향·언어·덱·대기상태)이 바뀔 때만
// 리렌더하도록 비교한다. cardInsight 는 객체 identity 가 아니라 그 카드가 쓰는
// 유일 필드(interpretation)로 비교한다. translate 는 출력이 언어에만 의존하므로
// language 비교로 대체(함수 identity 변동 무시).
export function arePropsEqual(prev: DetailedCardItemProps, next: DetailedCardItemProps): boolean {
  return (
    prev.drawnCard === next.drawnCard &&
    prev.index === next.index &&
    prev.language === next.language &&
    prev.selectedDeckStyle === next.selectedDeckStyle &&
    prev.positionTitle === next.positionTitle &&
    prev.positionMeaning === next.positionMeaning &&
    (prev.aiPending ?? false) === (next.aiPending ?? false) &&
    (prev.cardInsight?.interpretation ?? '') === (next.cardInsight?.interpretation ?? '')
  )
}

export const DetailedCardItem = React.memo(DetailedCardItemBase, arePropsEqual)
