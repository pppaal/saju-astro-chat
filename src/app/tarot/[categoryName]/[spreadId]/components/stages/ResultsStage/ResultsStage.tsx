import React from 'react'
import Link from 'next/link'
import { MessageCircle, Loader2, AlertCircle, History, RotateCcw, Check, Save } from 'lucide-react'

/**
 * Haiku 스트림이 30-60s 가 걸리는 경우가 있어, 단순 spinner 만 노출하면
 * 멈춘 줄 알고 사용자가 새로고침/재시도하다 idempotency 충돌이 나는 회귀.
 * 25s 가 지나면 "조금만 더 기다려달라" 안내문을 한 번 더 표시한다.
 */
function useElapsedReassurance(active: boolean, thresholdMs = 25000): boolean {
  const [show, setShow] = React.useState(false)
  React.useEffect(() => {
    if (!active) {
      setShow(false)
      return
    }
    const t = setTimeout(() => setShow(true), thresholdMs)
    return () => clearTimeout(t)
  }, [active, thresholdMs])
  return show
}

function WaitingForReadingHint({ active, isKo }: { active: boolean; isKo: boolean }) {
  const showExtra = useElapsedReassurance(active)
  return (
    <div
      className="flex flex-col gap-2 text-sm py-2"
      style={{ color: 'var(--ds-gold-on-dark-soft)' }}
    >
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>
          {isKo
            ? 'AI가 펼친 카드 전체를 당신의 질문에 맞춰 읽고 있어요…'
            : 'AI is reading the full spread for your question…'}
        </span>
      </div>
      {showExtra && (
        <p className="text-xs pl-6" style={{ color: 'var(--ds-dark-text-muted)' }}>
          {isKo
            ? '카드가 많을수록 조금 더 걸려요 (보통 30-60초). 새로고침하지 마시고 잠시만 기다려 주세요.'
            : 'Larger spreads take a little longer (typically 30-60s). Please don’t refresh — hang tight.'}
        </p>
      )}
    </div>
  )
}
import type { TarotQuestionAnalysisSnapshot } from '@/lib/tarot/questionFlow'
import type { ReadingResponse, InterpretationResult } from '../../../types'
import type { DeckStyle } from '@/lib/tarot/tarot.types'
import type { CardColor } from '../../../constants'
import { HorizontalCardsGrid, DetailedCardsSection, ActionButtons } from '../../index'
import { ResultsHeader } from './ResultsHeader'
import { GuidanceSection } from './GuidanceSection'
import { FollowupChat } from './FollowupChat'
import { ShareTarotButton } from '@/components/tarot/ShareTarotButton'
import { buildShareDataFromReading } from '@/components/tarot/shareCardData'
import { renderWithLastSentenceHighlight } from '../../ResultsView/highlight'

export interface ResultsStageProps {
  readingResult: ReadingResponse
  interpretation: InterpretationResult | null
  selectedColor: CardColor
  selectedDeckStyle: DeckStyle
  revealedCards: number[]
  detailedSectionRef: React.RefObject<HTMLDivElement | null>
  language: string
  translate: (key: string, fallback: string) => string
  userTopic: string
  questionAnalysis: TarotQuestionAnalysisSnapshot | null
  isGuestUser: boolean
  handleCardReveal: (index: number) => void
  canRevealCard: (index: number) => boolean
  isCardRevealed: (index: number) => boolean
  isSaving: boolean
  isSaved: boolean
  saveMessage: string
  /** 서버 저장 후 부여된 ID — FollowupChat 이 PATCH 로 클래리파이어 / 채팅
   *  turn 을 같은 row 에 추가 저장할 때 사용. null 이면 미저장 상태. */
  readingId?: string | null
  handleSaveReading: () => Promise<void>
  handleReset: () => void
  interpretationFailed?: boolean
  handleRetryInterpretation?: () => void
  /** "이 리딩 다시 열기" 복원 시 채워짐 — 저장된 followup 대화 turn. */
  initialFollowupTurns?: Array<{ role: 'user' | 'assistant'; content: string }> | null
  /** 복원하는 리딩이 이미 보충 카드를 뽑았는지 — 클래리파이어 버튼 초기 잠금. */
  initialClarifierUsed?: boolean
}

