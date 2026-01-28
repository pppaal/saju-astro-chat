import type { RefObject } from 'react';
import type { UserProfile } from '../types';

type CSSStyles = { readonly [key: string]: string };

interface SwipeCardProps {
  profile: UserProfile;
  nextProfile?: UserProfile;
  dragOffset: { x: number; y: number };
  isDragging: boolean;
  rotation: number;
  opacity: number;
  cardRef: RefObject<HTMLDivElement | null>;
  onDragStart: (clientX: number, clientY: number) => void;
  onDragMove: (clientX: number, clientY: number) => void;
  onDragEnd: () => void;
  onSelectProfile: (profile: UserProfile) => void;
  styles: CSSStyles;
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
  return (
    <div className={styles.cardStack}>
      {/* Next card preview */}
      {nextProfile && (
        <div className={`${styles.profileCard} ${styles.nextCard}`}>
          <div className={styles.cardPhoto}>{nextProfile.avatar}</div>
        </div>
      )}

      {/* Current card */}
      <div
        ref={cardRef}
        className={styles.profileCard}
        style={{
          transform: `translateX(${dragOffset.x}px) translateY(${dragOffset.y}px) rotate(${rotation}deg)`,
          opacity,
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onMouseDown={(e) => onDragStart(e.clientX, e.clientY)}
        onMouseMove={(e) => onDragMove(e.clientX, e.clientY)}
        onMouseUp={onDragEnd}
        onMouseLeave={onDragEnd}
        onTouchStart={(e) => onDragStart(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => onDragMove(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={onDragEnd}
      >
        {/* Like/Nope indicators */}
        <div
          className={`${styles.swipeIndicator} ${styles.likeIndicator}`}
          style={{ opacity: Math.max(0, dragOffset.x / 150) }}
        >
          LIKE
        </div>
        <div
          className={`${styles.swipeIndicator} ${styles.nopeIndicator}`}
          style={{ opacity: Math.max(0, -dragOffset.x / 150) }}
        >
          NOPE
        </div>

        <div className={styles.cardPhoto}>
          <div className={styles.photoMain}>{profile.avatar}</div>
          <div className={styles.photoGallery}>
            {profile.photos.map((photo, idx) => (
              <div key={idx} className={styles.photoThumb}>{photo}</div>
            ))}
          </div>
        </div>

        <div className={styles.cardInfo}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardName}>
                {profile.name}, {profile.age}
                {profile.verified && <span className={styles.verified}>&#10003;</span>}
              </h2>
              {profile.occupation && (
                <p className={styles.cardOccupation}>{profile.occupation}</p>
              )}
            </div>
            <div className={styles.compatibilityBadge} title={profile.compatibilityTagline}>
              {profile.compatibilityEmoji} {profile.compatibility}%
            </div>
          </div>

          <div className={styles.cardLocation}>
            &#128205; {profile.distance} km away
          </div>

          <div className={styles.cardAstro}>
            <span className={styles.astroTag}>{profile.zodiacSign}</span>
            <span className={styles.astroTag}>{profile.sajuElement}</span>
          </div>

          <p className={styles.cardBio}>{profile.bio}</p>

          <div className={styles.cardInterests}>
            {profile.interests.map(interest => (
              <span key={interest} className={styles.interestTag}>
                {interest}
              </span>
            ))}
          </div>

          <button
            onClick={() => onSelectProfile(profile)}
            className={styles.infoButton}
          >
            More Info
          </button>
        </div>
      </div>
    </div>
  );
}
