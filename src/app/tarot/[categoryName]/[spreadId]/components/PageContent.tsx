import React from 'react'
import LoadingState from './LoadingState'
import ErrorState from './ErrorState'
import { DeckSelectStage, PickingStage, ResultsStage } from './stages'
import type { GameState, ReadingResponse, InterpretationResult } from '../types'
import type { Spread, DeckStyle } from '@/lib/tarot/tarot.types'
import type { TarotQuestionAnalysisSnapshot } from '@/lib/tarot/questionFlow'
import type { CardColor } from '../constants'
import type { TarotPersonalizationOptions } from '../hooks/useTarotGame'
import type { TarotDrawError } from '../../../utils/errorHandling'
import '../tarot-reading-mobile.module.css'

export interface PageContentProps {
  gameState: GameState
  spreadInfo: Spread | null
  selectedColor: CardColor
  selectedDeckStyle: DeckStyle
  selectedIndices: number[]
  selectionOrderMap: Map<number, number>
  revealedCards: number[]
  isSpreading: boolean
  userTopic: string
  questionAnalysis: TarotQuestionAnalysisSnapshot | null
  personalizationOptions: TarotPersonalizationOptions
  readingResult: ReadingResponse | null
  interpretation: InterpretationResult | null
  drawError: TarotDrawError | null
  detailedSectionRef: React.RefObject<HTMLDivElement | null>
  isSaving: boolean
  isSaved: boolean
  saveMessage: string
  /** 자동 저장 후 부여된 서버 readingId — followup / 클래리파이어 PATCH 에 사용. */
  readingId?: string | null
  isGuestUser: boolean
  signInUrl: string
  handleColorSelect: (color: CardColor) => void
  handleStartReading: () => void
  handleCardClick: (index: number) => void
  handleCardReveal: (index: number) => void
  handleRedraw: () => void
  handleRetryDraw: () => void
  isCardRevealed: (index: number) => boolean
  canRevealCard: (index: number) => boolean
  handleSaveReading: () => Promise<void>
  handleReset: () => void
  handlePersonalizationChange: (key: keyof TarotPersonalizationOptions, value: boolean) => void
  interpretationFailed?: boolean
  handleRetryInterpretation?: () => void
  language: string
  translate: (key: string, fallback: string) => string
  /** "이 리딩 다시 열기" 복원 시 채워짐 — 저장된 followup 대화 turn. */
  initialFollowupTurns?: Array<{ role: 'user' | 'assistant'; content: string }> | null
  /** 복원하는 리딩이 이미 보충 카드를 뽑았는지 — 클래리파이어 버튼 초기 잠금. */
  initialClarifierUsed?: boolean
}

