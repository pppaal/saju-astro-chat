'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './DestinyMatch.module.css'
import { buildSignInUrl } from '@/lib/auth/signInUrl'
import { useI18n } from '@/i18n/I18nProvider'
import BackButton from '@/components/ui/BackButton'
import CreditBadge from '@/components/ui/CreditBadge'
import { useDiscovery } from './useDiscovery'
import {
  FilterPanel,
  SwipeCard,
  GridView,
  ProfileModal,
  StatusScreens,
  NoMoreCards,
  KeyboardShortcuts,
} from './components'

export default function DestinyMatchPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const signInUrl = buildSignInUrl('/destiny-match')
  const { t } = useI18n()

  const {
    viewMode,
    setViewMode,
    profiles,
    currentIndex,
    likedProfiles,
    selectedProfile,
    setSelectedProfile,
    showFilters,
    setShowFilters,
    filters,
    setFilters,
    isLoading,
    error,
    needsSetup,
    cardRef,
    dragOffset,
    isDragging,
    currentProfile,
    hasMoreProfiles,
    rotation,
    opacity,
    loadProfiles,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleLike,
    handlePass,
    handleSuperLike,
    canUndo,
    handleUndo,
  } = useDiscovery({ session, status, router, signInUrl })

  // Determine if a status screen should be shown instead of main content
  const showStatusScreen = status === 'loading' || isLoading || !session || needsSetup || !!error

  return (
    <div className={styles.page}>
      {/* Shared Navigation Components */}
      <BackButton onClick={() => router.push('/')} label={t('destinyMatch.back', 'Back')} />
      <div className={styles.creditBadgeWrapper}>
        <CreditBadge variant="compact" />
      </div>

      {/* Background Stars */}
      <div className={styles.stars}>
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className={styles.star}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.titleContainer}>
            <div className={styles.iconWrapper}>
              <div className={styles.headerIcon}>💘</div>
            </div>
            <h1 className={styles.title}>{t('destinyMatch.title', 'Destiny Match')}</h1>
            <p className={styles.subtitle}>
              {t('destinyMatch.subtitle', 'Find your cosmic connection')}
            </p>
          </div>
          <div className={styles.headerButtons}>
            <button
              onClick={() => setViewMode(viewMode === 'swipe' ? 'grid' : 'swipe')}
              className={`${styles.iconButton} ${styles.viewModeButton}`}
              title={
                viewMode === 'swipe'
                  ? t('destinyMatch.switchToGrid', 'Switch to Grid View')
                  : t('destinyMatch.switchToSwipe', 'Switch to Swipe View')
              }
              aria-label={
                viewMode === 'swipe'
                  ? t('destinyMatch.switchToGrid', 'Switch to Grid View')
                  : t('destinyMatch.switchToSwipe', 'Switch to Swipe View')
              }
              type="button"
            >
              <span className={styles.iconButtonIcon} aria-hidden="true">
                {viewMode === 'swipe' ? '⊞' : '🎴'}
              </span>
              <span className={styles.iconButtonLabel}>
                {viewMode === 'swipe'
                  ? t('destinyMatch.grid', 'Grid')
                  : t('destinyMatch.swipe', 'Swipe')}
              </span>
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`${styles.iconButton} ${showFilters ? styles.iconButtonActive : ''}`}
              title={
                showFilters
                  ? t('destinyMatch.hideFilters', 'Hide Filters')
                  : t('destinyMatch.showFilters', 'Show Filters')
              }
              aria-label={
                showFilters
                  ? t('destinyMatch.hideFilters', 'Hide Filters')
                  : t('destinyMatch.showFilters', 'Show Filters')
              }
              aria-expanded={showFilters}
              type="button"
            >
              <span className={styles.iconButtonIcon} aria-hidden="true">
                ⚙
              </span>
              <span className={styles.iconButtonLabel}>{t('destinyMatch.filter', 'Filter')}</span>
            </button>
            <Link
              href="/destiny-match/matches"
              className={styles.iconButton}
              title={t('destinyMatch.viewMatches', 'View your matches')}
              aria-label={t('destinyMatch.viewMatches', 'View your matches')}
            >
              <span className={styles.iconButtonIcon} aria-hidden="true">
                💕
              </span>
              <span className={styles.iconButtonLabel}>{t('destinyMatch.matches', 'Matches')}</span>
            </Link>
          </div>
        </header>

        {/* Filters Panel */}
        {showFilters && <FilterPanel filters={filters} setFilters={setFilters} styles={styles} />}

        {/* Status screens: loading, not logged in, needs setup, error */}
        {showStatusScreen ? (
          <StatusScreens
            isLoading={isLoading}
            isSessionLoading={status === 'loading'}
            isLoggedIn={!!session}
            needsSetup={needsSetup}
            error={error}
            signInUrl={signInUrl}
            onSignIn={() => router.push(signInUrl)}
            onSetup={() => router.push('/destiny-match/setup')}
            onRetry={loadProfiles}
            styles={styles}
          />
        ) : (
          viewMode === 'swipe' && (
            /* Swipe Mode */
            <div className={styles.swipeContainer}>
              {!hasMoreProfiles || profiles.length === 0 ? (
                <NoMoreCards
                  profileCount={profiles.length}
                  loadProfiles={loadProfiles}
                  styles={styles}
                />
              ) : (
                <>
                  {/* Card Stack */}
                  {currentProfile && (
                    <SwipeCard
                      profile={currentProfile}
                      nextProfile={profiles[currentIndex + 1]}
                      dragOffset={dragOffset}
                      isDragging={isDragging}
                      rotation={rotation}
                      opacity={opacity}
                      cardRef={cardRef}
                      onDragStart={handleDragStart}
                      onDragMove={handleDragMove}
                      onDragEnd={handleDragEnd}
                      onSelectProfile={setSelectedProfile}
                      styles={styles}
                    />
                  )}

                  {/* Action Buttons */}
                  <div className={styles.actionButtons}>
                    {canUndo && (
                      <button
                        onClick={handleUndo}
                        className={`${styles.actionButton} ${styles.undoButton}`}
                        title={t('destinyMatch.undo', 'Undo')}
                      >
                        &#8634;
                      </button>
                    )}
                    <button
                      onClick={handlePass}
                      className={`${styles.actionButton} ${styles.passButton}`}
                      title={t('destinyMatch.pass', 'Pass')}
                    >
                      &#10005;
                    </button>
                    <button
                      onClick={handleSuperLike}
                      className={`${styles.actionButton} ${styles.superLikeButton}`}
                      title={t('destinyMatch.superLike', 'Super Like')}
                    >
                      &#11088;
                    </button>
                    <button
                      onClick={handleLike}
                      className={`${styles.actionButton} ${styles.likeButton}`}
                      title={t('destinyMatch.like', 'Like')}
                    >
                      &#10084;&#65039;
                    </button>
                  </div>
                </>
              )}
            </div>
          )
        )}

        {/* Grid Mode */}
        {viewMode === 'grid' && session && !needsSetup && !error && !isLoading && (
          <GridView
            profiles={profiles}
            onSelectProfile={setSelectedProfile}
            loadProfiles={loadProfiles}
            styles={styles}
          />
        )}

        {/* Likes Counter */}
        {likedProfiles.length > 0 && (
          <div className={styles.likesCounter}>
            <span className={styles.likesIcon}>&#128150;</span>
            {likedProfiles.length} {t('destinyMatch.likes', 'Likes')}
          </div>
        )}

        {/* Keyboard Shortcuts */}
        {viewMode === 'swipe' && !showStatusScreen && <KeyboardShortcuts styles={styles} />}
      </div>

      {/* Profile Detail Modal */}
      {selectedProfile && (
        <ProfileModal
          profile={selectedProfile}
          onClose={() => setSelectedProfile(null)}
          onLike={handleLike}
          onPass={handlePass}
          styles={styles}
        />
      )}
    </div>
  )
}
