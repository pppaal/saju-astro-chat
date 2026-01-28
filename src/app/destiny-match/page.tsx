'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './DestinyMatch.module.css';
import { buildSignInUrl } from '@/lib/auth/signInUrl';
import { useDiscovery } from './useDiscovery';
import {
  FilterPanel,
  SwipeCard,
  GridView,
  ProfileModal,
  StatusScreens,
  NoMoreCards,
} from './components';

export default function DestinyMatchPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const signInUrl = buildSignInUrl('/destiny-match');

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
  } = useDiscovery({ session, status, router, signInUrl });

  // Determine if a status screen should be shown instead of main content
  const showStatusScreen = status === 'loading' || isLoading || !session || needsSetup || !!error;

  return (
    <div className={styles.page}>
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
          <Link href="/" className={styles.backButton}>{'< Back'}</Link>
          <h1 className={styles.title}>
            <span className={styles.titleIcon}>*</span>
            Destiny Match
          </h1>
          <div className={styles.headerButtons}>
            <button
              onClick={() => setViewMode(viewMode === "swipe" ? "grid" : "swipe")}
              className={styles.iconButton}
              title={viewMode === "swipe" ? "Grid View" : "Swipe View"}
              type="button"
            >
              {viewMode === "swipe" ? "SWIPE" : "GRID"}
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={styles.iconButton}
              title="Filters"
              type="button"
            >
              ??
            </button>
          </div>
        </header>

        {/* Filters Panel */}
        {showFilters && (
          <FilterPanel filters={filters} setFilters={setFilters} styles={styles} />
        )}

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
        ) : viewMode === 'swipe' && (
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
                  <button
                    onClick={handlePass}
                    className={`${styles.actionButton} ${styles.passButton}`}
                    title="Pass"
                  >
                    &#10005;
                  </button>
                  <button
                    onClick={handleSuperLike}
                    className={`${styles.actionButton} ${styles.superLikeButton}`}
                    title="Super Like"
                  >
                    &#11088;
                  </button>
                  <button
                    onClick={handleLike}
                    className={`${styles.actionButton} ${styles.likeButton}`}
                    title="Like"
                  >
                    &#10084;&#65039;
                  </button>
                </div>
              </>
            )}
          </div>
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
            {likedProfiles.length} Likes
          </div>
        )}
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
  );
}
