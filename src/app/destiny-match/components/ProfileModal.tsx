import { useState, useEffect } from 'react'
import type { UserProfile } from '../types'

type CSSStyles = { readonly [key: string]: string }

interface ProfileModalProps {
  profile: UserProfile
  onClose: () => void
  onLike: () => Promise<void>
  onPass: () => Promise<void>
  styles: CSSStyles
}

export function ProfileModal({ profile, onClose, onLike, onPass, styles }: ProfileModalProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [isLiking, setIsLiking] = useState(false)
  const [isPassing, setIsPassing] = useState(false)

  // Close modal with Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const handlePrevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : profile.photos.length - 1))
  }

  const handleNextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev < profile.photos.length - 1 ? prev + 1 : 0))
  }

  const handleLikeClick = async () => {
    setIsLiking(true)
    try {
      await onLike()
      onClose()
    } finally {
      setIsLiking(false)
    }
  }

  const handlePassClick = async () => {
    setIsPassing(true)
    try {
      await onPass()
      onClose()
    } finally {
      setIsPassing(false)
    }
  }

  return (
    <div
      className={styles.modal}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.modalClose} onClick={onClose} aria-label="Close modal">
          ✕
        </button>

        {/* Photo Gallery */}
        <div className={styles.modalPhotoSection}>
          <div className={styles.modalPhotoMain}>{profile.photos[currentPhotoIndex]}</div>

          {/* Photo Navigation */}
          {profile.photos.length > 1 && (
            <>
              <button
                className={`${styles.modalPhotoNav} ${styles.modalPhotoNavPrev}`}
                onClick={handlePrevPhoto}
                aria-label="Previous photo"
              >
                ‹
              </button>
              <button
                className={`${styles.modalPhotoNav} ${styles.modalPhotoNavNext}`}
                onClick={handleNextPhoto}
                aria-label="Next photo"
              >
                ›
              </button>

              {/* Photo Indicators */}
              <div className={styles.modalPhotoIndicators}>
                {profile.photos.map((_, idx) => (
                  <button
                    key={idx}
                    className={`${styles.modalPhotoIndicator} ${
                      idx === currentPhotoIndex ? styles.modalPhotoIndicatorActive : ''
                    }`}
                    onClick={() => setCurrentPhotoIndex(idx)}
                    aria-label={`Go to photo ${idx + 1}`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Compatibility Badge */}
          <div className={styles.modalCompatibilityBadge} title={profile.compatibilityTagline}>
            <span className={styles.compatibilityIcon}>{profile.compatibilityEmoji}</span>
            <div className={styles.compatibilityInfo}>
              <span className={styles.compatibilityValue}>{profile.compatibility}%</span>
              <span className={styles.compatibilityLabel}>Match</span>
            </div>
          </div>
        </div>

        {/* Profile Info */}
        <div className={styles.modalBody}>
          <div className={styles.modalHeader}>
            <h2 className={styles.modalName} id="profile-modal-title">
              {profile.name}, {profile.age}
              {profile.verified && (
                <span className={styles.verified} title="Verified" aria-label="Verified profile">
                  ✓
                </span>
              )}
            </h2>
            {profile.occupation && <p className={styles.modalOccupation}>{profile.occupation}</p>}
            <div className={styles.modalLocation}>
              <span aria-label="Distance">📍</span> {profile.distance} km away
            </div>
          </div>

          {/* Astrological Info */}
          <div className={styles.modalSection}>
            <h3 className={styles.modalSectionTitle}>
              <span aria-hidden="true">✨</span> Cosmic Profile
            </h3>
            <div className={styles.modalTags}>
              <span className={styles.modalTag} title="Zodiac Sign">
                ♈ {profile.zodiacSign}
              </span>
              <span className={styles.modalTag} title="Saju Element">
                ☯ {profile.sajuElement}
              </span>
            </div>
            {profile.birthChart && <p className={styles.modalBirthChart}>{profile.birthChart}</p>}
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className={styles.modalSection}>
              <h3 className={styles.modalSectionTitle}>
                <span aria-hidden="true">💭</span> About
              </h3>
              <p className={styles.modalBio}>{profile.bio}</p>
            </div>
          )}

          {/* Interests */}
          {profile.interests.length > 0 && (
            <div className={styles.modalSection}>
              <h3 className={styles.modalSectionTitle}>
                <span aria-hidden="true">💫</span> Interests
              </h3>
              <div className={styles.modalInterests}>
                {profile.interests.map((interest) => (
                  <span key={interest} className={styles.modalInterestTag}>
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className={styles.modalActions}>
            <button
              onClick={handlePassClick}
              className={`${styles.modalActionButton} ${styles.modalPassButton}`}
              disabled={isPassing || isLiking}
              aria-label="Pass on this profile"
            >
              {isPassing ? (
                <span className={styles.spinner} aria-hidden="true">
                  ⏳
                </span>
              ) : (
                <>
                  <span aria-hidden="true">✕</span>
                  <span>Pass</span>
                </>
              )}
            </button>
            <button
              onClick={handleLikeClick}
              className={`${styles.modalActionButton} ${styles.modalLikeButton}`}
              disabled={isPassing || isLiking}
              aria-label="Like this profile"
            >
              {isLiking ? (
                <span className={styles.spinner} aria-hidden="true">
                  ⏳
                </span>
              ) : (
                <>
                  <span aria-hidden="true">💚</span>
                  <span>Like</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
