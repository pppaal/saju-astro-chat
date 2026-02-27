import React from 'react'
import LoadingState from './LoadingState'
import ErrorState from './ErrorState'
import { DeckSelectStage, PickingStage, ResultsStage } from './stages'
import type { GameState, ReadingResponse, InterpretationResult } from '../types'
import type { Spread, DeckStyle } from '@/lib/Tarot/tarot.types'
import type { CardColor } from '../constants'
import type { TarotPersonalizationOptions } from '../hooks/useTarotGame'
import type { TarotDrawError } from '../../../utils/errorHandling'
import '../tarot-reading-mobile.module.css'

export interface PageContentProps {
  // State
  gameState: GameState
  spreadInfo: Spread | null

  // Game state
  selectedColor: CardColor
  selectedDeckStyle: DeckStyle
  selectedIndices: number[]
  selectionOrderMap: Map<number, number>
  revealedCards: number[]
  isSpreading: boolean
  userTopic: string
  personalizationOptions: TarotPersonalizationOptions

  // Results state
  readingResult: ReadingResponse | null
  interpretation: InterpretationResult | null
  drawError: TarotDrawError | null

  // Refs
  detailedSectionRef: React.RefObject<HTMLDivElement | null>
  expandedCard: number | null

  // Saving state
  isSaving: boolean
  isSaved: boolean
  saveMessage: string

  // Handlers
  handleColorSelect: (color: CardColor) => void
  handleStartReading: () => void
  handleCardClick: (index: number) => void
  handleCardReveal: (index: number) => void
  handleRedraw: () => void
  isCardRevealed: (index: number) => boolean
  canRevealCard: (index: number) => boolean
  scrollToDetails: () => void
  toggleCardExpand: (index: number) => void
  handleSaveReading: () => Promise<void>
  handleReset: () => void
  handlePersonalizationChange: (key: keyof TarotPersonalizationOptions, value: boolean) => void

  // i18n
  language: string
  translate: (key: string, fallback: string) => string
}

export function PageContent(props: PageContentProps) {
  const { gameState, spreadInfo, translate, language, drawError } = props

  // Loading state
  if (gameState === 'loading') {
    return (
      <LoadingState
        message={`✨ ${translate('tarot.reading.preparing', 'Preparing your cards...')}`}
      />
    )
  }

  // Error state
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

    const primaryActionHref = drawError?.code === 'credit_exhausted' ? '/pricing' : undefined
    const primaryActionText =
      drawError?.code === 'credit_exhausted'
        ? translate('tarot.reading.buyCredits', '크레딧 충전')
        : undefined

    return (
      <ErrorState
        title={errorTitle}
        description={errorDescription}
        linkText={translate('tarot.reading.backToHome', 'Back to Home')}
        primaryActionHref={primaryActionHref}
        primaryActionText={primaryActionText}
      />
    )
  }

  // Color selection stage
  if (gameState === 'color-select') {
    return (
      <DeckSelectStage
        spreadInfo={spreadInfo}
        selectedColor={props.selectedColor}
        userTopic={props.userTopic}
        personalizationOptions={props.personalizationOptions}
        language={language}
        handleColorSelect={props.handleColorSelect}
        handleStartReading={props.handleStartReading}
        handlePersonalizationChange={props.handlePersonalizationChange}
      />
    )
  }

  // Interpreting stage
  if (gameState === 'interpreting') {
    return (
      <LoadingState
        message={`🔮 ${translate('tarot.reading.interpreting', 'The cards are speaking...')}`}
        submessage={translate('tarot.reading.interpretingDesc', 'Consulting the cosmic wisdom...')}
      />
    )
  }

  // Results stage
  if (gameState === 'results' && props.readingResult) {
    return (
      <ResultsStage
        readingResult={props.readingResult}
        interpretation={props.interpretation}
        selectedColor={props.selectedColor}
        selectedDeckStyle={props.selectedDeckStyle}
        revealedCards={props.revealedCards}
        expandedCard={props.expandedCard}
        detailedSectionRef={props.detailedSectionRef}
        language={language}
        translate={translate}
        userTopic={props.userTopic}
        handleCardReveal={props.handleCardReveal}
        canRevealCard={props.canRevealCard}
        isCardRevealed={props.isCardRevealed}
        scrollToDetails={props.scrollToDetails}
        toggleCardExpand={props.toggleCardExpand}
        isSaving={props.isSaving}
        isSaved={props.isSaved}
        saveMessage={props.saveMessage}
        handleSaveReading={props.handleSaveReading}
        handleReset={props.handleReset}
      />
    )
  }

  // Picking/revealing stage (default)
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
    />
  )
}
