import React from 'react'
import type { Spread } from '@/lib/Tarot/tarot.types'
import type { CardColor } from '../../constants'
import DeckSelector from '../DeckSelector'

export interface DeckSelectStageProps {
  spreadInfo: Spread
  selectedColor: CardColor
  userTopic: string
  language: string
  handleColorSelect: (color: CardColor) => void
  handleStartReading: () => void
}

export function DeckSelectStage({
  spreadInfo,
  selectedColor,
  userTopic,
  language,
  handleColorSelect,
  handleStartReading,
}: DeckSelectStageProps) {
  return (
    <DeckSelector
      spreadInfo={spreadInfo}
      selectedColor={selectedColor}
      userTopic={userTopic}
      language={language}
      onColorSelect={handleColorSelect}
      onStartReading={handleStartReading}
    />
  )
}
