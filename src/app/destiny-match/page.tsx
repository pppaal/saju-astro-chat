'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './DestinyMatch.module.css';
import { buildSignInUrl } from '@/lib/auth/signInUrl';

// API에서 반환하는 프로필 타입
type DiscoverProfile = {
  id: string;
  userId: string;
  displayName: string;
  bio: string | null;
  occupation: string | null;
  photos: string[];
  city: string | null;
  interests: string[];
  verified: boolean;
  age: number | null;
  distance: number | null;
  zodiacSign: string | null;
  sajuElement: string | null;
  personalityType: string | null;
  personalityName: string | null;
  compatibilityScore: number;
  compatibilityGrade: string;
  compatibilityEmoji: string;
  compatibilityTagline: string;
  lastActiveAt: string;
};

// 화면에 표시할 프로필 타입
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
  compatibilityGrade?: string;
  compatibilityEmoji?: string;
  compatibilityTagline?: string;
  bio: string;
  distance: number;
  verified: boolean;
  occupation?: string;
  personalityType?: string;
  personalityName?: string;
};

type ViewMode = 'swipe' | 'grid';

const ZODIAC_SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

const SAJU_ELEMENTS = ["Fire", "Water", "Wood", "Metal", "Earth"];

// API 프로필을 화면용 프로필로 변환
function convertToUserProfile(profile: DiscoverProfile): UserProfile {
  return {
    id: profile.id,
    name: profile.displayName,
    age: profile.age || 0,
    avatar: profile.displayName.charAt(0).toUpperCase(),
    photos: Array.isArray(profile.photos) && profile.photos.length > 0
      ? profile.photos
      : [profile.displayName.charAt(0).toUpperCase()],
    zodiacSign: profile.zodiacSign || 'Unknown',
    sajuElement: profile.sajuElement || 'Unknown',
    birthChart: profile.personalityType
      ? `${profile.personalityType} - ${profile.personalityName || ''}`
      : `${profile.zodiacSign || ''} / ${profile.sajuElement || ''}`,
    interests: Array.isArray(profile.interests) ? profile.interests : [],
    compatibility: profile.compatibilityScore,
    compatibilityGrade: profile.compatibilityGrade,
    compatibilityEmoji: profile.compatibilityEmoji,
    compatibilityTagline: profile.compatibilityTagline,
    bio: profile.bio || '자기소개가 없습니다.',
    distance: profile.distance || 0,
    verified: profile.verified,
    occupation: profile.occupation || undefined,
    personalityType: profile.personalityType || undefined,
    personalityName: profile.personalityName || undefined,
  };
}

