'use client';

import React, { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import styles from './BirthInfoForm.module.css';

interface BirthInfo {
  birthDate: string;
  birthTime: string;
  gender: 'M' | 'F';
  birthCity?: string;
}

interface BirthInfoFormProps {
  onSubmit: (birthInfo: BirthInfo) => void;
  locale?: 'ko' | 'en';
  initialData?: Partial<BirthInfo>;
}

export function BirthInfoForm({ onSubmit, locale = 'ko', initialData }: BirthInfoFormProps) {
  const { status } = useSession();

  const [birthDate, setBirthDate] = useState(initialData?.birthDate || '');
  const [birthTime, setBirthTime] = useState(initialData?.birthTime || '12:00');
  const [gender, setGender] = useState<'M' | 'F'>(initialData?.gender || 'M');
  const [birthCity, setBirthCity] = useState(initialData?.birthCity || '');
  const [showTimeInput, setShowTimeInput] = useState(!!initialData?.birthTime);
  const [showCityInput, setShowCityInput] = useState(!!initialData?.birthCity);

  // Profile loading states
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load profile from API
  const handleLoadProfile = useCallback(async () => {
    if (status !== 'authenticated') return;

    setLoadingProfile(true);
    setLoadError(null);

    try {
      const res = await fetch('/api/me/profile', { cache: 'no-store' });
      if (!res.ok) {
        setLoadError(locale === 'ko' ? '프로필을 불러올 수 없습니다' : 'Failed to load profile');
        setLoadingProfile(false);
        return;
      }

      const { user } = await res.json();
      console.log('[BirthInfoForm] Loaded profile:', { birthDate: user?.birthDate, birthTime: user?.birthTime, gender: user?.gender });

      if (!user || !user.birthDate) {
        setLoadError(locale === 'ko'
          ? '저장된 프로필이 없습니다. My Journey에서 먼저 정보를 저장해주세요.'
          : 'No saved profile. Please save your info in My Journey first.');
        setLoadingProfile(false);
        return;
      }

      // Set form fields from profile
      setBirthDate(user.birthDate || '');
      // 시간이 있으면 설정하고, 시간 입력 필드를 표시
      if (user.birthTime && user.birthTime.trim() !== '') {
        console.log('[BirthInfoForm] Setting birthTime:', user.birthTime);
        setBirthTime(user.birthTime);
        setShowTimeInput(true);
      } else {
        console.log('[BirthInfoForm] No birthTime in profile');
      }
      if (user.gender) {
        setGender(user.gender === 'M' || user.gender === 'F' ? user.gender : 'M');
      }
      // 출생 도시가 있으면 설정
      if (user.birthCity && user.birthCity.trim() !== '') {
        console.log('[BirthInfoForm] Setting birthCity:', user.birthCity);
        setBirthCity(user.birthCity);
        setShowCityInput(true);
      }

      setProfileLoaded(true);
    } catch (err) {
      console.error('Failed to load profile:', err);
      setLoadError(locale === 'ko' ? '프로필 로드 실패' : 'Profile load failed');
    } finally {
      setLoadingProfile(false);
    }
  }, [status, locale]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!birthDate) return;

    onSubmit({
      birthDate,
      birthTime: showTimeInput ? birthTime : '12:00',
      gender,
      birthCity: showCityInput ? birthCity : undefined,
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.icon}>🎂</span>
        <h3 className={styles.title}>
          {locale === 'ko' ? '생년월일을 입력해주세요' : 'Enter Your Birth Info'}
        </h3>
        <p className={styles.subtitle}>
          {locale === 'ko'
            ? '정확한 예측을 위해 필요한 정보입니다'
            : 'Required for accurate predictions'}
        </p>
      </div>

      {/* Load Profile Button - Only for authenticated users */}
      {status === 'authenticated' && !profileLoaded && (
        <button
          type="button"
          className={styles.loadProfileBtn}
          onClick={handleLoadProfile}
          disabled={loadingProfile}
        >
          <span className={styles.loadProfileIcon}>
            {loadingProfile ? '⏳' : '👤'}
          </span>
          <span className={styles.loadProfileText}>
            {loadingProfile
              ? (locale === 'ko' ? '불러오는 중...' : 'Loading...')
              : (locale === 'ko' ? '내 프로필 불러오기' : 'Load My Profile')}
          </span>
          <span className={styles.loadProfileArrow}>→</span>
        </button>
      )}

      {/* Profile loaded success message */}
      {status === 'authenticated' && profileLoaded && (
        <div className={styles.profileLoadedMsg}>
          <span className={styles.profileLoadedIcon}>✓</span>
          <span className={styles.profileLoadedText}>
            {locale === 'ko' ? '프로필 불러오기 완료!' : 'Profile loaded!'}
          </span>
        </div>
      )}

      {/* Error message */}
      {loadError && (
        <div className={styles.loadErrorMsg}>
          <span className={styles.loadErrorIcon}>⚠️</span>
          <span className={styles.loadErrorText}>{loadError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Birth Date */}
        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            {locale === 'ko' ? '생년월일' : 'Birth Date'}
            <span className={styles.required}>*</span>
          </label>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className={styles.input}
            required
            max={new Date().toISOString().split('T')[0]}
            min="1900-01-01"
          />
        </div>

        {/* Gender */}
        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            {locale === 'ko' ? '성별' : 'Gender'}
            <span className={styles.required}>*</span>
          </label>
          <div className={styles.genderButtons}>
            <button
              type="button"
              className={`${styles.genderBtn} ${gender === 'M' ? styles.active : ''}`}
              onClick={() => setGender('M')}
            >
              <span>👨</span>
              <span>{locale === 'ko' ? '남성' : 'Male'}</span>
            </button>
            <button
              type="button"
              className={`${styles.genderBtn} ${gender === 'F' ? styles.active : ''}`}
              onClick={() => setGender('F')}
            >
              <span>👩</span>
              <span>{locale === 'ko' ? '여성' : 'Female'}</span>
            </button>
          </div>
        </div>

        {/* Birth Time Toggle */}
        <div className={styles.fieldGroup}>
          <button
            type="button"
            className={styles.toggleBtn}
            onClick={() => setShowTimeInput(!showTimeInput)}
          >
            <span className={styles.toggleIcon}>{showTimeInput ? '▼' : '▶'}</span>
            <span>
              {locale === 'ko' ? '태어난 시간 입력 (선택)' : 'Birth Time (Optional)'}
            </span>
          </button>

          {showTimeInput && (
            <div className={styles.timeInputWrapper}>
              <input
                type="time"
                value={birthTime}
                onChange={(e) => setBirthTime(e.target.value)}
                className={styles.input}
              />
              <p className={styles.timeHint}>
                {locale === 'ko'
                  ? '모르시면 12:00(정오)로 자동 설정됩니다'
                  : 'Defaults to 12:00 PM if unknown'}
              </p>
            </div>
          )}
        </div>

        {/* Birth City Toggle */}
        <div className={styles.fieldGroup}>
          <button
            type="button"
            className={styles.toggleBtn}
            onClick={() => setShowCityInput(!showCityInput)}
          >
            <span className={styles.toggleIcon}>{showCityInput ? '▼' : '▶'}</span>
            <span>
              {locale === 'ko' ? '태어난 도시 입력 (선택)' : 'Birth City (Optional)'}
            </span>
          </button>

          {showCityInput && (
            <div className={styles.timeInputWrapper}>
              <input
                type="text"
                value={birthCity}
                onChange={(e) => setBirthCity(e.target.value)}
                className={styles.input}
                placeholder={locale === 'ko' ? '예: 서울, 부산, Seoul' : 'e.g., Seoul, New York'}
              />
              <p className={styles.timeHint}>
                {locale === 'ko'
                  ? '더 정확한 분석을 위해 입력해주세요'
                  : 'For more accurate analysis'}
              </p>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className={styles.submitBtn}
          disabled={!birthDate}
        >
          <span>✨</span>
          <span>{locale === 'ko' ? '시작하기' : 'Get Started'}</span>
        </button>
      </form>

      <p className={styles.privacyNote}>
        🔒 {locale === 'ko'
          ? '입력하신 정보는 예측 분석에만 사용되며 저장되지 않습니다'
          : 'Your information is only used for analysis and is not stored'}
      </p>
    </div>
  );
}

export default BirthInfoForm;
