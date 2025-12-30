'use client';

import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './DestinyMatch.module.css';
import { buildSignInUrl } from '@/lib/auth/signInUrl';

type UserProfile = {
  id: string;
  name: string;
  age: number;
  avatar: string;
  photos: string[];
  zodiacSign: string;
  sajuElement: string;
  birthChart: string;
  interests: string[];
  compatibility: number;
  bio: string;
  distance: number;
  verified: boolean;
  occupation?: string;
};

type ViewMode = 'swipe' | 'grid';

const ZODIAC_SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

const SAJU_ELEMENTS = ["Fire", "Water", "Wood", "Metal", "Earth"];

// Premium mock profiles
const MOCK_PROFILES: UserProfile[] = [
  {
    id: '1',
    name: 'Luna',
    age: 28,
    avatar: 'moon',
    photos: ['moon', 'starlit', 'dusk'],
    zodiacSign: 'Pisces',
    sajuElement: 'Water',
    birthChart: 'Moon in Cancer, Rising Scorpio',
    interests: ['Tarot', 'Moon Phases', 'Crystals'],
    compatibility: 95,
    bio: 'Intuitive soul seeking deep cosmic connections. Professional tarot reader. Love moonlit walks and spiritual conversations.',
    distance: 2,
    verified: true,
    occupation: 'Tarot Reader'
  },
  {
    id: '2',
    name: 'Phoenix',
    age: 32,
    avatar: 'phoenix',
    photos: ['phoenix', 'sun', 'fire'],
    zodiacSign: 'Leo',
    sajuElement: 'Fire',
    birthChart: 'Sun in Leo, Moon in Aries',
    interests: ['Astrology', 'Manifestation', 'Yoga'],
    compatibility: 88,
    bio: 'Life coach and astrology enthusiast. Passionate about empowering others through cosmic wisdom.',
    distance: 5,
    verified: true,
    occupation: 'Life Coach'
  },
  {
    id: '3',
    name: 'Aria',
    age: 26,
    avatar: 'aria',
    photos: ['aria', 'sky', 'night'],
    zodiacSign: 'Aquarius',
    sajuElement: 'Metal',
    birthChart: 'Sun in Aquarius, Moon in Gemini',
    interests: ['Dream Analysis', 'Spirituality', 'Meditation'],
    compatibility: 82,
    bio: 'Creative artist exploring consciousness. Loves deep conversations about the universe.',
    distance: 8,
    verified: false,
    occupation: 'Artist'
  },
  {
    id: '4',
    name: 'Rose',
    age: 30,
    avatar: 'rose',
    photos: ['rose', 'bloom', 'water'],
    zodiacSign: 'Scorpio',
    sajuElement: 'Water',
    birthChart: 'Sun in Scorpio, Moon in Pisces',
    interests: ['Energy Healing', 'Chakras', 'Crystals'],
    compatibility: 79,
    bio: 'Reiki master and crystal healer dedicated to balance and awakening.',
    distance: 12,
    verified: true,
    occupation: 'Reiki Master'
  },
  {
    id: '5',
    name: 'Kai',
    age: 29,
    avatar: 'kai',
    photos: ['kai', 'sea', 'moon'],
    zodiacSign: 'Cancer',
    sajuElement: 'Water',
    birthChart: 'Sun in Cancer, Moon in Taurus',
    interests: ['Meditation', 'Yoga', 'Moon Phases'],
    compatibility: 91,
    bio: 'Ocean lover and meditation guide seeking someone to share spiritual adventures with.',
    distance: 3,
    verified: true,
    occupation: 'Meditation Teacher'
  },
  {
    id: '6',
    name: 'Sage',
    age: 34,
    avatar: 'sage',
    photos: ['sage', 'herb', 'forest'],
    zodiacSign: 'Taurus',
    sajuElement: 'Earth',
    birthChart: 'Sun in Taurus, Moon in Virgo',
    interests: ['Numerology', 'Astrology', 'Crystals'],
    compatibility: 86,
    bio: 'Grounded soul with ancient wisdom. Herbalist and spiritual guide living in harmony with nature.',
    distance: 7,
    verified: false,
    occupation: 'Herbalist'
  }
];

