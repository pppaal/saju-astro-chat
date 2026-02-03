import React from 'react'
import type { Spread } from '@/lib/Tarot/tarot.types'
import type { CardColor } from '../../constants'
import type { GameState } from '../../types'
import { CardPickingScreen } from '@/components/tarot/CardPickingScreen'

export interface PickingStageProps {
  language: string
  spreadInfo: Spread
  selectedColor: CardColor
  selectedIndices: number[]
  selectionOrderMap: Map<number, number>
  gameState: GameState
  isSpreading: boolean
  handleCardClick: (index: number) => void
  handleRedraw: () => void
}

export function PickingStage({
  language,
  spreadInfo,
  selectedColor,
  selectedIndices,
  selectionOrderMap,
  gameState,
  isSpreading,
  handleCardClick,
  handleRedraw,
}: PickingStageProps) {
  return (
    <CardPickingScreen
      locale={language}
      spreadInfo={spreadInfo}
      selectedColor={selectedColor}
      selectedIndices={selectedIndices}
      selectionOrderMap={selectionOrderMap}
      gameState={gameState}
      isSpreading={isSpreading}
      onCardClick={handleCardClick}
      onRedraw={handleRedraw}
    />
  )
}
