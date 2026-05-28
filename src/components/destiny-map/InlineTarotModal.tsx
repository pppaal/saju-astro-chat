'use client'

import React, { memo, useEffect, useMemo, useRef } from 'react'
import dynamic from 'next/dynamic'
import TarotCard from '@/components/tarot/TarotCard'
import type { Spread } from '@/lib/tarot/tarot.types'
import { splitReadableText } from '@/lib/tarot/splitReadableText'
import styles from './InlineTarotModal.module.css'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useInlineTarotState, useInlineTarotAPI, getTarotTranslations, type LangKey } from './hooks'
import type {
  ReadingResponse,
  InterpretationResult,
} from '@/app/tarot/[categoryName]/[spreadId]/types'

// FollowupChat — 결과 후 "한 장 더 뽑기" + "이 리딩에 대해 더 묻기" 두 기능을
// 같이 제공. 메인 타로 페이지에서 쓰던 컴포넌트 그대로 재사용해 인라인에서도
// 같은 데이터(clarifierCard / followupTurns) 가 히스토리에 저장되도록 한다.
// dynamic — 인라인 모달 자체가 lazy 인데 그 안의 클래리파이어 모달까지
// 이중으로 lazy 로 펴기 위함.
const FollowupChat = dynamic(
  () =>
    import('@/app/tarot/[categoryName]/[spreadId]/components/stages/ResultsStage/FollowupChat').then(
      (m) => m.FollowupChat
    ),
  { ssr: false }
)

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
  // AI question analysis 흐름을 제거했으므로 summary/answer 는 항상 비어 있음.
  // 하위 컴포넌트들은 빈 문자열일 때 렌더를 건너뛰므로 호환됨.
  const questionSummary: string | undefined = undefined
  const directAnswer: string | undefined = undefined

  // API hook
  const api = useInlineTarotAPI({
    stateManager,
    lang,
    profile,
  })

  // Focus trap for accessibility
  const focusTrapRef = useFocusTrap(isOpen)

  // cleanup 핸들러는 ref 로 잡아 effect deps 에서 빼낸다 — `api` 자체가
  // useInlineTarotAPI 에서 매 렌더 새 객체 리터럴로 반환돼 reference 가
  // 불안정. 이 ref 없이 deps 에 `api` 를 그대로 넣으면 effect 가 매 렌더
  // 재실행되며 cleanup 이 매번 발화 → 진행 중인 interpret-stream fetch 를
  // 곧장 abort → AbortError 로 setStep('result') 가 안 불려 크리스탈볼
  // 스피너에서 영원히 멈춤. (메인 타로 페이지가 멀쩡한 이유: 거기는 cleanup
  // 패턴이 다름.)
  const cleanupRef = useRef(api.cleanup)
  useEffect(() => {
    cleanupRef.current = api.cleanup
  }, [api.cleanup])

  // Keyboard handling and body scroll lock — 모달 open/close 전이 시점에만
  // 발화하도록 deps 는 isOpen + onClose 로 한정.
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
      // 모달이 닫히거나 unmount 될 때만 in-flight fetch abort.
      cleanupRef.current?.()
    }
  }, [isOpen, onClose])

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
    // overallMessage 가 아직 비어있는 상태에서 사용자가 "대화 계속하기" 를
    // 눌렀다면 (streaming 끝나기 전 클릭) 부모 채팅에 빈 메시지가 들어가
    // "타로 결과가 안 나옴" 으로 보임. 빈 결과는 push 하지 않고 close 만.
    if (onComplete && state.selectedSpread && state.overallMessage.trim()) {
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
              onConcernChange={actions.setConcern}
              onNext={handleConcernNext}
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
  onConcernChange: (value: string) => void
  onNext: () => void
}

