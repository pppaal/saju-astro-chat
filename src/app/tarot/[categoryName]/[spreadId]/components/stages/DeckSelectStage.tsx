import React from 'react'
import type { Spread } from '@/lib/Tarot/tarot.types'
import type { CardColor } from '../../constants'
import type { TarotPersonalizationOptions } from '../../hooks/useTarotGame'
import DeckSelector from '../DeckSelector'

export interface DeckSelectStageProps {
  spreadInfo: Spread
  selectedColor: CardColor
  userTopic: string
  personalizationOptions: TarotPersonalizationOptions
  language: string
  isGuestUser: boolean
  signInUrl: string
  handleColorSelect: (color: CardColor) => void
  handleStartReading: () => void
  handlePersonalizationChange: (key: keyof TarotPersonalizationOptions, value: boolean) => void
}

export function DeckSelectStage({
  spreadInfo,
  selectedColor,
  userTopic,
  personalizationOptions,
  language,
  isGuestUser,
  signInUrl,
  handleColorSelect,
  handleStartReading,
  handlePersonalizationChange,
}: DeckSelectStageProps) {
  return (
    <DeckSelector
      spreadInfo={spreadInfo}
      selectedColor={selectedColor}
      userTopic={userTopic}
      personalizationOptions={personalizationOptions}
      language={language}
      isGuestUser={isGuestUser}
      signInUrl={signInUrl}
      onColorSelect={handleColorSelect}
      onStartReading={handleStartReading}
      onPersonalizationChange={handlePersonalizationChange}
    />
  )
}