export function ResultsStage(props: ResultsStageProps) {
  const {
    readingResult,
    interpretation,
    selectedColor,
    selectedDeckStyle,
    revealedCards,
    detailedSectionRef,
    language,
    translate,
    userTopic,
    questionAnalysis,
    isGuestUser,
    handleCardReveal,
    canRevealCard,
    isCardRevealed,
    isSaving,
    isSaved,
    saveMessage,
    handleSaveReading,
    handleReset,
    interpretationFailed = false,
    handleRetryInterpretation,
  } = props

  const isKo = language === 'ko'
  const insight = interpretation
  const aiPending = insight?.fallback === true && !interpretationFailed

  // 자동 저장은 page.tsx 의 effect 한 곳에서만 (status==='authenticated' +
  // readingSignature 별 최대 3회 재시도 cap). 여기 있던 중복 effect 는
  // 재시도 cap 이 없어 영구 실패 시 isSaving 토글로 무한 루프 위험 → 제거.
  // 자동 저장이 실패해도 아래 "기록에 저장" 수동 버튼으로 사용자가 만회.
  const hasGuidance =
    insight?.guidance &&
    (Array.isArray(insight.guidance)
      ? insight.guidance.length > 0
      : insight.guidance.trim().length > 0)

  return (
    <div
      className="relative min-h-screen text-slate-100 font-sans"
      style={{
        background: `
          radial-gradient(900px 600px at 20% 0%, rgba(99, 124, 200, 0.08), transparent 60%),
          radial-gradient(800px 600px at 90% 100%, rgba(212, 181, 114, 0.06), transparent 60%),
          var(--ds-dark-bg)
        `,
      }}
    >
      <div className="relative z-10 max-w-3xl mx-auto px-4 md:px-6 py-10 md:py-14 space-y-8">
        {/* ① 질문 */}
        <ResultsHeader
          readingResult={readingResult}
          userTopic={userTopic}
          language={language}
          translate={translate}
          questionAnalysis={questionAnalysis}
        />

        {/* 저장 상태 — 자동 저장이 (모바일 일시 오류 등으로) 실패해도 사용자가
            직접 만회할 수 있게 상태 + 수동 저장 버튼 노출. 로그인 사용자 +
            정상 LLM 해석 도착 후에만. (#1072 자동저장 도입 후 무음 누락 보완) */}
        {!isGuestUser && !aiPending && insight?.overall_message && (
          <div className="flex items-center justify-center">
            {isSaved ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                {isKo ? '기록에 저장됨' : 'Saved to history'}
              </span>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => void handleSaveReading()}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[rgba(212,181,114,0.12)] hover:bg-[rgba(212,181,114,0.2)] border border-[rgba(212,181,114,0.35)] text-[#e8cc8a] text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {isSaving
                    ? isKo
                      ? '저장 중…'
                      : 'Saving…'
                    : isKo
                      ? '기록에 저장'
                      : 'Save to history'}
                </button>
                {(saveMessage.startsWith('저장 실패') ||
                  saveMessage.startsWith('Save failed')) && (
                  <span className="text-[11px] text-rose-300/80 text-center max-w-xs">
                    {saveMessage}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* ② 카드 펼치기 */}
        <HorizontalCardsGrid
          readingResult={readingResult}
          selectedColor={selectedColor}
          selectedDeckStyle={selectedDeckStyle}
          language={language}
          revealedCards={revealedCards}
          onCardReveal={handleCardReveal}
          canRevealCard={canRevealCard}
          isCardRevealed={isCardRevealed}
          translate={translate}
        />

        {/* ③ 전체 해석 — LLM overall_message (스트리밍이면 부분 텍스트 + 타이핑 인디케이터) */}
        {(insight?.overall_message || aiPending) && (
          <section
            className="rounded-2xl p-5 md:p-6 border"
            style={{
              background: 'rgba(17, 24, 39, 0.42)',
              borderColor: 'var(--ds-gold-line)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="w-4 h-4" style={{ color: 'var(--ds-gold-on-dark)' }} />
              <h2
                className="text-sm font-medium tracking-wider uppercase"
                style={{ color: 'var(--ds-gold-on-dark)' }}
              >
                {isKo ? '전체 해석' : 'Overall Reading'}
              </h2>
              {aiPending && insight?.overall_message && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border"
                  style={{
                    background: 'rgba(212, 181, 114, 0.10)',
                    borderColor: 'var(--ds-gold-line)',
                    color: 'var(--ds-gold-on-dark-soft)',
                  }}
                >
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {isKo ? '타이핑 중' : 'typing'}
                </span>
              )}
            </div>
            {insight?.overall_message ? (
              <p className="text-lg md:text-[19px] text-slate-100 leading-relaxed whitespace-pre-wrap">
                {renderWithLastSentenceHighlight(insight.overall_message, !aiPending)}
                {aiPending && (
                  <span
                    className="inline-block w-1.5 h-4 ml-0.5 align-middle animate-pulse"
                    style={{ background: 'var(--ds-gold-on-dark)' }}
                  />
                )}
              </p>
            ) : (
              <WaitingForReadingHint isKo={isKo} active={!!aiPending} />
            )}
          </section>
        )}

        {/* ④ 카드별 해석 — 우리 카드 의미 + LLM 해석 + 실천 팁 */}
        <DetailedCardsSection
          readingResult={readingResult}
          interpretation={interpretation}
          language={language}
          selectedDeckStyle={selectedDeckStyle}
          revealedCards={revealedCards}
          detailedSectionRef={detailedSectionRef}
          translate={translate}
        />

        {interpretationFailed && (
          <div
            className="rounded-2xl bg-rose-500/5 border border-rose-500/30 p-4 md:p-5 flex flex-col sm:flex-row sm:items-center gap-3"
            role="alert"
          >
            <div className="flex items-start gap-3 flex-1">
              <AlertCircle className="w-5 h-5 text-rose-300 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-rose-100">
                  {isKo ? 'AI 해석을 불러오지 못했어요' : "Couldn't load the AI reading"}
                </div>
                <div className="text-xs text-rose-200/70 mt-0.5 leading-snug">
                  {isKo
                    ? '네트워크·크레딧·시간 초과로 잠시 끊겼어요. 카드 기본 의미를 표시 중이에요.'
                    : "Network / credits / timeout briefly interrupted it. Showing each card's base meaning."}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRetryInterpretation}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-100 text-sm font-medium transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {isKo ? '다시 시도' : 'Retry'}
            </button>
          </div>
        )}

        {/* ⑤ 조언과 예측 */}
        {hasGuidance && <GuidanceSection guidance={insight!.guidance!} language={language} />}

        {/* ⑥ SNS 공유 — 결과를 1:1 이미지로 만들어 인스타/카톡에 공유·저장.
            AI 응답이 도착한 후에만 노출(질문+카드+한줄 메시지 카드). */}
        {!aiPending && insight?.overall_message && (
          <ShareTarotButton
            data={buildShareDataFromReading(
              readingResult,
              interpretation,
              userTopic,
              language === 'ko'
            )}
            language={language}
          />
        )}

        {/* ⑦ Follow-up 채팅 — AI 응답이 도착한 후에만 노출 */}
        {!aiPending && insight?.overall_message && (
          <FollowupChat
            readingResult={readingResult}
            interpretation={interpretation}
            userTopic={userTopic}
            language={language}
            readingId={props.readingId ?? null}
            initialFollowupTurns={props.initialFollowupTurns}
            initialClarifierUsed={props.initialClarifierUsed}
          />
        )}

        {/* 자동 저장 도입 후 "저장되었습니다" 토스트 제거 — 별도 표시 없이
            조용히 저장. ActionButtons 도 같은 결로 인디케이터 없음. */}

        <ActionButtons
          language={language}
          isSaved={isSaved}
          isSaving={isSaving}
          onSave={handleSaveReading}
          onReset={handleReset}
        />

        {/* 저장된 리딩은 어디서? — 사용자 동선 회복 */}
        {!isGuestUser && (
          <div className="flex justify-center">
            <Link
              href="/tarot/history"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-sm text-slate-300 hover:text-slate-100 transition-colors"
            >
              <History className="w-4 h-4" />
              {isKo ? '저장된 과거 리딩 보기' : 'View my saved readings'}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