function ConcernStep({ tr, concern, onConcernChange, onNext }: ConcernStepProps) {
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
        <button className={styles.primaryButton} onClick={onNext} disabled={!concern.trim()}>
          {tr.next}
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
                  language={lang === 'ko' ? 'ko' : 'en'}
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
  /**
   * Save 콜백 — 자동 저장 도입 후 manual UI 에선 안 부르지만 prop 으로
   * 받아두기 (parent 가 api.saveReading 을 전달 중이고, 미래에 명시 저장
   * UI 부활 시 재사용). 현재 컴포넌트 안에서는 호출 안 함.
   */
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
  onSave: _onSave,
  onComplete,
  onDeeper,
  onRetryInterpret,
}: ResultStepProps) {
  const {
    concern,
    selectedCategory,
    selectedSpread,
    drawnCards,
    cardInsights,
    overallMessage,
    guidance,
    affirmation,
    readingId,
    // isSaving/isSaved — 자동 저장 통일 후 UI 안 씀. state 객체에 남아있어
    // 다른 곳(있다면)에선 여전히 reactive. 여기선 destructure 안 함.
    interpretFailed,
  } = state
  const isKo = lang === 'ko'

  // FollowupChat 이 요구하는 ReadingResponse / InterpretationResult 형태로
  // 인라인 state 를 매핑. category·spread 그대로 + drawnCards 그대로.
  // overallMessage / cardInsights / guidance 는 snake_case 로 변환.
  const readingResult: ReadingResponse | null = useMemo(() => {
    if (!selectedSpread) return null
    return {
      category: selectedCategory || 'general',
      spread: selectedSpread,
      drawnCards,
      questionContext: null,
    }
  }, [selectedCategory, selectedSpread, drawnCards])

  const interpretation: InterpretationResult | null = useMemo(() => {
    if (!overallMessage && cardInsights.length === 0) return null
    return {
      overall_message: overallMessage,
      card_insights: cardInsights,
      guidance: typeof guidance === 'string' ? guidance : '',
      affirmation: affirmation || '',
      fallback: false,
    }
  }, [overallMessage, cardInsights, guidance, affirmation])

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

      {/* AI interpretation failed — cards show their static meaning, offer retry.
          단독 타로의 동일 alert 와 2줄 위계 (title + subtitle) + 문구 일치. */}
      {interpretFailed && (
        <div className={styles.interpretError} role="alert">
          <div className={styles.interpretErrorBody}>
            <div className={styles.interpretErrorTitle}>
              {isKo ? 'AI 해석을 불러오지 못했어요' : "Couldn't load the AI reading"}
            </div>
            <div className={styles.interpretErrorSubtitle}>
              {isKo
                ? '네트워크·크레딧·시간 초과로 잠시 끊겼어요. 카드 기본 의미를 표시 중이에요.'
                : "Network / credits / timeout briefly interrupted it. Showing each card's base meaning."}
            </div>
          </div>
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
              language={lang === 'ko' ? 'ko' : 'en'}
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

      {/* Draw Again 버튼 — 자동 저장 도입 후 저장 버튼 + 인디케이터 둘
          다 제거. 사용자 액션 자리는 "다시 뽑기" 하나만. */}
      <div className={styles.resultTopActions}>
        <button className={styles.drawAgainButton} onClick={onDrawAgain}>
          {tr.drawAgain}
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

      {/* FollowupChat — 한 장 더 뽑기 + 이 리딩에 대해 더 묻기. 메인 타로
          페이지와 동일 UX. interpretation 정상 결과 도착 후에만 노출 (인라인
          에선 fallback 도 그냥 띄움 — 이미 streaming 끝났을 때만 ResultStep
          렌더되므로 안전).
          readingId 가 채워졌을 때만 활성 (자동 저장 완료) — 안 그러면 PATCH
          가 호출처가 없어 silent skip 으로만 끝남. */}
      {readingResult && overallMessage && !interpretFailed && (
        <div style={{ marginTop: 16 }}>
          <FollowupChat
            readingResult={readingResult}
            interpretation={interpretation}
            userTopic={concern}
            language={lang}
            readingId={readingId}
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className={styles.resultActions}>
        {/* streaming 중엔 onComplete 가 빈 메시지를 부모에 흘려보낼 수 있어
            (= 채팅에 결과가 안 나옴 회귀의 원인) overallMessage 가 들어오기
            전까진 두 버튼 모두 비활성. interpretFailed 면 사용자가 fallback
            상태에서 닫을 수 있게 활성. */}
        <button
          className={styles.secondaryButton}
          onClick={onComplete}
          disabled={!overallMessage && !interpretFailed}
        >
          {tr.continueChat}
        </button>
        <button
          className={styles.primaryButton}
          onClick={onDeeper}
          disabled={!overallMessage && !interpretFailed}
        >
          {tr.deeperReading}
        </button>
      </div>
    </div>
  )
}
