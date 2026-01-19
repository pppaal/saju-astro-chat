"use client";

// src/components/calendar/BirthInfoFormInline.tsx
import React, { useState, useEffect, RefObject } from 'react';
import { useSession } from 'next-auth/react';
import { useI18n } from '@/i18n/I18nProvider';
import BackButton from '@/components/ui/BackButton';
import DateTimePicker from '@/components/ui/DateTimePicker';
import TimePicker from '@/components/ui/TimePicker';
import { buildSignInUrl } from '@/lib/auth/signInUrl';
import { searchCities } from '@/lib/cities';
import { logger } from '@/lib/logger';
import tzLookup from 'tz-lookup';
import styles from './DestinyCalendar.module.css';
import { ICONS } from './constants';
import type { BirthInfo, CityHit } from './types';

interface BirthInfoFormInlineProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  birthInfo: BirthInfo;
  setBirthInfo: (info: BirthInfo | ((prev: BirthInfo) => BirthInfo)) => void;
  selectedCity: CityHit | null;
  setSelectedCity: (city: CityHit | null) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  timeUnknown: boolean;
  setTimeUnknown: (value: boolean) => void;
  cityErr: string | null;
  setCityErr: (err: string | null) => void;
  profileLoaded: boolean;
  setProfileLoaded: (loaded: boolean) => void;
}

function extractCityPart(input: string): string {
  // If input contains comma, get the first part (city name)
  if (input.includes(',')) {
    return input.split(',')[0].trim();
  }
  return input.trim();
}