export default function DestinyMatchPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const signInUrl = buildSignInUrl('/destiny-match');
  const [viewMode, setViewMode] = useState<ViewMode>('swipe');
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
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

  // 로딩/에러 상태
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const cardRef = useRef<HTMLDivElement>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const currentProfile = profiles[currentIndex];
  const hasMoreProfiles = currentIndex < profiles.length;

  // 프로필 로딩 함수
  const loadProfiles = useCallback(async () => {
    if (!session?.user) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('limit', '20');
      if (filters.zodiacSign !== 'all') params.set('zodiac', filters.zodiacSign);
      if (filters.sajuElement !== 'all') params.set('element', filters.sajuElement);

      const res = await fetch(`/api/destiny-match/discover?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 400 && data.error?.includes('프로필')) {
          setNeedsSetup(true);
          return;
        }
        throw new Error(data.error || '프로필을 불러오는데 실패했습니다');
      }

      const convertedProfiles = (data.profiles || []).map(convertToUserProfile);
      setProfiles(convertedProfiles);
      setHasMore(data.hasMore);
      setCurrentIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  }, [session?.user, filters.zodiacSign, filters.sajuElement]);

  // 세션 변경 시 프로필 로딩
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      loadProfiles();
    }
  }, [status, session?.user, loadProfiles]);

  // 스와이프 API 호출
  const handleSwipeApi = async (profileId: string, action: 'like' | 'pass' | 'super_like', compatibilityScore?: number) => {
    try {
      const res = await fetch('/api/destiny-match/swipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetProfileId: profileId,
          action,
          compatibilityScore,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('Swipe failed:', data.error);
        return null;
      }

      // 매치 성사 시 알림
      if (data.isMatch) {
        alert('💕 매치 성사! 상대방도 당신을 좋아합니다!');
      }

      return data;
    } catch (err) {
      console.error('Swipe error:', err);
      return null;
    }
  };

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

  const handleLike = async () => {
    if (!session) {
      router.push(signInUrl);
      return;
    }
    if (currentProfile) {
      // API 호출
      await handleSwipeApi(currentProfile.id, 'like', currentProfile.compatibility);
      setLikedProfiles(prev => [...prev, currentProfile.id]);
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePass = async () => {
    if (!session) {
      router.push(signInUrl);
      return;
    }
    if (currentProfile) {
      // API 호출
      await handleSwipeApi(currentProfile.id, 'pass');
      setPassedProfiles(prev => [...prev, currentProfile.id]);
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleSuperLike = async () => {
    if (!session) {
      router.push(signInUrl);
      return;
    }
    if (currentProfile) {
      // API 호출
      await handleSwipeApi(currentProfile.id, 'super_like', currentProfile.compatibility);
      setLikedProfiles(prev => [...prev, currentProfile.id]);
      setCurrentIndex(prev => prev + 1);
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

        {/* 로딩 중 */}
        {status === 'loading' || isLoading ? (
          <div className={styles.noMoreCards}>
            <div className={styles.noMoreIcon}>✨</div>
            <h2>프로필을 불러오는 중...</h2>
            <p>잠시만 기다려주세요</p>
          </div>
        ) : !session ? (
          /* 비로그인 상태 */
          <div className={styles.noMoreCards}>
            <div className={styles.noMoreIcon}>🔮</div>
            <h2>로그인이 필요합니다</h2>
            <p>운명의 상대를 찾으려면 먼저 로그인해주세요</p>
            <button
              onClick={() => router.push(signInUrl)}
              className={styles.resetButton}
            >
              로그인하기
            </button>
          </div>
        ) : needsSetup ? (
          /* 프로필 설정 필요 */
          <div className={styles.noMoreCards}>
            <div className={styles.noMoreIcon}>📝</div>
            <h2>프로필 설정이 필요합니다</h2>
            <p>매칭을 시작하려면 먼저 프로필을 만들어주세요</p>
            <button
              onClick={() => router.push('/destiny-match/setup')}
              className={styles.resetButton}
            >
              프로필 만들기
            </button>
          </div>
        ) : error ? (
          /* 에러 상태 */
          <div className={styles.noMoreCards}>
            <div className={styles.noMoreIcon}>😢</div>
            <h2>오류가 발생했습니다</h2>
            <p>{error}</p>
            <button
              onClick={loadProfiles}
              className={styles.resetButton}
            >
              다시 시도
            </button>
          </div>
        ) : viewMode === 'swipe' && (
          /* Swipe Mode */
          <div className={styles.swipeContainer}>
            {!hasMoreProfiles || profiles.length === 0 ? (
              <div className={styles.noMoreCards}>
                <div className={styles.noMoreIcon}>🌟</div>
                <h2>{profiles.length === 0 ? '아직 매칭 상대가 없습니다' : '모든 프로필을 확인했어요!'}</h2>
                <p>{profiles.length === 0 ? '나중에 다시 확인해주세요' : '나중에 더 많은 인연이 기다리고 있어요'}</p>
                <button
                  onClick={loadProfiles}
                  className={styles.resetButton}
                >
                  새로고침
                </button>
                <Link href="/destiny-match/matches" className={styles.resetButton} style={{ marginTop: '10px', display: 'inline-block' }}>
                  매치 확인하기
                </Link>
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
                          <div className={styles.compatibilityBadge} title={currentProfile.compatibilityTagline}>
                            {currentProfile.compatibilityEmoji} {currentProfile.compatibility}%
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
        {viewMode === 'grid' && session && !needsSetup && !error && !isLoading && (
          <div className={styles.gridContainer}>
            {profiles.length === 0 ? (
              <div className={styles.noMoreCards}>
                <div className={styles.noMoreIcon}>🌟</div>
                <h2>아직 매칭 상대가 없습니다</h2>
                <p>나중에 다시 확인해주세요</p>
                <button onClick={loadProfiles} className={styles.resetButton}>
                  새로고침
                </button>
              </div>
            ) : (
              profiles.map((profile, idx) => (
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
                    <div className={styles.gridCompatibility}>
                      {profile.compatibilityEmoji} {profile.compatibility}%
                    </div>
                  </div>
                </div>
              ))
            )}
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





