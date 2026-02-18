/**
 * Deck Selector Component
 */

'use client'

import Image from 'next/image'
import BackButton from '@/components/ui/BackButton'
import CreditBadge from '@/components/ui/CreditBadge'
import { CARD_COLORS } from '../hooks/useTarotState'
import type { TarotPersonalizationOptions } from '../hooks/useTarotGame'
import type { Spread } from '@/lib/Tarot/tarot.types'
import styles from '../tarot-reading.module.css'

interface DeckSelectorProps {
  spreadInfo: Spread
  selectedColor: (typeof CARD_COLORS)[0]
  userTopic: string
  personalizationOptions: TarotPersonalizationOptions
  language: string
  onColorSelect: (color: (typeof CARD_COLORS)[0]) => void
  onStartReading: () => void
  onPersonalizationChange: (key: keyof TarotPersonalizationOptions, value: boolean) => void
}

export default function DeckSelector({
  spreadInfo,
  selectedColor,
  userTopic,
  personalizationOptions,
  language,
  onColorSelect,
  onStartReading,
  onPersonalizationChange,
}: DeckSelectorProps) {
  const effectiveCardCount = spreadInfo?.cardCount || 3
  const isKo = language === 'ko'

  return (
    <div className={styles.deckSelectPage}>
      <div className={styles.backButtonWrapper}>
        <BackButton />
      </div>
      <div className={styles.creditBadgeWrapper}>
        <CreditBadge variant="compact" />
      </div>

      <main className={styles.deckSelectMain}>
        <div className={styles.deckSelectContent}>
          {userTopic && (
            <div className={styles.userQuestionBanner}>
              <span className={styles.questionQuote}>&quot;</span>
              <p className={styles.userQuestionText}>{userTopic}</p>
              <span className={styles.questionQuote}>&quot;</span>
            </div>
          )}

          <div className={styles.deckSelectHeader}>
            <div className={styles.spreadInfoBadge}>
              <span className={styles.spreadIcon}>🃏</span>
              <span className={styles.spreadName}>
                {isKo ? spreadInfo.titleKo || spreadInfo.title : spreadInfo.title}
              </span>
              <span className={styles.spreadCardCount}>
                {effectiveCardCount}
                {isKo ? '\uC7A5' : ' cards'}
              </span>
            </div>
            <h1 className={styles.deckSelectTitle}>
              {isKo ? '\uB371 \uC2A4\uD0C0\uC77C \uC120\uD0DD' : 'Choose Your Deck'}
            </h1>
            <p className={styles.deckSelectSubtitle}>
              {isKo
                ? '\uB9C8\uC74C\uC5D0 \uB4DC\uB294 \uCE74\uB4DC \uB4B7\uBA74\uC744 \uC120\uD0DD\uD558\uC138\uC694'
                : 'Select the card back that resonates with you'}
            </p>
          </div>

          <div className={styles.deckGrid}>
            {CARD_COLORS.map((deck) => (
              <button
                key={deck.id}
                className={`${styles.deckOption} ${
                  selectedColor.id === deck.id ? styles.deckSelected : ''
                }`}
                onClick={() => onColorSelect(deck)}
              >
                <div className={styles.deckCardPreview}>
                  <Image
                    src={deck.backImage}
                    alt={deck.name}
                    width={100}
                    height={155}
                    className={styles.deckBackImage}
                  />
                </div>
                <span className={styles.deckName}>{isKo ? deck.nameKo : deck.name}</span>
                {selectedColor.id === deck.id && <div className={styles.deckCheckmark}>✓</div>}
              </button>
            ))}
          </div>

          <section
            className={styles.personalizationSection}
            data-testid="tarot-personalization-controls"
          >
            <h2 className={styles.personalizationTitle}>
              {isKo ? '\uD574\uC11D \uAC1C\uC778\uD654 \uC124\uC815' : 'Personalization'}
            </h2>
            <label className={styles.toggleRow} htmlFor="tarot-toggle-saju">
              <span className={styles.toggleLabelMain}>
                {isKo ? '\uC0AC\uC8FC \uBC18\uC601' : 'Include Saju'}
              </span>
              <input
                id="tarot-toggle-saju"
                data-testid="tarot-toggle-saju"
                type="checkbox"
                checked={personalizationOptions.includeSaju}
                onChange={(event) =>
                  onPersonalizationChange('includeSaju', event.currentTarget.checked)
                }
              />
            </label>
            <label className={styles.toggleRow} htmlFor="tarot-toggle-astrology">
              <span className={styles.toggleLabelMain}>
                {isKo ? '\uC810\uC131 \uBC18\uC601' : 'Include Astrology'}
              </span>
              <input
                id="tarot-toggle-astrology"
                data-testid="tarot-toggle-astrology"
                type="checkbox"
                checked={personalizationOptions.includeAstrology}
                onChange={(event) =>
                  onPersonalizationChange('includeAstrology', event.currentTarget.checked)
                }
              />
            </label>
          </section>

          <button
            className={styles.startReadingButton}
            onClick={onStartReading}
            data-testid="tarot-start-reading"
          >
            {isKo ? '\uCE74\uB4DC \uBF51\uAE30' : 'Draw Cards'} →
          </button>
        </div>
      </main>
    </div>
  )
}