export default function BirthInfoFormInline({
  canvasRef,
  birthInfo,
  setBirthInfo,
  selectedCity,
  setSelectedCity,
  onSubmit,
  submitting,
  timeUnknown,
  setTimeUnknown,
  cityErr,
  setCityErr,
  profileLoaded,
  setProfileLoaded,
}: BirthInfoFormInlineProps) {
  const { locale, t } = useI18n();
  const { status } = useSession();
  const signInUrl = buildSignInUrl();

  // City search state
  const [suggestions, setSuggestions] = useState<CityHit[]>([]);
  const [openSug, setOpenSug] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);

  // Profile loading state
  const [loadingProfile, setLoadingProfile] = useState(false);

  // City search effect
  useEffect(() => {
    const raw = birthInfo.birthPlace.trim();
    const q = extractCityPart(raw);
    if (q.length < 1) {
      setSuggestions([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        logger.debug('[BirthInfoFormInline] Searching cities for:', q);
        const hits = (await searchCities(q, { limit: 8 })) as CityHit[];
        logger.debug('[BirthInfoFormInline] City search results:', hits);
        setSuggestions(hits);
        if (isUserTyping) {
          setOpenSug(hits.length > 0);
        }
      } catch (err) {
        logger.error('[BirthInfoFormInline] City search error:', err);
        setSuggestions([]);
      }
    }, 120);
    return () => clearTimeout(timeout);
  }, [birthInfo.birthPlace, isUserTyping]);

  const onPickCity = (hit: CityHit) => {
    setIsUserTyping(false);
    setBirthInfo((prev: BirthInfo) => ({
      ...prev,
      birthPlace: `${hit.name}, ${hit.country}`,
      latitude: hit.lat,
      longitude: hit.lon,
      timezone: hit.timezone ?? tzLookup(hit.lat, hit.lon),
    }));
    setSelectedCity({
      ...hit,
      timezone: hit.timezone ?? tzLookup(hit.lat, hit.lon),
    });
    setOpenSug(false);
  };

  // Load profile from DB for authenticated users
  const handleLoadProfile = async () => {
    if (status !== 'authenticated') return;

    setLoadingProfile(true);
    setCityErr(null);

    try {
      const res = await fetch('/api/me/profile', { cache: 'no-store' });
      if (!res.ok) {
        setCityErr(t('error.profileLoadFailed') || 'Failed to load profile. Please try again.');
        setLoadingProfile(false);
        return;
      }

      const { user } = await res.json();
      logger.info('[BirthInfoFormInline] Loaded user profile:', user);

      if (!user || !user.birthDate) {
        setCityErr(t('error.noProfileData') || 'No saved profile data found. Please save your info in MyJourney first.');
        setLoadingProfile(false);
        return;
      }

      // Set form fields from DB data
      const updatedBirthInfo: BirthInfo = {
        ...birthInfo,
        birthDate: user.birthDate || '',
        birthTime: user.birthTime || '',
        birthPlace: user.birthCity || '',
        gender: user.gender === 'M' ? 'Male' : user.gender === 'F' ? 'Female' : 'Male',
      };

      // Try to get city coordinates
      if (user.birthCity) {
        const cityName = user.birthCity.split(',')[0]?.trim();
        logger.debug('[BirthInfoFormInline] Searching city:', cityName);
        if (cityName) {
          try {
            const hits = await searchCities(cityName, { limit: 1 }) as CityHit[];
            logger.debug('[BirthInfoFormInline] City search hits:', hits);
            if (hits && hits[0]) {
              const hit = hits[0];
              const tz = hit.timezone ?? user.tzId ?? tzLookup(hit.lat, hit.lon);
              setSelectedCity({
                ...hit,
                timezone: tz,
              });
              updatedBirthInfo.latitude = hit.lat;
              updatedBirthInfo.longitude = hit.lon;
              updatedBirthInfo.timezone = tz;
            }
          } catch (searchErr) {
            logger.warn('[BirthInfoFormInline] City search failed for:', { cityName, error: searchErr });
          }
        }
      }

      logger.debug('[BirthInfoFormInline] Final birthInfo:', updatedBirthInfo);
      setBirthInfo(updatedBirthInfo);
      setProfileLoaded(true);
    } catch (err) {
      logger.error('[BirthInfoFormInline] Failed to load profile:', err);
      setCityErr(t('error.profileLoadFailed') || 'Failed to load profile. Please try again.');
    } finally {
      setLoadingProfile(false);
    }
  };

  return (
    <div className={styles.introContainer}>
      <canvas ref={canvasRef} className={styles.particleCanvas} />
      <BackButton />

      <main className={styles.introMain}>
        <div className={styles.pageHeader}>
          <div className={styles.iconWrapper}>
            <span className={styles.icon}>{ICONS.calendar}</span>
          </div>
          <h1 className={styles.pageTitle}>
            {locale === "ko" ? "운명 캘린더" : "Destiny Calendar"}
          </h1>
          <p className={styles.pageSubtitle}>
            {locale === "ko"
              ? "동서양 운세를 교차 분석하여 당신만의 중요한 날짜를 찾아드립니다"
              : "Cross-analyze Eastern and Western fortune to find your important dates"}
          </p>
        </div>

        <div className={styles.birthFormCard}>
          <div className={styles.formHeader}>
            <span className={styles.formIcon}>🎂</span>
            <h3 className={styles.formTitle}>
              {locale === "ko" ? "생년월일을 입력해주세요" : "Enter Your Birth Info"}
            </h3>
            <p className={styles.formSubtitle}>
              {locale === "ko"
                ? "정확한 분석을 위해 필요한 정보입니다"
                : "Required for accurate analysis"}
            </p>
          </div>

          {/* Load Profile Button */}
          {status === 'authenticated' && !profileLoaded && (
            <button
              type="button"
              className={styles.loadProfileButton}
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
            <div className={styles.profileLoadedMessage}>
              <span className={styles.profileLoadedIcon}>✓</span>
              <span className={styles.profileLoadedText}>
                {locale === 'ko' ? '프로필 불러오기 완료!' : 'Profile loaded!'}
              </span>
            </div>
          )}

          <form onSubmit={onSubmit} className={styles.form}>
            {/* Birth Date */}
            <DateTimePicker
              value={birthInfo.birthDate}
              onChange={(date) => setBirthInfo({ ...birthInfo, birthDate: date })}
              label={locale === "ko" ? "생년월일" : "Birth Date"}
              required
              locale={locale}
            />

            {/* Birth Time */}
            <div className={styles.fieldGroup}>
              <TimePicker
                value={birthInfo.birthTime}
                onChange={(time) => setBirthInfo({ ...birthInfo, birthTime: time })}
                label={locale === "ko" ? "출생 시간" : "Birth Time"}
                required={!timeUnknown}
                disabled={timeUnknown}
                locale={locale}
              />
              <div className={styles.checkboxWrapper}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={timeUnknown}
                    onChange={(e) => {
                      setTimeUnknown(e.target.checked);
                      if (e.target.checked) {
                        setBirthInfo({ ...birthInfo, birthTime: "" });
                      }
                    }}
                    className={styles.checkbox}
                  />
                  <span>{locale === "ko" ? "출생 시간을 모름 (정오 12:00으로 설정됩니다)" : "Time unknown (will use 12:00 noon)"}</span>
                </label>
              </div>
            </div>

            {/* Birth City */}
            <div className={styles.fieldGroup} style={{ position: 'relative' }}>
              <label className={styles.label}>
                {locale === "ko" ? "출생 도시" : "Birth City"}
                <span className={styles.required}>*</span>
              </label>
              <input
                className={styles.input}
                placeholder={locale === "ko" ? "도시를 입력하세요" : "Enter your city"}
                value={birthInfo.birthPlace}
                onChange={(e) => {
                  setBirthInfo({ ...birthInfo, birthPlace: e.target.value });
                  setIsUserTyping(true);
                  setOpenSug(true);
                }}
                onBlur={() => {
                  setTimeout(() => setOpenSug(false), 150);
                  setIsUserTyping(false);
                }}
                autoComplete="off"
                required
              />
              {openSug && suggestions.length > 0 && (
                <ul className={styles.dropdown}>
                  {suggestions.map((s, idx) => (
                    <li
                      key={`${s.name}-${s.country}-${idx}`}
                      className={styles.dropdownItem}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onPickCity(s);
                      }}
                    >
                      <span className={styles.cityName}>{s.name}</span>
                      <span className={styles.country}>{s.country}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Gender */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                {locale === "ko" ? "성별" : "Gender"}
                <span className={styles.required}>*</span>
              </label>
              <div className={styles.genderButtons}>
                <button
                  type="button"
                  className={`${styles.genderBtn} ${birthInfo.gender === 'Male' ? styles.active : ''}`}
                  onClick={() => setBirthInfo({ ...birthInfo, gender: 'Male' })}
                >
                  <span>👨</span>
                  <span>{locale === "ko" ? "남성" : "Male"}</span>
                </button>
                <button
                  type="button"
                  className={`${styles.genderBtn} ${birthInfo.gender === 'Female' ? styles.active : ''}`}
                  onClick={() => setBirthInfo({ ...birthInfo, gender: 'Female' })}
                >
                  <span>👩</span>
                  <span>{locale === "ko" ? "여성" : "Female"}</span>
                </button>
              </div>
            </div>

            {cityErr && <div className={styles.error}>{cityErr}</div>}

            {/* Submit Button */}
            <button
              type="submit"
              className={styles.submitButton}
              disabled={submitting || !birthInfo.birthDate || (!birthInfo.birthTime && !timeUnknown) || !birthInfo.birthPlace}
            >
              {submitting ? (
                <>
                  <div className={styles.buttonSpinner} />
                  <span>{locale === "ko" ? "분석 중..." : "Analyzing..."}</span>
                </>
              ) : (
                <>
                  <span>✨</span>
                  <span>{locale === "ko" ? "운명의 날 찾기" : "Find Your Destiny Days"}</span>
                </>
              )}
            </button>
          </form>

          {status === 'unauthenticated' && (
            <div className={styles.loginHint}>
              <p>
                {locale === "ko"
                  ? "로그인하면 정보가 저장되어 더 편리하게 이용할 수 있어요"
                  : "Log in to save your info for a better experience"}
              </p>
              <a href={signInUrl} className={styles.loginLink}>
                {locale === "ko" ? "로그인하기" : "Log in"}
              </a>
            </div>
          )}
        </div>

        {/* Quick Tips */}
        <div className={styles.quickTips}>
          <h4>{locale === "ko" ? "💡 이런 분들께 추천해요" : "💡 Recommended for"}</h4>
          <ul>
            <li>{locale === "ko" ? "중요한 일정을 잡아야 할 때" : "Planning important events"}</li>
            <li>{locale === "ko" ? "좋은 날과 조심할 날을 알고 싶을 때" : "Know your best and caution days"}</li>
            <li>{locale === "ko" ? "사주와 점성술을 함께 참고하고 싶을 때" : "Want both Saju and Astrology insights"}</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
