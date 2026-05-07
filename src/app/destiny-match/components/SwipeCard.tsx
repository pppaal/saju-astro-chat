import type { RefObject } from 'react'
import type { UserProfile } from '../types'

type CSSStyles = { readonly [key: string]: string }

interface SwipeCardProps {
  profile: UserProfile
  nextProfile?: UserProfile
  dragOffset: { x: number; y: number }
  isDragging: boolean
  rotation: number
  opacity: number
  cardRef: RefObject<HTMLDivElement | null>
  onDragStart: (clientX: number, clientY: number) => void
  onDragMove: (clientX: number, clientY: number) => void
  onDragEnd: () => void
  onSelectProfile: (profile: UserProfile) => void
  styles: CSSStyles
}

export function SwipeCard({
  profile,
  nextProfile,
  dragOffset,
  isDragging,
  rotation,
  opacity,
  cardRef,
  onDragStart,
  onDragMove,
  onDragEnd,
  onSelectProfile,
  styles,
}: SwipeCardProps) {
  const swipeIntensity = Math.abs(dragOffset.x) / 150

  return (
    <div className={styles.cardStack}>
      {/* Next card preview */}
      {nextProfile && (
        <div
          className={`${styles.profileCard} ${styles.nextCard}`}
          style={{
            transform: `scale(${0.95 + swipeIntensity * 0.05})`,
            opacity: 0.6 + swipeIntensity * 0.2,
          }}
        >
          <div className={styles.cardPhoto}>
            <div className={styles.photoMain}>{nextProfile.avatar}</div>
          </div>
        </div>
      )}

      {/* Current card */}
      <div
        ref={cardRef}
        className={`${styles.profileCard} ${isDragging ? styles.profileCardDragging : ''}`}
        style={{
          transform: `translateX(${dragOffset.x}px) translateY(${dragOffset.y}px) rotate(${rotation}deg)`,
          opacity,
          cursor: isDragging ? 'grabbing' : 'grab',
          transition: isDragging
            ? 'none'
            : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
        }}
        onMouseDown={(e) => {
          e.preventDefault()
          onDragStart(e.clientX, e.clientY)
        }}
        onMouseMove={(e) => isDragging && onDragMove(e.clientX, e.clientY)}
        onMouseUp={onDragEnd}
        onMouseLeave={onDragEnd}
        onTouchStart={(e) => {
          e.preventDefault()
          onDragStart(e.touches[0].clientX, e.touches[0].clientY)
        }}
        onTouchMove={(e) => {
          if (isDragging) {
            e.preventDefault()
            onDragMove(e.touches[0].clientX, e.touches[0].clientY)
          }
        }}
        onTouchEnd={onDragEnd}
        role="article"
        aria-label={`${profile.name}, ${profile.age} years old`}
      >
        {/* Like/Nope indicators with enhanced styling */}
        <div
          className={`${styles.swipeIndicator} ${styles.likeIndicator}`}
          style={{
            opacity: Math.max(0, Math.min(1, dragOffset.x / 150)),
            transform: `scale(${1 + swipeIntensity * 0.2})`,
          }}
          aria-hidden="true"
        >
          <span className={styles.indicatorIcon}>💚</span>
          <span className={styles.indicatorText}>LIKE</span>
        </div>
        <div
          className={`${styles.swipeIndicator} ${styles.nopeIndicator}`}
          style={{
            opacity: Math.max(0, Math.min(1, -dragOffset.x / 150)),
            transform: `scale(${1 + swipeIntensity * 0.2})`,
          }}
          aria-hidden="true"
        >
          <span className={styles.indicatorIcon}>💔</span>
          <span className={styles.indicatorText}>NOPE</span>
        </div>

        <div className={styles.cardPhoto}>
          <div className={styles.photoMain}>{profile.avatar}</div>
          <div className={styles.photoGallery}>
            {profile.photos.map((photo, idx) => (
              <div key={idx} className={styles.photoThumb}>
                {photo}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.cardInfo}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderLeft}>
              <h2 className={styles.cardName}>
                {profile.name}, {profile.age}
                {profile.verified && (
                  <span className={styles.verified} title="Verified" aria-label="Verified profile">
                    ✓
                  </span>
                )}
              </h2>
              {profile.occupation && <p className={styles.cardOccupation}>{profile.occupation}</p>}
              <div className={styles.cardLocation}>
                <span aria-label="Distance">📍</span> {profile.distance} km away
              </div>
            </div>
          </div>

          <div className={styles.compatibilitySection}>
            <div className={styles.compatibilityBadge} title={profile.compatibilityTagline}>
              <span className={styles.compatibilityIcon}>{profile.compatibilityEmoji}</span>
              <div className={styles.compatibilityInfo}>
                <span className={styles.compatibilityValue}>{profile.compatibility}%</span>
                <span className={styles.compatibilityLabel}>Match</span>
              </div>
            </div>
          </div>

          <div className={styles.cardAstro}>
            <span className={styles.astroTag} title="Zodiac Sign">
              ♈ {profile.zodiacSign}
            </span>
            <span className={styles.astroTag} title="Saju Element">
              ☯ {profile.sajuElement}
            </span>
          </div>

          {(profile.synergy?.saju || profile.synergy?.astro) && (
            <div className={styles.synergyBox} aria-label="Compatibility synergy">
              {profile.synergy.saju && (
                <div className={styles.synergyRow} title="사주 합">
                  <span className={styles.synergyChars} aria-hidden="true">
                    {profile.synergy.saju.chars.join(' ')}
                  </span>
                  <span className={styles.synergyLabel}>{profile.synergy.saju.label}</span>
                  {profile.synergy.saju.result && (
                    <span className={styles.synergyDetail}>
                      {profile.synergy.saju.result} 五行
                    </span>
                  )}
                </div>
              )}
              {profile.synergy.astro && (
                <div
                  className={`${styles.synergyRow} ${
                    styles[`synergyAstro_${profile.synergy.astro.harmony}`] ?? ''
                  }`}
                  title="Sun-sign aspect"
                >
                  <span className={styles.synergyIcon} aria-hidden="true">✶</span>
                  <span className={styles.synergyLabel}>{profile.synergy.astro.label}</span>
                  <span className={styles.synergyDetail}>
                    {profile.synergy.astro.signs[0]} × {profile.synergy.astro.signs[1]} ·{' '}
                    {profile.synergy.astro.angle}°
                  </span>
                </div>
              )}
            </div>
          )}

          {profile.bio && <p className={styles.cardBio}>{profile.bio}</p>}

          {profile.interests.length > 0 && (
            <div className={styles.cardInterests}>
              {profile.interests.slice(0, 5).map((interest) => (
                <span key={interest} className={styles.interestTag}>
                  {interest}
                </span>
              ))}
              {profile.interests.length > 5 && (
                <span className={styles.interestTag}>+{profile.interests.length - 5}</span>
              )}
            </div>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation()
              onSelectProfile(profile)
            }}
            className={styles.infoButton}
            aria-label="View detailed profile"
          >
            <span aria-hidden="true">ℹ️</span> More Info
          </button>
        </div>
      </div>
    </div>
  )
}
