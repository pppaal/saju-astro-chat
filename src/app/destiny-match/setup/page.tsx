'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../DestinyMatch.module.css';
import { logger } from '@/lib/logger';

const INTEREST_OPTIONS = [
  'Tarot', 'Astrology', 'Meditation', 'Yoga', 'Crystals',
  'Moon Phases', 'Numerology', 'Dream Analysis', 'Energy Healing',
  'Spirituality', 'Manifestation', 'Chakras', 'Herbalism', 'Nature',
  'Music', 'Art', 'Travel', 'Reading', 'Coffee', 'Cooking',
];

export default function DestinyMatchSetupPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    occupation: '',
    city: '',
    latitude: null as number | null,
    longitude: null as number | null,
    interests: [] as string[],
    ageMin: 18,
    ageMax: 50,
    maxDistance: 50,
    genderPreference: 'all',
    isActive: true,
    isVisible: true,
  });

  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [locationError, setLocationError] = useState<string | null>(null);

  // 기존 프로필 로드
  useEffect(() => {
    if (status === 'loading') {return;}

    if (!session) {
      router.push('/auth/signin?callbackUrl=/destiny-match/setup');
      return;
    }

    const loadProfile = async () => {
      try {
        const res = await fetch('/api/destiny-match/profile');
        const data = await res.json();

        if (data.profile) {
          setFormData({
            displayName: data.profile.displayName || '',
            bio: data.profile.bio || '',
            occupation: data.profile.occupation || '',
            city: data.profile.city || '',
            latitude: data.profile.latitude || null,
            longitude: data.profile.longitude || null,
            interests: data.profile.interests || [],
            ageMin: data.profile.ageMin || 18,
            ageMax: data.profile.ageMax || 50,
            maxDistance: data.profile.maxDistance || 50,
            genderPreference: data.profile.genderPreference || 'all',
            isActive: data.profile.isActive ?? true,
            isVisible: data.profile.isVisible ?? true,
          });
          if (data.profile.latitude && data.profile.longitude) {
            setLocationStatus('success');
          }
        } else if (session.user?.name) {
          // 새 프로필 - 기본 이름 설정
          setFormData((prev) => ({ ...prev, displayName: session.user?.name || '' }));
        }
      } catch (e) {
        logger.error('Load profile error:', { error: e });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [session, status, router]);

  const handleInterestToggle = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest].slice(0, 6), // 최대 6개
    }));
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('이 브라우저에서는 위치 서비스를 지원하지 않습니다');
      setLocationStatus('error');
      return;
    }

    setLocationStatus('loading');
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((prev) => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        setLocationStatus('success');
      },
      (error) => {
        let message = '위치를 가져올 수 없습니다';
        if (error.code === error.PERMISSION_DENIED) {
          message = '위치 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = '위치 정보를 사용할 수 없습니다';
        } else if (error.code === error.TIMEOUT) {
          message = '위치 요청 시간이 초과되었습니다';
        }
        setLocationError(message);
        setLocationStatus('error');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const res = await fetch('/api/destiny-match/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        router.push('/destiny-match');
      } else {
        setError(data.error || '저장에 실패했습니다');
      }
    } catch (e) {
      logger.error('Save error:', { error: e });
      setError('저장 중 오류가 발생했습니다');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner} />
          <p>로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <Link href="/destiny-match" className={styles.backButton}>
            {'< Back'}
          </Link>
          <h1 className={styles.title}>프로필 설정</h1>
          <div />
        </header>

        <form onSubmit={handleSubmit} className={styles.setupForm}>
          {error && <div className={styles.errorMessage}>{error}</div>}

          {/* 기본 정보 */}
          <section className={styles.formSection}>
            <h3>기본 정보</h3>

            <div className={styles.formGroup}>
              <label htmlFor="displayName">표시 이름 *</label>
              <input
                id="displayName"
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="상대방에게 보여질 이름"
                required
                minLength={2}
                maxLength={20}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="bio">자기소개</label>
              <textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="나를 소개해보세요"
                rows={3}
                maxLength={200}
              />
              <span className={styles.charCount}>{formData.bio.length}/200</span>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="occupation">직업</label>
              <input
                id="occupation"
                type="text"
                value={formData.occupation}
                onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                placeholder="직업 또는 하는 일"
                maxLength={30}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="city">도시</label>
              <input
                id="city"
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="서울, 부산, Tokyo..."
                maxLength={30}
              />
              <button
                type="button"
                className={styles.locationButton}
                onClick={handleGetLocation}
                disabled={locationStatus === 'loading'}
              >
                {locationStatus === 'loading' ? '📍 위치 가져오는 중...' : '📍 현재 위치 가져오기'}
              </button>
              {locationStatus === 'success' && (
                <div className={`${styles.locationStatus} ${styles.locationSuccess}`}>
                  ✓ 위치가 설정되었습니다
                </div>
              )}
              {locationStatus === 'error' && locationError && (
                <div className={`${styles.locationStatus} ${styles.locationError}`}>
                  ✗ {locationError}
                </div>
              )}
            </div>
          </section>

          {/* 관심사 */}
          <section className={styles.formSection}>
            <h3>관심사 (최대 6개)</h3>
            <div className={styles.interestsGrid}>
              {INTEREST_OPTIONS.map((interest) => (
                <button
                  key={interest}
                  type="button"
                  className={`${styles.interestChip} ${
                    formData.interests.includes(interest) ? styles.interestSelected : ''
                  }`}
                  onClick={() => handleInterestToggle(interest)}
                >
                  {interest}
                </button>
              ))}
            </div>
          </section>

          {/* 매칭 선호도 */}
          <section className={styles.formSection}>
            <h3>매칭 선호도</h3>

            <div className={styles.formGroup}>
              <label>나이 범위</label>
              <div className={styles.rangeInputs}>
                <input
                  type="number"
                  value={formData.ageMin}
                  onChange={(e) => setFormData({ ...formData, ageMin: parseInt(e.target.value) || 18 })}
                  min={18}
                  max={99}
                />
                <span>~</span>
                <input
                  type="number"
                  value={formData.ageMax}
                  onChange={(e) => setFormData({ ...formData, ageMax: parseInt(e.target.value) || 99 })}
                  min={18}
                  max={99}
                />
                <span>세</span>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="maxDistance">최대 거리: {formData.maxDistance}km</label>
              <input
                id="maxDistance"
                type="range"
                value={formData.maxDistance}
                onChange={(e) => setFormData({ ...formData, maxDistance: parseInt(e.target.value) })}
                min={5}
                max={200}
                step={5}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="genderPreference">성별 선호</label>
              <select
                id="genderPreference"
                value={formData.genderPreference}
                onChange={(e) => setFormData({ ...formData, genderPreference: e.target.value })}
              >
                <option value="all">모두</option>
                <option value="M">남성</option>
                <option value="F">여성</option>
              </select>
            </div>
          </section>

          {/* 프로필 공개 설정 */}
          <section className={styles.formSection}>
            <h3>프로필 설정</h3>

            <div className={styles.toggleGroup}>
              <label>
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                매칭 활성화
              </label>
              <span className={styles.toggleHint}>비활성화하면 새 프로필을 볼 수 없어요</span>
            </div>

            <div className={styles.toggleGroup}>
              <label>
                <input
                  type="checkbox"
                  checked={formData.isVisible}
                  onChange={(e) => setFormData({ ...formData, isVisible: e.target.checked })}
                />
                프로필 공개
              </label>
              <span className={styles.toggleHint}>비공개하면 다른 사람이 내 프로필을 볼 수 없어요</span>
            </div>
          </section>

          <button type="submit" className={styles.submitButton} disabled={saving}>
            {saving ? '저장 중...' : '저장하기'}
          </button>
        </form>
      </div>
    </div>
  );
}
