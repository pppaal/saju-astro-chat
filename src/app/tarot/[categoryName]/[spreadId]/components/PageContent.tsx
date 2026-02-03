import React from 'react'
import LoadingState from './LoadingState'
import ErrorState from './ErrorState'
import { DeckSelectStage, PickingStage, ResultsStage } from './stages'
import type { GameState, ReadingResponse, InterpretationResult } from '../types'
import type { Spread, DeckStyle } from '@/lib/Tarot/tarot.types'
import type { CardColor } from '../constants'
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

  // Results state
  readingResult: ReadingResponse | null
  interpretation: InterpretationResult | null

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

  // i18n
  language: string
  translate: (key: string, fallback: string) => string
}

export function PageContent(props: PageContentProps) {
  const { gameState, spreadInfo, translate, language } = props

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
    return (
      <ErrorState
        title={translate('tarot.reading.invalidAccess', 'Invalid Access')}
        linkText={translate('tarot.reading.backToHome', 'Back to Home')}
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
        language={language}
        handleColorSelect={props.handleColorSelect}
        handleStartReading={props.handleStartReading}
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