export function PageContent(props: PageContentProps) {
  const { gameState, spreadInfo, translate, language, drawError } = props

  if (gameState === 'loading') {
    return (
      <LoadingState
        message={`✨ ${translate('tarot.reading.preparing', 'Preparing your cards...')}`}
      />
    )
  }

  if (gameState === 'error' || !spreadInfo) {
    const errorTitle =
      drawError?.code === 'credit_exhausted'
        ? translate('tarot.reading.creditExhaustedTitle', '크레딧이 부족합니다')
        : drawError?.code === 'auth_failed'
          ? translate('tarot.reading.authFailedTitle', '인증이 필요합니다')
          : translate('tarot.reading.invalidAccess', 'Invalid Access')

    const errorDescription =
      drawError?.code === 'credit_exhausted'
        ? translate(
            'tarot.reading.creditExhaustedDesc',
            '카드 리딩 크레딧이 부족합니다. 충전 후 다시 시도해 주세요.'
          )
        : drawError?.code === 'auth_failed'
          ? translate(
              'tarot.reading.authFailedDesc',
              '로그인 또는 인증 상태를 확인한 후 다시 시도해 주세요.'
            )
          : drawError?.message || undefined

    const primaryActionHref =
      drawError?.code === 'credit_exhausted'
        ? '/pricing'
        : drawError?.code === 'auth_failed'
          ? props.signInUrl
          : undefined

    const primaryActionText =
      drawError?.code === 'credit_exhausted'
        ? translate('tarot.reading.buyCredits', '크레딧 충전')
        : drawError?.code === 'auth_failed'
          ? translate('auth.signIn', '로그인')
          : undefined

    // 일시적(네트워크/서버) 드로우 실패에만 같은 화면 재시도 노출. 크레딧/
    // 인증 에러는 재시도해도 또 실패하므로 각자의 액션(충전/로그인)만.
    // spreadInfo 자체가 없는(잘못된 접근) 경우도 재시도 대상 아님.
    const canRetryDraw =
      gameState === 'error' &&
      !!spreadInfo &&
      drawError != null &&
      drawError.code !== 'credit_exhausted' &&
      drawError.code !== 'auth_failed'

    return (
      <ErrorState
        title={errorTitle}
        description={errorDescription}
        linkText={translate('tarot.reading.backToHome', 'Back to Home')}
        primaryActionHref={primaryActionHref}
        primaryActionText={primaryActionText}
        onRetry={canRetryDraw ? props.handleRetryDraw : undefined}
        retryText={translate('tarot.reading.retry', '다시 시도')}
      />
    )
  }

  if (gameState === 'color-select') {
    return (
      <DeckSelectStage
        spreadInfo={spreadInfo}
        selectedColor={props.selectedColor}
        userTopic={props.userTopic}
        personalizationOptions={props.personalizationOptions}
        language={language}
        isGuestUser={props.isGuestUser}
        signInUrl={props.signInUrl}
        handleColorSelect={props.handleColorSelect}
        handleStartReading={props.handleStartReading}
        handlePersonalizationChange={props.handlePersonalizationChange}
      />
    )
  }

  if (gameState === 'revealing') {
    return (
      <LoadingState
        message={`🔮 ${translate('tarot.reading.drawing', '카드를 펼치는 중...')}`}
        submessage={translate('tarot.reading.drawingDesc', '선택하신 카드를 읽고 있어요...')}
      />
    )
  }

  if (gameState === 'interpreting') {
    return (
      <LoadingState
        message={`🔮 ${translate('tarot.reading.interpreting', 'The cards are speaking...')}`}
        submessage={translate('tarot.reading.interpretingDesc', 'Consulting the cosmic wisdom...')}
      />
    )
  }

  if (gameState === 'results' && props.readingResult) {
    return (
      <ResultsStage
        readingResult={props.readingResult}
        interpretation={props.interpretation}
        selectedColor={props.selectedColor}
        selectedDeckStyle={props.selectedDeckStyle}
        revealedCards={props.revealedCards}
        detailedSectionRef={props.detailedSectionRef}
        language={language}
        translate={translate}
        userTopic={props.userTopic}
        questionAnalysis={props.questionAnalysis}
        isGuestUser={props.isGuestUser}
        signInUrl={props.signInUrl}
        handleCardReveal={props.handleCardReveal}
        canRevealCard={props.canRevealCard}
        isCardRevealed={props.isCardRevealed}
        isSaving={props.isSaving}
        isSaved={props.isSaved}
        saveMessage={props.saveMessage}
        readingId={props.readingId ?? null}
        handleSaveReading={props.handleSaveReading}
        handleReset={props.handleReset}
        interpretationFailed={props.interpretationFailed}
        handleRetryInterpretation={props.handleRetryInterpretation}
        initialFollowupTurns={props.initialFollowupTurns}
        initialClarifierUsed={props.initialClarifierUsed}
      />
    )
  }

  return (
    <PickingStage
      language={language}
      spreadInfo={spreadInfo}
      selectedColor={props.selectedColor}
      selectedIndices={props.selectedIndices}
      selectionOrderMap={props.selectionOrderMap}
      gameState={gameState}
      isSpreading={props.isSpreading}
      handleCardClick={props.handleCardClick}
      handleRedraw={props.handleRedraw}
      userTopic={props.userTopic}
    />
  )
}