export default function DestinyMatchPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const signInUrl = buildSignInUrl('/destiny-match');
  const [viewMode, setViewMode] = useState<ViewMode>('swipe');
  const [profiles] = useState<UserProfile[]>(MOCK_PROFILES);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedProfiles, setLikedProfiles] = useState<string[]>([]);
  const [_passedProfiles, setPassedProfiles] = useState<string[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    zodiacSign: 'all',
    sajuElement: 'all',
    minAge: 18,
    maxAge: 99,
    maxDistance: 50
  });

  const cardRef = useRef<HTMLDivElement>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const currentProfile = profiles[currentIndex];
  const hasMoreProfiles = currentIndex < profiles.length;

  // Swipe handlers
  const handleDragStart = (clientX: number, clientY: number) => {
    if (!session) {
      router.push(signInUrl);
      return;
    }
    setIsDragging(true);
    setDragStart({ x: clientX, y: clientY });
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    const offsetX = clientX - dragStart.x;
    const offsetY = clientY - dragStart.y;
    setDragOffset({ x: offsetX, y: offsetY });
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const threshold = 100;
    if (Math.abs(dragOffset.x) > threshold) {
      if (dragOffset.x > 0) {
        handleLike();
      } else {
        handlePass();
      }
    }
    setDragOffset({ x: 0, y: 0 });
  };

  const handleLike = () => {
    if (!session) {
      router.push(signInUrl);
      return;
    }
    if (currentProfile) {
      setLikedProfiles(prev => [...prev, currentProfile.id]);
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePass = () => {
    if (!session) {
      router.push(signInUrl);
      return;
    }
    if (currentProfile) {
      setPassedProfiles(prev => [...prev, currentProfile.id]);
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleSuperLike = () => {
    if (!session) {
      router.push(signInUrl);
      return;
    }
    if (currentProfile) {
      setLikedProfiles(prev => [...prev, currentProfile.id]);
      setCurrentIndex(prev => prev + 1);
      // TODO: Add super like notification
    }
  };

  const rotation = dragOffset.x * 0.1;
  const opacity = 1 - Math.abs(dragOffset.x) / 300;

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
          <div className={styles.filtersPanel}>
            <h3>Filters</h3>
            <div className={styles.filterGrid}>
              <div>
                <label>Zodiac Sign</label>
                <select
                  value={filters.zodiacSign}
                  onChange={(e) => setFilters({ ...filters, zodiacSign: e.target.value })}
                  className={styles.filterSelect}
                >
                  <option value="all">All Signs</option>
                  {ZODIAC_SIGNS.map(sign => (
                    <option key={sign} value={sign}>{sign}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Saju Element</label>
                <select
                  value={filters.sajuElement}
                  onChange={(e) => setFilters({ ...filters, sajuElement: e.target.value })}
                  className={styles.filterSelect}
                >
                  <option value="all">All Elements</option>
                  {SAJU_ELEMENTS.map(elem => (
                    <option key={elem} value={elem}>{elem}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Swipe Mode */}
        {viewMode === 'swipe' && (
          <div className={styles.swipeContainer}>
            {!hasMoreProfiles ? (
              <div className={styles.noMoreCards}>
                <div className={styles.noMoreIcon}>🌟</div>
                <h2>You&apos;ve seen everyone!</h2>
                <p>Check back later for more cosmic connections</p>
                <button
                  onClick={() => setCurrentIndex(0)}
                  className={styles.resetButton}
                >
                  Start Over
                </button>
              </div>
            ) : (
              <>
                {/* Card Stack */}
                <div className={styles.cardStack}>
                  {/* Next card preview */}
                  {profiles[currentIndex + 1] && (
                    <div className={`${styles.profileCard} ${styles.nextCard}`}>
                      <div className={styles.cardPhoto}>{profiles[currentIndex + 1].avatar}</div>
                    </div>
                  )}

                  {/* Current card */}
                  {currentProfile && (
                    <div
                      ref={cardRef}
                      className={styles.profileCard}
                      style={{
                        transform: `translateX(${dragOffset.x}px) translateY(${dragOffset.y}px) rotate(${rotation}deg)`,
                        opacity,
                        cursor: isDragging ? 'grabbing' : 'grab'
                      }}
                      onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
                      onMouseMove={(e) => handleDragMove(e.clientX, e.clientY)}
                      onMouseUp={handleDragEnd}
                      onMouseLeave={handleDragEnd}
                      onTouchStart={(e) => handleDragStart(e.touches[0].clientX, e.touches[0].clientY)}
                      onTouchMove={(e) => handleDragMove(e.touches[0].clientX, e.touches[0].clientY)}
                      onTouchEnd={handleDragEnd}
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
                        <div className={styles.photoMain}>{currentProfile.avatar}</div>
                        <div className={styles.photoGallery}>
                          {currentProfile.photos.map((photo, idx) => (
                            <div key={idx} className={styles.photoThumb}>{photo}</div>
                          ))}
                        </div>
                      </div>

                      <div className={styles.cardInfo}>
                        <div className={styles.cardHeader}>
                          <div>
                            <h2 className={styles.cardName}>
                              {currentProfile.name}, {currentProfile.age}
                              {currentProfile.verified && <span className={styles.verified}>✓</span>}
                            </h2>
                            {currentProfile.occupation && (
                              <p className={styles.cardOccupation}>{currentProfile.occupation}</p>
                            )}
                          </div>
                          <div className={styles.compatibilityBadge}>
                            {currentProfile.compatibility}%
                          </div>
                        </div>

                        <div className={styles.cardLocation}>
                          📍 {currentProfile.distance} km away
                        </div>

                        <div className={styles.cardAstro}>
                          <span className={styles.astroTag}>{currentProfile.zodiacSign}</span>
                          <span className={styles.astroTag}>{currentProfile.sajuElement}</span>
                        </div>

                        <p className={styles.cardBio}>{currentProfile.bio}</p>

                        <div className={styles.cardInterests}>
                          {currentProfile.interests.map(interest => (
                            <span key={interest} className={styles.interestTag}>
                              {interest}
                            </span>
                          ))}
                        </div>

                        <button
                          onClick={() => setSelectedProfile(currentProfile)}
                          className={styles.infoButton}
                        >
                          More Info
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className={styles.actionButtons}>
                  <button
                    onClick={handlePass}
                    className={`${styles.actionButton} ${styles.passButton}`}
                    title="Pass"
                  >
                    ✕
                  </button>
                  <button
                    onClick={handleSuperLike}
                    className={`${styles.actionButton} ${styles.superLikeButton}`}
                    title="Super Like"
                  >
                    ⭐
                  </button>
                  <button
                    onClick={handleLike}
                    className={`${styles.actionButton} ${styles.likeButton}`}
                    title="Like"
                  >
                    ❤️
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Grid Mode */}
        {viewMode === 'grid' && (
          <div className={styles.gridContainer}>
            {profiles.map((profile, idx) => (
              <div
                key={profile.id}
                className={styles.gridCard}
                style={{ animationDelay: `${idx * 0.1}s` }}
                onClick={() => setSelectedProfile(profile)}
              >
                <div className={styles.gridPhoto}>{profile.avatar}</div>
                <div className={styles.gridInfo}>
                  <h3 className={styles.gridName}>
                    {profile.name}, {profile.age}
                    {profile.verified && <span className={styles.verified}>✓</span>}
                  </h3>
                  <p className={styles.gridDistance}>📍 {profile.distance} km</p>
                  <div className={styles.gridCompatibility}>{profile.compatibility}% Match</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Likes Counter */}
        {likedProfiles.length > 0 && (
          <div className={styles.likesCounter}>
            <span className={styles.likesIcon}>💖</span>
            {likedProfiles.length} Likes
          </div>
        )}
      </div>

      {/* Profile Detail Modal */}
      {selectedProfile && (
        <div className={styles.modal} onClick={() => setSelectedProfile(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setSelectedProfile(null)}>
              ✕
            </button>

            <div className={styles.modalPhotos}>
              {selectedProfile.photos.map((photo, idx) => (
                <div key={idx} className={styles.modalPhoto}>{photo}</div>
              ))}
            </div>

            <div className={styles.modalInfo}>
              <h2 className={styles.modalName}>
                {selectedProfile.name}, {selectedProfile.age}
                {selectedProfile.verified && <span className={styles.verified}>✓</span>}
              </h2>
              {selectedProfile.occupation && (
                <p className={styles.modalOccupation}>{selectedProfile.occupation}</p>
              )}

              <div className={styles.modalStats}>
                <div className={styles.modalStat}>
                  <span className={styles.statLabel}>Distance</span>
                  <span className={styles.statValue}>📍 {selectedProfile.distance} km</span>
                </div>
                <div className={styles.modalStat}>
                  <span className={styles.statLabel}>Compatibility</span>
                  <span className={styles.statValue}>{selectedProfile.compatibility}%</span>
                </div>
              </div>

              <div className={styles.modalSection}>
                <h3>Cosmic Profile</h3>
                <div className={styles.modalTags}>
                  <span className={styles.modalTag}>{selectedProfile.zodiacSign}</span>
                  <span className={styles.modalTag}>{selectedProfile.sajuElement}</span>
                </div>
                <p className={styles.modalBirthChart}>{selectedProfile.birthChart}</p>
              </div>

              <div className={styles.modalSection}>
                <h3>About</h3>
                <p className={styles.modalBio}>{selectedProfile.bio}</p>
              </div>

              <div className={styles.modalSection}>
                <h3>Interests</h3>
                <div className={styles.modalInterests}>
                  {selectedProfile.interests.map(interest => (
                    <span key={interest} className={styles.modalInterestTag}>
                      {interest}
                    </span>
                  ))}
                </div>
              </div>

              <div className={styles.modalActions}>
                <button
                  onClick={() => {
                    handlePass();
                    setSelectedProfile(null);
                  }}
                  className={`${styles.modalButton} ${styles.modalPassButton}`}
                >
                  Pass
                </button>
                <button
                  onClick={() => {
                    handleLike();
                    setSelectedProfile(null);
                  }}
                  className={`${styles.modalButton} ${styles.modalLikeButton}`}
                >
                  ❤️ Like
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}





