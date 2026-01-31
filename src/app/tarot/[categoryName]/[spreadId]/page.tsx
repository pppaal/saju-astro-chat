'use client'

import React, { Suspense, useEffect, useCallback, useRef, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { useI18n } from '@/i18n/I18nProvider'
import BackButton from '@/components/ui/BackButton'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import { getCardImagePath } from '@/lib/Tarot/tarot.types'
import { buildSignInUrl } from '@/lib/auth/signInUrl'
import AuthGate from '@/components/auth/AuthGate'
import { CardPickingScreen } from '@/components/tarot/CardPickingScreen'
import styles from './tarot-reading.module.css'

// Local imports
import { useTarotGame, useTarotInterpretation } from './hooks'
import { CARD_COLORS } from './constants'
import { smoothScrollTo } from './utils'

const PersonalityInsight = dynamic(() => import('@/components/personality/PersonalityInsight'), {
  ssr: false,
})

export default function TarotReadingPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className={styles.loading}>
          <div className={styles.loadingOrb}></div>
          <p>✨ Loading...</p>
        </div>
      }
    >
      <TarotReadingPage />
    </Suspense>
  )
}

function TarotReadingPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const { translate, language } = useI18n()
  const categoryName = params?.categoryName as string | undefined
  const spreadId = params?.spreadId as string | undefined
  const search = searchParams?.toString()
  const basePath = categoryName && spreadId ? `/tarot/${categoryName}/${spreadId}` : '/tarot'
  const callbackUrl = search ? `${basePath}?${search}` : basePath
  const signInUrl = buildSignInUrl(callbackUrl)
  const detailedSectionRef = useRef<HTMLDivElement>(null)
  const [expandedCard, setExpandedCard] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Custom hooks
  const {
    gameState,
    spreadInfo,
    selectedDeckStyle,
    selectedColor,
    selectedIndices,
    selectionOrderMap,
    readingResult,
    interpretation,
    revealedCards,
    isSpreading,
    userTopic,
    setInterpretation,
    handleColorSelect,
    handleStartReading,
    handleCardClick,
    handleCardReveal: baseHandleCardReveal,
    handleRedraw,
    isCardRevealed,
    canRevealCard,
  } = useTarotGame()

  const {
    isSaved,
    saveMessage,
    fetchInterpretation,
    handleSaveReading: baseSaveReading,
  } = useTarotInterpretation({
    categoryName,
    spreadId,
    userTopic,
    selectedDeckStyle,
  })

  // Fetch interpretation when reading result is available
  useEffect(() => {
    if (readingResult && interpretation?.fallback) {
      fetchInterpretation(readingResult).then((result) => {
        if (result) {
          setInterpretation(result)
        }
      })
    }
  }, [readingResult, interpretation?.fallback, fetchInterpretation, setInterpretation])

  // Card reveal with auto-scroll
  const handleCardReveal = useCallback(
    (index: number) => {
      baseHandleCardReveal(index)
      // Auto-scroll after last card
      if (index === (readingResult?.drawnCards.length || 0) - 1 && detailedSectionRef.current) {
        setTimeout(() => {
          smoothScrollTo(detailedSectionRef.current!, 1200)
        }, 800)
      }
    },
    [baseHandleCardReveal, readingResult?.drawnCards.length]
  )

  const scrollToDetails = useCallback(() => {
    if (detailedSectionRef.current) {
      smoothScrollTo(detailedSectionRef.current, 800)
    }
  }, [])

  const handleSaveReading = useCallback(async () => {
    if (isSaving || isSaved) return
    setIsSaving(true)
    try {
      await baseSaveReading(readingResult, spreadInfo, interpretation)
    } finally {
      setIsSaving(false)
    }
  }, [baseSaveReading, readingResult, spreadInfo, interpretation, isSaving, isSaved])

  const handleReset = () => router.push('/tarot')
  const toggleCardExpand = (index: number) => setExpandedCard(expandedCard === index ? null : index)

  // Session loading state
  if (status === 'loading') {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingOrb}></div>
        <p>✨ {translate('common.loading', 'Loading...')}</p>
      </div>
    )
  }

  const effectiveCardCount = spreadInfo?.cardCount || 3

  // Login fallback
  const loginFallback = (
    <div className={styles.loginRequired}>
      <div className={styles.loginContent}>
        <div className={styles.loginIcon}>🔮</div>
        <h1 className={styles.loginTitle}>
          {language === 'ko' ? '로그인이 필요합니다' : 'Login Required'}
        </h1>
        <p className={styles.loginDescription}>
          {language === 'ko'
            ? '타로 해석을 보려면 로그인해주세요. 로그인하면 해석 결과를 저장하고 다시 볼 수 있어요.'
            : 'Please login to view your tarot reading. Your readings will be saved for future reference.'}
        </p>
        <div className={styles.loginButtons}>
          <button className={styles.loginButton} onClick={() => router.push(signInUrl)}>
            <svg className={styles.googleIcon} viewBox="0 0 24 24" width="20" height="20">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {language === 'ko' ? 'Google로 로그인' : 'Sign in with Google'}
          </button>
          <button className={styles.kakaoButton} onClick={() => router.push(signInUrl)}>
            <svg className={styles.kakaoIcon} viewBox="0 0 24 24" width="20" height="20">
              <path
                fill="#000"
                d="M12 3C6.48 3 2 6.58 2 11c0 2.83 1.88 5.32 4.71 6.73-.15.53-.96 3.39-1 3.56 0 .09.03.18.1.24.08.06.18.07.27.03.36-.14 4.16-2.73 4.67-3.06.41.05.83.08 1.25.08 5.52 0 10-3.58 10-8s-4.48-8-10-8z"
              />
            </svg>
            {language === 'ko' ? '카카오로 로그인' : 'Sign in with Kakao'}
          </button>
        </div>
        <Link href="/tarot" className={styles.backLink}>
          ← {language === 'ko' ? '타로 홈으로' : 'Back to Tarot'}
        </Link>
      </div>
    </div>
  )

  // Render content based on game state
  const content = (() => {
    // Loading state
    if (gameState === 'loading') {
      return (
        <div className={styles.loading}>
          <div className={styles.loadingOrb}></div>
          <p>✨ {translate('tarot.reading.preparing', 'Preparing your cards...')}</p>
        </div>
      )
    }

    // Error state
    if (gameState === 'error' || !spreadInfo) {
      return (
        <div className={styles.error}>
          <h1>😢 {translate('tarot.reading.invalidAccess', 'Invalid Access')}</h1>
          <Link href="/tarot" className={styles.errorLink}>
            {translate('tarot.reading.backToHome', 'Back to Home')}
          </Link>
        </div>
      )
    }

    // Deck style selection
    if (gameState === 'color-select') {
      return (
        <div className={styles.deckSelectPage}>
          <div className={styles.backButtonWrapper}>
            <BackButton />
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
                    {language === 'ko' ? spreadInfo.titleKo || spreadInfo.title : spreadInfo.title}
                  </span>
                  <span className={styles.spreadCardCount}>
                    {effectiveCardCount}
                    {language === 'ko' ? '장' : ' cards'}
                  </span>
                </div>
                <h1 className={styles.deckSelectTitle}>
                  {language === 'ko' ? '덱 스타일 선택' : 'Choose Your Deck'}
                </h1>
                <p className={styles.deckSelectSubtitle}>
                  {language === 'ko'
                    ? '마음에 드는 카드 뒷면을 선택하세요'
                    : 'Select the card back that resonates with you'}
                </p>
              </div>
              <div className={styles.deckGrid}>
                {CARD_COLORS.map((deck) => (
                  <button
                    key={deck.id}
                    className={`${styles.deckOption} ${selectedColor.id === deck.id ? styles.deckSelected : ''}`}
                    onClick={() => handleColorSelect(deck)}
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
                    <span className={styles.deckName}>
                      {language === 'ko' ? deck.nameKo : deck.name}
                    </span>
                    {selectedColor.id === deck.id && <div className={styles.deckCheckmark}>✓</div>}
                  </button>
                ))}
              </div>
              <button className={styles.startReadingButton} onClick={handleStartReading}>
                {language === 'ko' ? '카드 뽑기' : 'Draw Cards'} →
              </button>
            </div>
          </main>
        </div>
      )
    }

    // Interpreting state
    if (gameState === 'interpreting') {
      return (
        <div className={styles.loading}>
          <div className={styles.loadingOrb}></div>
          <p>🔮 {translate('tarot.reading.interpreting', 'The cards are speaking...')}</p>
          <p className={styles.interpretingSubtext}>
            {translate('tarot.reading.interpretingDesc', 'Consulting the cosmic wisdom...')}
          </p>
        </div>
      )
    }

    // Results state
    if (gameState === 'results' && readingResult) {
      const insight = interpretation
      return (
        <div className={styles.resultsContainer}>
          {/* Header */}
          <div className={styles.resultsHeader}>
            <h1 className={styles.resultsTitle}>
              {language === 'ko'
                ? readingResult.spread.titleKo || readingResult.spread.title
                : readingResult.spread.title}
            </h1>
            <p className={styles.resultsSubtitle}>
              {translate('tarot.results.subtitle', 'Card Interpretation')}
            </p>
            {userTopic && (
              <div className={styles.userTopicDisplay}>
                <span className={styles.topicIcon}>Q.</span>
                <span className={styles.topicText}>{userTopic}</span>
              </div>
            )}
          </div>

          {/* Cards Grid */}
          <div className={styles.resultsGridHorizontal}>
            {readingResult.drawnCards.map((drawnCard, index) => {
              const meaning = drawnCard.isReversed
                ? drawnCard.card.reversed
                : drawnCard.card.upright
              const position = readingResult.spread.positions[index]
              const positionTitle =
                (language === 'ko' ? position?.titleKo || position?.title : position?.title) ||
                (language === 'ko' ? `카드 ${index + 1}` : `Card ${index + 1}`)
              const revealed = isCardRevealed(index)
              const canReveal = canRevealCard(index)

              return (
                <div
                  key={index}
                  className={`${styles.resultCardHorizontal} ${revealed ? styles.revealed : ''} ${canReveal ? styles.canReveal : ''}`}
                  style={
                    {
                      animationDelay: `${index * 0.15}s`,
                      '--card-back-image': `url(${selectedColor.backImage})`,
                      '--card-border': selectedColor.border,
                    } as React.CSSProperties
                  }
                  onClick={() => !revealed && canReveal && handleCardReveal(index)}
                  role="button"
                  tabIndex={canReveal && !revealed ? 0 : -1}
                  aria-label={
                    revealed
                      ? `${positionTitle}: ${language === 'ko' ? drawnCard.card.nameKo || drawnCard.card.name : drawnCard.card.name}${drawnCard.isReversed ? ` (${language === 'ko' ? '역위' : 'reversed'})` : ''}`
                      : `${positionTitle} - ${canReveal ? (language === 'ko' ? '클릭하여 공개' : 'Click to reveal') : language === 'ko' ? '잠김' : 'Locked'}`
                  }
                  aria-pressed={revealed}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && !revealed && canReveal) {
                      e.preventDefault()
                      handleCardReveal(index)
                    }
                  }}
                >
                  <div className={styles.cardNumberBadge}>{index + 1}</div>
                  <div className={styles.positionBadgeHorizontal}>{positionTitle}</div>

                  <div className={styles.cardContainerLarge}>
                    {revealed ? (
                      <div className={styles.cardFlipInnerSlow}>
                        <div className={styles.cardBackResultLarge}></div>
                        <div className={styles.cardFrontLarge}>
                          <Image
                            src={getCardImagePath(drawnCard.card.id, selectedDeckStyle)}
                            alt={drawnCard.card.name}
                            width={180}
                            height={315}
                            className={styles.resultCardImageLarge}
                            placeholder="empty"
                            onError={(e) => {
                              e.currentTarget.style.opacity = '0.3'
                            }}
                          />
                          {drawnCard.isReversed && (
                            <div className={styles.reversedLabelLarge}>
                              {translate('tarot.results.reversed', 'Reversed')}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`${styles.cardBackLarge} ${canReveal ? styles.clickable : styles.locked}`}
                      >
                        <div className={styles.cardBackImageLarge}></div>
                        {canReveal && (
                          <div className={styles.clickPrompt}>
                            {translate('tarot.results.clickToReveal', '클릭하세요')}
                          </div>
                        )}
                        {!canReveal && <div className={styles.lockIcon}>🔒</div>}
                      </div>
                    )}
                  </div>

                  {revealed && (
                    <div className={styles.cardInfoCompact}>
                      <h3 className={styles.cardNameCompact}>
                        {language === 'ko'
                          ? drawnCard.card.nameKo || drawnCard.card.name
                          : drawnCard.card.name}
                      </h3>
                      <div className={styles.keywordsCompact}>
                        {(language === 'ko'
                          ? meaning.keywordsKo || meaning.keywords
                          : meaning.keywords
                        )
                          .slice(0, 2)
                          .map((keyword, i) => (
                            <span key={i} className={styles.keywordTagCompact}>
                              {keyword}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Scroll to Details Button */}
          {revealedCards.length === readingResult.drawnCards.length && (
            <button className={styles.scrollToDetailsButton} onClick={scrollToDetails}>
              {translate('tarot.results.viewDetails', '상세 해석 보기')} ↓
            </button>
          )}

          {/* Detailed Section - Card meanings without AI */}
          {/* Shown first so users see basic card data before AI interpretation */}
          {revealedCards.length === readingResult.drawnCards.length && (
            <div className={styles.detailedCardsSection} ref={detailedSectionRef}>
              <h2 className={styles.detailedSectionTitle}>
                {translate('tarot.results.detailedReadings', '상세 해석')}
              </h2>
              <div className={styles.resultsGrid}>
                {readingResult.drawnCards.map((drawnCard, index) => {
                  const meaning = drawnCard.isReversed
                    ? drawnCard.card.reversed
                    : drawnCard.card.upright
                  const position = readingResult.spread.positions[index]
                  const positionTitle =
                    (language === 'ko' ? position?.titleKo || position?.title : position?.title) ||
                    (language === 'ko' ? `카드 ${index + 1}` : `Card ${index + 1}`)
                  const cardInsight = insight?.card_insights?.[index]
                  const isExpanded = expandedCard === index

                  return (
                    <div
                      key={index}
                      className={`${styles.resultCardSlot} ${isExpanded ? styles.expanded : ''}`}
                      style={{ '--card-index': index } as React.CSSProperties}
                      onClick={() => toggleCardExpand(index)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          toggleCardExpand(index)
                        }
                      }}
                    >
                      <div className={styles.positionBadgeWithNumber}>
                        <span className={styles.cardNumberSmall}>{index + 1}</span>
                        <span>{positionTitle}</span>
                      </div>
                      <div className={styles.imageContainer}>
                        <Image
                          src={getCardImagePath(drawnCard.card.id, selectedDeckStyle)}
                          alt={drawnCard.card.name}
                          width={180}
                          height={315}
                          className={styles.resultCardImage}
                          onError={(e) => {
                            e.currentTarget.style.opacity = '0.3'
                          }}
                        />
                        {drawnCard.isReversed && (
                          <div className={styles.reversedLabel}>
                            {translate('tarot.results.reversed', 'Reversed')}
                          </div>
                        )}
                      </div>
                      <div className={styles.cardInfo}>
                        <h3 className={styles.cardName}>
                          {language === 'ko'
                            ? drawnCard.card.nameKo || drawnCard.card.name
                            : drawnCard.card.name}
                        </h3>
                        <div className={styles.keywords}>
                          {(language === 'ko'
                            ? meaning.keywordsKo || meaning.keywords
                            : meaning.keywords
                          ).map((keyword, i) => (
                            <span key={i} className={styles.keywordTag}>
                              {keyword}
                            </span>
                          ))}
                        </div>
                        <p className={styles.meaning}>
                          {language === 'ko'
                            ? meaning.meaningKo || meaning.meaning
                            : meaning.meaning}
                        </p>
                        {cardInsight && (
                          <div className={styles.premiumInsights}>
                            {cardInsight.interpretation &&
                              cardInsight.interpretation.length > 0 &&
                              cardInsight.interpretation !== meaning.meaning &&
                              cardInsight.interpretation !== meaning.meaningKo && (
                                <div className={styles.insightSection}>
                                  <h4 className={styles.insightTitle}>
                                    🔮{' '}
                                    {translate('tarot.insights.aiInterpretation', 'Deep Insight')}
                                  </h4>
                                  <p className={styles.insightText}>{cardInsight.interpretation}</p>
                                </div>
                              )}
                            {cardInsight.spirit_animal && (
                              <div className={styles.insightSection}>
                                <h4 className={styles.insightTitle}>
                                  🦋 {translate('tarot.insights.spiritAnimal', 'Spirit Animal')}
                                </h4>
                                <div className={styles.spiritAnimal}>
                                  <span className={styles.animalName}>
                                    {cardInsight.spirit_animal.name}
                                  </span>
                                  <p className={styles.animalMeaning}>
                                    {cardInsight.spirit_animal.meaning}
                                  </p>
                                  <p className={styles.animalMessage}>
                                    &quot;{cardInsight.spirit_animal.message}&quot;
                                  </p>
                                </div>
                              </div>
                            )}
                            {cardInsight.chakra && (
                              <div className={styles.insightSection}>
                                <h4 className={styles.insightTitle}>
                                  🧘 {translate('tarot.insights.chakra', 'Chakra Connection')}
                                </h4>
                                <div className={styles.chakraInfo}>
                                  <span
                                    className={styles.chakraDot}
                                    style={{ backgroundColor: cardInsight.chakra.color }}
                                  ></span>
                                  <span className={styles.chakraName}>
                                    {cardInsight.chakra.name}
                                  </span>
                                  <p className={styles.chakraGuidance}>
                                    {cardInsight.chakra.guidance}
                                  </p>
                                </div>
                              </div>
                            )}
                            {cardInsight.shadow && (
                              <div className={styles.insightSection}>
                                <h4 className={styles.insightTitle}>
                                  🌙 {translate('tarot.insights.shadowWork', 'Shadow Work')}
                                </h4>
                                <p className={styles.shadowPrompt}>{cardInsight.shadow.prompt}</p>
                                <p className={styles.shadowAffirmation}>
                                  💫 {cardInsight.shadow.affirmation}
                                </p>
                              </div>
                            )}
                            {cardInsight.element && (
                              <div className={styles.elementTag}>
                                {cardInsight.element === 'Fire' && '🔥'}
                                {cardInsight.element === 'Water' && '💧'}
                                {cardInsight.element === 'Air' && '🌬️'}
                                {cardInsight.element === 'Earth' && '🌍'}
                                {cardInsight.element}
                              </div>
                            )}
                          </div>
                        )}
                        <div className={styles.expandHint}>
                          {isExpanded
                            ? translate('tarot.results.clickToCollapse', '▲ Click to collapse')
                            : translate('tarot.results.clickToExpand', '▼ Click for more insights')}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* AI Overall Message */}
          {insight?.fallback ? (
            <div className={styles.counselorChat}>
              <div className={styles.chatMessage}>
                <div className={styles.chatAvatar}>🔮</div>
                <div className={styles.chatContent}>
                  <div className={styles.chatName}>
                    {language === 'ko' ? '타로 상담사' : 'Tarot Counselor'}
                  </div>
                  <div className={styles.chatBubble}>
                    <div className={styles.typingIndicator}>
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : insight?.overall_message ? (
            <div className={styles.counselorChat}>
              <div className={styles.chatMessage}>
                <div className={styles.chatAvatar}>🔮</div>
                <div className={styles.chatContent}>
                  <div className={styles.chatName}>
                    {language === 'ko' ? '타로 상담사' : 'Tarot Counselor'}
                  </div>
                  <div className={styles.chatBubble}>
                    <p className={styles.chatText}>{insight.overall_message}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Card Interpretations - AI chat per card */}
          {revealedCards.length === readingResult.drawnCards.length &&
            insight &&
            !insight.fallback && (
              <div className={styles.cardInterpretationsChat}>
                {readingResult.drawnCards.map((drawnCard, index) => {
                  const cardInsight = insight?.card_insights?.[index]
                  const position = readingResult.spread.positions[index]
                  const positionTitle =
                    (language === 'ko' ? position?.titleKo || position?.title : position?.title) ||
                    `Card ${index + 1}`
                  const cardName =
                    language === 'ko'
                      ? drawnCard.card.nameKo || drawnCard.card.name
                      : drawnCard.card.name
                  const meaning = drawnCard.isReversed
                    ? drawnCard.card.reversed
                    : drawnCard.card.upright

                  const interp = cardInsight?.interpretation || ''
                  const isPlaceholder =
                    interp.includes('카드의 메시지에 귀 기울여') ||
                    interp.includes('Listen to the card') ||
                    (interp.includes('자리의') && interp.length < 100)
                  if (
                    !interp ||
                    interp.length === 0 ||
                    interp === meaning.meaning ||
                    interp === meaning.meaningKo ||
                    isPlaceholder
                  ) {
                    return null
                  }

                  return (
                    <div key={index} className={styles.counselorChat}>
                      <div className={styles.chatMessage}>
                        <div className={styles.chatAvatar}>🃏</div>
                        <div className={styles.chatContent}>
                          <div className={styles.chatName}>
                            <span className={styles.cardPosition}>{positionTitle}</span>
                            <span className={styles.cardNameLabel}>
                              {cardName}
                              {drawnCard.isReversed ? ' (역방향)' : ''}
                            </span>
                          </div>
                          <div className={`${styles.chatBubble} ${styles.cardBubble}`}>
                            <p className={styles.chatText}>{cardInsight.interpretation}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

          {/* Combinations */}
          {insight?.combinations && insight.combinations.length > 0 && (
            <div className={styles.combinationsSection}>
              <h3 className={styles.sectionTitle}>
                🔗 {translate('tarot.insights.combinations', 'Card Combinations')}
              </h3>
              <div className={styles.combinationsList}>
                {insight.combinations.map((combo, idx) => (
                  <div key={idx} className={styles.combinationItem}>
                    <span className={styles.comboCards}>{combo.cards.join(' + ')}</span>
                    <p className={styles.comboMeaning}>{combo.meaning}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Guidance */}
          {insight?.guidance && !insight.fallback && (
            <div className={styles.counselorChat}>
              <div className={styles.chatMessage}>
                <div className={styles.chatAvatar}>💡</div>
                <div className={styles.chatContent}>
                  <div className={styles.chatName}>
                    {language === 'ko' ? '실천 조언' : 'Action Advice'}
                  </div>
                  {Array.isArray(insight.guidance) ? (
                    <div className={styles.adviceListContainer}>
                      {insight.guidance.map((advice, idx) => (
                        <div
                          key={idx}
                          className={`${styles.chatBubble} ${styles.adviceBubble} ${styles.adviceCard}`}
                        >
                          <div className={styles.adviceCardHeader}>
                            <span className={styles.adviceCardNumber}>{idx + 1}</span>
                            <span className={styles.adviceCardTitle}>{advice.title}</span>
                          </div>
                          <p className={styles.adviceCardDetail}>{advice.detail}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    typeof insight.guidance === 'string' &&
                    insight.guidance.trim() && (
                      <div className={`${styles.chatBubble} ${styles.adviceBubble}`}>
                        <p className={styles.adviceText}>{insight.guidance}</p>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Follow-up Questions */}
          {insight?.followup_questions && insight.followup_questions.length > 0 && (
            <div className={styles.followupSection}>
              <h3 className={styles.sectionTitle}>
                ❓ {translate('tarot.insights.followup', 'Questions for Reflection')}
              </h3>
              <ul className={styles.followupList}>
                {insight.followup_questions.map((q, idx) => (
                  <li key={idx} className={styles.followupQuestion}>
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Personality Insight */}
          <ErrorBoundary>
            <PersonalityInsight lang={language} compact className={styles.personalityInsight} />
          </ErrorBoundary>

          {saveMessage && (
            <div className={styles.saveMessage} role="status" aria-live="polite">
              {saveMessage}
            </div>
          )}

          {/* Action Buttons */}
          <div className={styles.actionButtons}>
            <button
              onClick={handleSaveReading}
              className={`${styles.saveButton} ${isSaved ? styles.saved : ''}`}
              disabled={isSaved || isSaving}
            >
              {isSaved ? '✓' : isSaving ? '⏳' : '💾'}{' '}
              {isSaved
                ? language === 'ko'
                  ? '저장됨'
                  : 'Saved'
                : isSaving
                  ? language === 'ko'
                    ? '저장 중...'
                    : 'Saving...'
                  : language === 'ko'
                    ? '저장하기'
                    : 'Save Reading'}
            </button>
            <button onClick={handleReset} className={styles.resetButton}>
              {language === 'ko' ? '새로 읽기' : 'New Reading'}
            </button>
          </div>
        </div>
      )
    }

    // Card picking state (picking or revealing)
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
  })()

  return (
    <AuthGate statusOverride={status} callbackUrl={callbackUrl} fallback={loginFallback}>
      {content}
    </AuthGate>
  )
}
