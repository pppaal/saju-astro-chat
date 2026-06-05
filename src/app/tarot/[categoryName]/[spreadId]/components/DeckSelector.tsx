/**
 * Deck Selector Component
 */

'use client'

import Link from 'next/link'
import Image from 'next/image'
import BackButton from '@/components/ui/BackButton'
import CreditBadge from '@/components/ui/CreditBadge'
import { getDeckPreviewImagePath } from '@/lib/tarot/deckPreview'
import { CARD_COLORS } from '../constants'
import type { TarotPersonalizationOptions } from '../hooks/useTarotGame'
import type { Spread } from '@/lib/tarot/tarot.types'
import styles from '../tarot-reading.module.css'

interface DeckSelectorProps {
  spreadInfo: Spread
  selectedColor: (typeof CARD_COLORS)[0]
  userTopic: string
  personalizationOptions: TarotPersonalizationOptions
  language: string
  isGuestUser: boolean
  signInUrl: string
  onColorSelect: (color: (typeof CARD_COLORS)[0]) => void
  onStartReading: () => void
  onPersonalizationChange: (key: keyof TarotPersonalizationOptions, value: boolean) => void
}

export default function DeckSelector({
  spreadInfo,
  selectedColor,
  userTopic,
  personalizationOptions: _personalizationOptions,
  language,
  isGuestUser,
  signInUrl,
  onColorSelect,
  onStartReading,
  onPersonalizationChange: _onPersonalizationChange,
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

          {isGuestUser && (
            <div className={styles.guestTrialBanner}>
              <p className={styles.guestTrialText}>
                {isKo
                  ? '타로 리딩은 로그인 후 이용할 수 있어요. 시작하면 로그인 창이 열립니다.'
                  : 'Tarot readings require sign-in. Starting a reading will open the sign-in window.'}
              </p>
              <Link href={signInUrl} className={styles.guestTrialLink}>
                {isKo ? '지금 로그인' : 'Sign In Now'}
              </Link>
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
                ? `카드 스타일을 고른 뒤, 직관대로 ${effectiveCardCount}장을 선택합니다`
                : `Pick your deck style, then choose ${effectiveCardCount} cards by intuition.`}
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
                    src={getDeckPreviewImagePath(deck.backImage)}
                    alt={deck.name}
                    width={100}
                    height={155}
                    sizes="(max-width: 768px) 80px, 100px"
                    quality={68}
                    className={styles.deckBackImage}
                  />
                </div>
                <span className={styles.deckName}>{isKo ? deck.nameKo : deck.name}</span>
                {selectedColor.id === deck.id && <div className={styles.deckCheckmark}>✓</div>}
              </button>
            ))}
          </div>

          {/* Personalization toggles removed \u2014 user wants pure tarot
              readings, no saju/astrology cross. includeSaju and
              includeAstrology stay on the personalizationOptions
              shape for backward compatibility with persisted local-
              storage but are forced false at the hook level. */}

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
