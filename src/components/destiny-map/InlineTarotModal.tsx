'use client'

import React, { memo, useEffect } from 'react'
import TarotCard from '@/components/tarot/TarotCard'
import type { Spread } from '@/lib/tarot/tarot.types'
import { splitReadableText } from '@/lib/tarot/splitReadableText'
import styles from './InlineTarotModal.module.css'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useInlineTarotState, useInlineTarotAPI, getTarotTranslations, type LangKey } from './hooks'

export interface TarotResultSummary {
  question: string
  spreadTitle: string
  cards: Array<{
    name: string
    isReversed: boolean
    position: string
    image: string
  }>
  overallMessage: string
  guidance?: string
  affirmation?: string
}

interface InlineTarotModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete?: (result: TarotResultSummary) => void
  lang?: LangKey
  profile: {
    name?: string
    birthDate?: string
    birthTime?: string
    city?: string
    gender?: string
  }
  initialConcern?: string
}

const InlineTarotModal = memo(function InlineTarotModal({
  isOpen,
  onClose,
  onComplete,
  lang = 'ko',
  profile,
  initialConcern = '',
}: InlineTarotModalProps) {
  const tr = getTarotTranslations(lang)

  // State management hook
  const stateManager = useInlineTarotState({
    isOpen,
    initialConcern,
  })

  const { state, actions, recommendedSpreads } = stateManager
  const questionSummary = state.questionAnalysis?.question_summary?.trim()
  const directAnswer = state.questionAnalysis?.direct_answer?.trim()

  // API hook
  const api = useInlineTarotAPI({
    stateManager,
    lang,
    profile,
  })

  // Focus trap for accessibility
  const focusTrapRef = useFocusTrap(isOpen)

  // Keyboard handling and body scroll lock
  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      api.cleanup()
    }
  }, [isOpen, onClose, api])

  // Handle concern submission (manual select)
  const handleConcernNext = () => {
    if (state.concern.trim()) {
      actions.setStep('spread-select')
    }
  }

  // Handle spread selection
  const handleSpreadSelect = (spread: Spread) => {
    actions.setSelectedSpread(spread)
    actions.setStep('card-draw')
  }

  // Go to full tarot page
  const goToFullTarot = () => {
    const tarotContext = {
      profile,
      concern: state.concern,
      fromCounselor: true,
      timestamp: Date.now(),
    }
    sessionStorage.setItem('tarotContext', JSON.stringify(tarotContext))
    window.location.href = `/tarot?from=counselor`
  }

  // Handle completion
  const handleComplete = () => {
    if (onComplete && state.selectedSpread) {
      onComplete({
        question: state.concern,
        spreadTitle:
          lang === 'ko'
            ? state.selectedSpread.titleKo || state.selectedSpread.title
            : state.selectedSpread.title,
        cards: state.drawnCards.map((dc, idx) => ({
          name: lang === 'ko' ? dc.card.nameKo || dc.card.name : dc.card.name,
          isReversed: dc.isReversed,
          position:
            lang === 'ko'
              ? state.selectedSpread!.positions[idx]?.titleKo ||
                state.selectedSpread!.positions[idx]?.title
              : state.selectedSpread!.positions[idx]?.title,
          image: dc.card.image,
        })),
        overallMessage: state.overallMessage,
        guidance: state.guidance || undefined,
        affirmation: state.affirmation || undefined,
      })
    }
    onClose()
  }

  if (!isOpen) {
    return null
  }

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tarot-modal-title"
    >
      <div ref={focusTrapRef} className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2 id="tarot-modal-title" className={styles.title}>
            🃏 {tr.title}
          </h2>
          <button className={styles.closeButton} onClick={onClose} aria-label={tr.close}>
            ✕
          </button>
        </div>

        {/* Step indicator */}
        <div className={styles.stepIndicator}>
          {['concern', 'spread-select', 'card-draw', 'result'].map((s, i) => (
            <div
              key={s}
              className={`${styles.stepDot} ${
                state.step === s || (state.step === 'interpreting' && s === 'result')
                  ? styles.active
                  : ''
              } ${
                ['concern', 'spread-select', 'card-draw', 'interpreting', 'result'].indexOf(
                  state.step
                ) > i
                  ? styles.completed
                  : ''
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Step 1: Concern Input */}
          {state.step === 'concern' && (
            <ConcernStep
              tr={tr}
              concern={state.concern}
              isAnalyzing={state.isAnalyzing}
              onConcernChange={actions.setConcern}
              onNext={handleConcernNext}
              onAutoSelect={api.analyzeQuestion}
            />
          )}

          {/* Step 2: Spread Selection */}
          {state.step === 'spread-select' && (
            <SpreadSelectStep
              tr={tr}
              lang={lang}
              concern={state.concern}
              questionSummary={questionSummary}
              directAnswer={directAnswer}
              recommendedSpreads={recommendedSpreads}
              onSelect={handleSpreadSelect}
            />
          )}

          {/* Step 3: Card Draw */}
          {state.step === 'card-draw' && (
            <CardDrawStep
              tr={tr}
              lang={lang}
              selectedSpread={state.selectedSpread}
              aiReason={state.aiReason}
              questionSummary={questionSummary}
              directAnswer={directAnswer}
              drawnCards={state.drawnCards}
              revealedCount={state.revealedCount}
              isDrawing={state.isDrawing}
              onDraw={api.drawCards}
            />
          )}

          {/* Step 4: Interpreting */}
          {state.step === 'interpreting' && (
            <InterpretingStep
              tr={tr}
              overallMessage={state.overallMessage}
              lang={lang}
              onRetry={api.retryInterpretation}
            />
          )}

          {/* Step 5: Result */}
          {state.step === 'result' && (
            <ResultStep
              tr={tr}
              lang={lang}
              state={state}
              questionSummary={questionSummary}
              directAnswer={directAnswer}
              onDrawAgain={actions.resetForDrawAgain}
              onSave={api.saveReading}
              onComplete={handleComplete}
              onDeeper={goToFullTarot}
              onRetryInterpret={api.retryInterpretation}
            />
          )}
        </div>
      </div>
    </div>
  )
})

export default InlineTarotModal

// ─────────────────────────────────────────────────────
// Sub-components for each step
// ─────────────────────────────────────────────────────

interface ConcernStepProps {
  tr: ReturnType<typeof getTarotTranslations>
  concern: string
  isAnalyzing: boolean
  onConcernChange: (value: string) => void
  onNext: () => void
  onAutoSelect: () => void
}

function ConcernStep({
  tr,
  concern,
  isAnalyzing,
  onConcernChange,
  onNext,
  onAutoSelect,
}: ConcernStepProps) {
  return (
    <div className={styles.stepContent}>
      <h3 className={styles.stepTitle}>{tr.concernTitle}</h3>
      <textarea
        className={styles.concernInput}
        value={concern}
        onChange={(e) => onConcernChange(e.target.value)}
        placeholder={tr.concernPlaceholder}
        rows={3}
        autoFocus
      />
      <p className={styles.hint}>{tr.concernHint}</p>
      <div className={styles.concernButtons}>
        <button
          className={styles.secondaryButton}
          onClick={onNext}
          disabled={!concern.trim() || isAnalyzing}
        >
          {tr.next}
        </button>
        <button
          className={styles.primaryButton}
          onClick={onAutoSelect}
          disabled={!concern.trim() || isAnalyzing}
        >
          {isAnalyzing ? tr.analyzing : tr.autoSelect}
        </button>
      </div>
    </div>
  )
}

interface SpreadSelectStepProps {
  tr: ReturnType<typeof getTarotTranslations>
  lang: LangKey
  concern: string
  questionSummary?: string
  directAnswer?: string
  recommendedSpreads: Spread[]
  onSelect: (spread: Spread) => void
}

function SpreadSelectStep({
  tr,
  lang,
  concern,
  questionSummary,
  directAnswer,
  recommendedSpreads,
  onSelect,
}: SpreadSelectStepProps) {
  return (
    <div className={styles.stepContent}>
      <h3 className={styles.stepTitle}>{tr.spreadTitle}</h3>
      {(concern || directAnswer || questionSummary) && (
        <div className={styles.concernDisplay}>
          {concern && (
            <>
              <span className={styles.concernLabel}>Q.</span>
              <span className={styles.concernText}>{concern}</span>
            </>
          )}
          {directAnswer && <p className={styles.aiReasonText}>{directAnswer}</p>}
          {questionSummary && <p className={styles.hint}>{questionSummary}</p>}
        </div>
      )}
      <div className={styles.spreadGrid}>
        {recommendedSpreads.map((spread) => (
          <button key={spread.id} className={styles.spreadCard} onClick={() => onSelect(spread)}>
            <div className={styles.spreadCardCount}>
              {spread.cardCount} {tr.cards}
            </div>
            <h4 className={styles.spreadTitle}>
              {lang === 'ko' ? spread.titleKo || spread.title : spread.title}
            </h4>
            <p className={styles.spreadDesc}>
              {lang === 'ko' ? spread.descriptionKo || spread.description : spread.description}
            </p>
            <div className={styles.spreadTip}>
              {spread.cardCount === 1
                ? `💡 ${tr.quickTip}`
                : spread.cardCount <= 3
                  ? `⏳ ${tr.normalTip}`
                  : `🔮 ${tr.deepTip}`}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

interface CardDrawStepProps {
  tr: ReturnType<typeof getTarotTranslations>
  lang: LangKey
  selectedSpread: Spread | null
  aiReason: string
  questionSummary?: string
  directAnswer?: string
  drawnCards: Array<{
    card: {
      name: string
      nameKo?: string
      image: string
      upright: { keywords: string[]; keywordsKo?: string[] }
      reversed: { keywords: string[]; keywordsKo?: string[] }
    }
    isReversed: boolean
  }>
  revealedCount: number
  isDrawing: boolean
  onDraw: () => void
}

function CardDrawStep({
  tr,
  lang,
  selectedSpread,
  aiReason,
  questionSummary,
  directAnswer,
  drawnCards,
  revealedCount,
  isDrawing,
  onDraw,
}: CardDrawStepProps) {
  return (
    <div className={styles.stepContent}>
      <h3 className={styles.stepTitle}>
        {lang === 'ko' ? selectedSpread?.titleKo || selectedSpread?.title : selectedSpread?.title}
      </h3>

      {directAnswer && (
        <p className={styles.resultText}>
          <strong>{lang === 'ko' ? '핵심 답변:' : 'Direct answer:'}</strong> {directAnswer}
        </p>
      )}
      {questionSummary && <p className={styles.hint}>{questionSummary}</p>}

      {aiReason && <p className={styles.aiReasonText}>✨ {aiReason}</p>}

      {drawnCards.length === 0 ? (
        <div className={styles.drawArea}>
          <div className={styles.deckStack}>
            <div className={styles.deckCard} />
            <div className={styles.deckCard} />
            <div className={styles.deckCard} />
          </div>
          <button className={styles.drawButton} onClick={onDraw} disabled={isDrawing}>
            {isDrawing ? tr.drawing : tr.drawCards}
          </button>
        </div>
      ) : (
        <div className={styles.drawnCardsGrid}>
          {drawnCards.map((dc, idx) => (
            <div
              key={idx}
              className={`${styles.cardWrapper} ${idx < revealedCount ? styles.revealed : ''}`}
            >
              {idx < revealedCount ? (
                <TarotCard
                  name={lang === 'ko' ? dc.card.nameKo || dc.card.name : dc.card.name}
                  image={dc.card.image}
                  isReversed={dc.isReversed}
                  position={
                    lang === 'ko'
                      ? selectedSpread?.positions[idx]?.titleKo ||
                        selectedSpread?.positions[idx]?.title
                      : selectedSpread?.positions[idx]?.title
                  }
                  keywords={
                    dc.isReversed
                      ? lang === 'ko'
                        ? dc.card.reversed.keywordsKo || dc.card.reversed.keywords
                        : dc.card.reversed.keywords
                      : lang === 'ko'
                        ? dc.card.upright.keywordsKo || dc.card.upright.keywords
                        : dc.card.upright.keywords
                  }
                  size="small"
                  expandable={false}
                  interactive={false}
                />
              ) : (
                <div className={styles.cardBack}>
                  <span>🃏</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface InterpretingStepProps {
  tr: ReturnType<typeof getTarotTranslations>
  overallMessage: string
  lang: LangKey
  onRetry: () => void
}

function InterpretingStep({ tr, overallMessage, lang, onRetry }: InterpretingStepProps) {
  const isKo = lang === 'ko'
  // 진짜 hang(첫 토큰조차 안 오는 케이스)에만 slow UI 띄운다. progressive
  // 스트리밍으로 텍스트가 흐르고 있으면 사용자는 진행 중인 걸 눈으로 보니까
  // 'slow' 메시지가 오히려 혼란을 줌 → overallMessage 비어있을 때만 노출.
  // 임계치도 12s → 20s 로 상향 (Claude 첫 토큰 latency 변동성 흡수).
  const [slow, setSlow] = React.useState(false)
  useEffect(() => {
    const id = setTimeout(() => setSlow(true), 20000)
    return () => clearTimeout(id)
  }, [])
  const showSlow = slow && !overallMessage

  return (
    <div className={styles.stepContent}>
      <div className={styles.interpretingLoader}>
        <div className={styles.crystalBall}>
          <div className={styles.innerGlow} />
        </div>
        <p className={styles.interpretingText}>{tr.interpreting}</p>
        {overallMessage && (
          <div className={styles.streamingPreview}>
            <p>{overallMessage}</p>
          </div>
        )}
        {showSlow && (
          <div
            style={{
              marginTop: 18,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <p style={{ fontSize: '0.95rem', color: '#78716c', margin: 0 }}>
              {isKo ? '예상보다 오래 걸리고 있어요.' : 'This is taking longer than expected.'}
            </p>
            <button type="button" onClick={onRetry} className={styles.drawAgainButton}>
              {isKo ? '다시 시도' : 'Try again'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

interface ResultStepProps {
  tr: ReturnType<typeof getTarotTranslations>
  lang: LangKey
  state: ReturnType<typeof useInlineTarotState>['state']
  questionSummary?: string
  directAnswer?: string
  onDrawAgain: () => void
  onSave: () => void
  onComplete: () => void
  onDeeper: () => void
  onRetryInterpret: () => void
}

function ResultStep({
  tr,
  lang,
  state,
  questionSummary,
  directAnswer,
  onDrawAgain,
  onSave,
  onComplete,
  onDeeper,
  onRetryInterpret,
}: ResultStepProps) {
  const {
    concern,
    selectedSpread,
    drawnCards,
    cardInsights,
    overallMessage,
    guidance,
    affirmation,
    isSaving,
    isSaved,
    interpretFailed,
  } = state
  const isKo = lang === 'ko'

  return (
    <div className={styles.stepContent}>
      {/* Current Concern Display */}
      {concern && (
        <div className={styles.concernDisplay}>
          <span className={styles.concernLabel}>Q. {tr.yourConcern}:</span>
          <span className={styles.concernText}>{concern}</span>
        </div>
      )}

      {(directAnswer || questionSummary) && (
        <div className={styles.resultSection}>
          {directAnswer && (
            <p className={styles.resultText}>
              <strong>{lang === 'ko' ? '핵심 답변:' : 'Direct answer:'}</strong> {directAnswer}
            </p>
          )}
          {questionSummary && <p className={styles.resultText}>{questionSummary}</p>}
        </div>
      )}

      {/* AI interpretation failed — cards show their static meaning, offer retry. */}
      {interpretFailed && (
        <div className={styles.interpretError} role="alert">
          <span className={styles.interpretErrorText}>
            {isKo
              ? 'AI 해석을 불러오지 못했어요. (네트워크·크레딧·시간 초과) 카드 기본 의미를 표시 중이에요.'
              : "Couldn't load the AI reading (network/credits/timeout). Showing each card's base meaning."}
          </span>
          <button type="button" className={styles.retryButton} onClick={onRetryInterpret}>
            {isKo ? '다시 시도' : 'Retry'}
          </button>
        </div>
      )}

      {/* Cards Display */}
      <div className={styles.resultCardsRow}>
        {drawnCards.map((dc, idx) => (
          <div key={idx} className={styles.resultCardWrapper}>
            <TarotCard
              name={lang === 'ko' ? dc.card.nameKo || dc.card.name : dc.card.name}
              image={dc.card.image}
              isReversed={dc.isReversed}
              position={
                // 자리명은 메인 타로와 동일하게 LLM 이 명명한 cardInsights[idx].position
                // 을 우선 사용. 동적 스프레드는 selectedSpread.positions 가 비어 있어
                // 폴백만으론 라벨이 빈다.
                cardInsights[idx]?.position ||
                (lang === 'ko'
                  ? selectedSpread?.positions[idx]?.titleKo || selectedSpread?.positions[idx]?.title
                  : selectedSpread?.positions[idx]?.title)
              }
              keywords={
                dc.isReversed
                  ? lang === 'ko'
                    ? dc.card.reversed.keywordsKo || dc.card.reversed.keywords
                    : dc.card.reversed.keywords
                  : lang === 'ko'
                    ? dc.card.upright.keywordsKo || dc.card.upright.keywords
                    : dc.card.upright.keywords
              }
              meaning={cardInsights[idx]?.interpretation}
              size="medium"
              expandable={true}
              interactive={true}
              priority={idx < 3}
            />
          </div>
        ))}
      </div>

      {/* Draw Again & Save Buttons */}
      <div className={styles.resultTopActions}>
        <button className={styles.drawAgainButton} onClick={onDrawAgain}>
          {tr.drawAgain}
        </button>
        <button
          className={`${styles.saveButton} ${isSaved ? styles.saved : ''}`}
          onClick={onSave}
          disabled={isSaving || isSaved}
        >
          {isSaving ? '...' : isSaved ? tr.saved : tr.save}
        </button>
      </div>

      {/* Overall Message — split into readable paragraphs to match the main
          tarot counselor's format (was one plain wall-of-text block). */}
      {overallMessage && (
        <div className={styles.resultSection}>
          <h4 className={styles.resultSectionTitle}>✨ {tr.overallMessage}</h4>
          <div className={styles.resultTextGroup}>
            {splitReadableText(overallMessage).map((para, i) => (
              <p key={i} className={styles.resultText}>
                {para}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Guidance */}
      {guidance && (
        <div className={styles.resultSection}>
          <h4 className={styles.resultSectionTitle}>💫 {tr.guidance}</h4>
          <div className={styles.resultTextGroup}>
            {splitReadableText(guidance).map((para, i) => (
              <p key={i} className={styles.resultText}>
                {para}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Affirmation */}
      {affirmation && (
        <div className={styles.affirmationBox}>
          <span className={styles.affirmationIcon}>🌟</span>
          <p className={styles.affirmationText}>{affirmation}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className={styles.resultActions}>
        <button className={styles.secondaryButton} onClick={onComplete}>
          {tr.continueChat}
        </button>
        <button className={styles.primaryButton} onClick={onDeeper}>
          {tr.deeperReading}
        </button>
      </div>
    </div>
  )
}
