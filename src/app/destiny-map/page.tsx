'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useI18n } from '@/i18n/I18nProvider';
import styles from './destiny-map.module.css';
import { logger } from "@/lib/logger";

const CreditBadge = dynamic(() => import('@/components/ui/CreditBadge'), { ssr: false });
const BackButton = dynamic(() => import('@/components/ui/BackButton'), { ssr: false });
const ParticleBackground = dynamic(() => import('@/components/destiny-map/ParticleBackground'), { ssr: false });

type CityHit = { name: string; country: string; lat: number; lon: number; timezone?: string };

const loadCitiesModule = (() => {
  let promise: Promise<typeof import('@/lib/cities')> | null = null;
  return () => {
    if (!promise) {promise = import('@/lib/cities');}
    return promise;
  };
})();

const loadTimezoneModule = (() => {
  let promise: Promise<typeof import('@/lib/Saju/timezone')> | null = null;
  return () => {
    if (!promise) {promise = import('@/lib/Saju/timezone');}
    return promise;
  };
})();

const loadTzLookup = (() => {
  let promise: Promise<typeof import('tz-lookup')> | null = null;
  return () => {
    if (!promise) {promise = import('tz-lookup');}
    return promise;
  };
})();

function extractCityPart(input: string) {
  const s = String(input || '').trim();
  const idx = s.indexOf(',');
  return (idx >= 0 ? s.slice(0, idx) : s).trim();
}

export default function DestinyMapPage() {
  return <DestinyMapContent />;
}

function DestinyMapContent() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { status } = useSession();

  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [city, setCity] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [genderOpen, setGenderOpen] = useState(false);

  const [suggestions, setSuggestions] = useState<CityHit[]>([]);
  const [selectedCity, setSelectedCity] = useState<CityHit | null>(null);
  const [openSug, setOpenSug] = useState(false);
  const [cityErr, setCityErr] = useState<string | null>(null);

  // Load profile from DB states
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // 사용자 현재 위치 타임존 (운세 날짜 계산용) - client-side only
  const [userTimezone, setUserTimezone] = useState('Asia/Seoul');
  useEffect(() => {
    let active = true;
    const resolveTimezone = async () => {
      try {
        const { getUserTimezone } = await loadTimezoneModule();
        if (active) {
          setUserTimezone(getUserTimezone() || 'Asia/Seoul');
        }
      } catch {
        if (active) {
          setUserTimezone('Asia/Seoul');
        }
      }
    };
    // Detect timezone on client side only (SSR에서 서버 타임존 방지)
    resolveTimezone();
    return () => {
      active = false;
    };
  }, []);

  const resolveCityTimezone = async (hit: CityHit, fallback?: string) => {
    if (hit.timezone) {return hit.timezone;}
    if (fallback) {return fallback;}
    const { default: tzLookup } = await loadTzLookup();
    return tzLookup(hit.lat, hit.lon);
  };

  // Load profile from DB for authenticated users
  const handleLoadProfile = async () => {
    if (status !== 'authenticated') {return;}

    setLoadingProfile(true);
    setCityErr(null);

    try {
      // Fetch directly from API to ensure fresh data
      const res = await fetch('/api/me/profile', { cache: 'no-store' });
      if (!res.ok) {
        setCityErr(t('error.profileLoadFailed') || 'Failed to load profile. Please try again.');
        setLoadingProfile(false);
        return;
      }

      const { user } = await res.json();
      if (!user || !user.birthDate) {
        setCityErr(t('error.noProfileData') || 'No saved profile data found. Please save your info in MyJourney first.');
        setLoadingProfile(false);
        return;
      }

      // Set form fields from DB data
      if (user.name) {setName(user.name);}
      if (user.birthDate) {setBirthDate(user.birthDate);}
      if (user.birthTime) {setBirthTime(user.birthTime);}
      if (user.birthCity) {
        setCity(user.birthCity);
        // Try to get city coordinates
        const cityName = user.birthCity.split(',')[0]?.trim();
        if (cityName) {
          try {
            const { searchCities } = await loadCitiesModule();
            const hits = await searchCities(cityName, { limit: 1 }) as CityHit[];
            if (hits && hits[0]) {
              const hit = hits[0];
              const timezone = await resolveCityTimezone(hit, user.tzId);
              setSelectedCity({
                ...hit,
                timezone,
              });
            }
          } catch {
            // City search failed, but continue with other data
            logger.warn('City search failed for:', cityName);
          }
        }
      }
      // Convert gender from DB format (M/F) to form format (Male/Female)
      if (user.gender === 'M') {setGender('Male');}
      else if (user.gender === 'F') {setGender('Female');}

      setProfileLoaded(true);
    } catch (err) {
      logger.error('Failed to load profile:', err);
      setCityErr(t('error.profileLoadFailed') || 'Failed to load profile. Please try again.');
    } finally {
      setLoadingProfile(false);
    }
  };

  // Auto-load profile on mount for authenticated users
  useEffect(() => {
    if (status === 'authenticated' && !profileLoaded && !loadingProfile) {
      handleLoadProfile();
    }
  }, [status, profileLoaded, loadingProfile]);


  // Track if user is actively typing (to avoid auto-opening dropdown on page load)
  const [isUserTyping, setIsUserTyping] = useState(false);

  useEffect(() => {
    const raw = city.trim();
    const q = extractCityPart(raw);
    if (q.length < 1) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        logger.info('[DestinyMap] Searching cities for:', q);
        const { searchCities } = await loadCitiesModule();
        const hits = (await searchCities(q, { limit: 8 })) as CityHit[];
        logger.info('[DestinyMap] City search results:', hits);
        setSuggestions(hits);
        // Only open dropdown if user is actively typing
        if (isUserTyping) {
          setOpenSug(hits.length > 0);
        }
      } catch (err) {
        logger.error('[DestinyMap] City search error:', err);
        setSuggestions([]);
      }
    }, 120);
    return () => clearTimeout(t);
  }, [city, isUserTyping]);

  useEffect(() => {
    const tryFindCity = async () => {
      const q = extractCityPart(city);
      if (!q) {return;}
      try {
        const { searchCities } = await loadCitiesModule();
        const hits = (await searchCities(q, { limit: 1 })) as CityHit[];
        if (hits && hits[0]) {
          const hit = hits[0];
          const timezone = await resolveCityTimezone(hit);
          setSelectedCity({
            ...hit,
            timezone,
          });
        }
      } catch (err) {
        logger.warn('[DestinyMap] city lookup failed', err);
      }
    };
    tryFindCity();
  }, [city]);

  const onPick = (hit: CityHit) => {
    setIsUserTyping(false); // Prevent dropdown from reopening
    setCity(`${hit.name}, ${hit.country}`);
    setSelectedCity({
      ...hit,
      timezone: hit.timezone,
    });
    setOpenSug(false);
    resolveCityTimezone(hit)
      .then((timezone) => {
        setSelectedCity((prev) => {
          if (!prev || prev.name !== hit.name || prev.country !== hit.country) {return prev;}
          return { ...prev, timezone };
        });
      })
      .catch(() => {});
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCityErr(null);

    const lat = selectedCity?.lat?.toString() ?? '';
    const lon = selectedCity?.lon?.toString() ?? '';
    let tz = selectedCity?.timezone ?? 'Asia/Seoul';
    if (selectedCity && !selectedCity.timezone) {
      try {
        tz = await resolveCityTimezone(selectedCity);
      } catch {}
    }

    if (!birthDate || !birthTime || !city) {
      setCityErr(t('error.allFieldsRequired') || '⚠️ All fields are required');
      return;
    }
    if (!selectedCity || !selectedCity.lat || !selectedCity.lon) {
      setCityErr(t('error.selectValidCity') || '⚠️ Please select a valid city from the list');
      return;
    }

    const params = new URLSearchParams();
    params.set('name', name || '');
    params.set('birthDate', birthDate || '');
    params.set('birthTime', birthTime || '');
    params.set('city', city || '');
    params.set('gender', gender || '');
    params.set('lang', locale || 'ko');
    params.set('latitude', lat);
    params.set('longitude', lon);
    if (tz) {params.set('tz', tz);}
    params.set('userTz', userTimezone); // 사용자 현재 타임존 (운세 날짜용)

    // Save user profile for reuse across services
    const { saveUserProfile } = await import('@/lib/userProfile');
    saveUserProfile({
      name: name || undefined,
      birthDate: birthDate || undefined,
      birthTime: birthTime || undefined,
      birthCity: city || undefined,
      gender: gender as 'Male' | 'Female' | 'Other' | 'Prefer not to say',
      timezone: tz || undefined,
      latitude: selectedCity?.lat,
      longitude: selectedCity?.lon
    });

    // 테마 선택 건너뛰고 바로 인생총운(life_path)으로 이동
    params.set('theme', 'focus_overall');
    router.push(`/destiny-map/result?${params.toString()}`);
  };

  return (
    <div className={styles.container}>
      <ParticleBackground className={styles.particleCanvas} />
      <BackButton />

      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.creditBadgeWrapper}>
            <CreditBadge variant="compact" />
          </div>
          <div className={styles.header}>
            <div className={styles.iconWrapper}>
              <span className={styles.icon}>🗺️</span>
            </div>
            <h1 className={styles.title}>{t('menu.destinyMap') || 'Destiny Map'}</h1>
            <p className={styles.subtitle}>
              {t('app.subtitle') || 'Discover your cosmic blueprint through AI-powered fusion of Saju, Astrology, and Tarot'}
            </p>
          </div>

          <form onSubmit={onSubmit} className={styles.form}>
            {/* Load My Profile Button - only for authenticated users */}
            {status === 'authenticated' && (
              <>
                <button
                  type="button"
                  className={`${styles.loadProfileButton} ${profileLoaded ? styles.loadProfileSuccess : ''}`}
                  onClick={handleLoadProfile}
                  disabled={loadingProfile}
                >
                  <span className={styles.loadProfileIcon}>
                    {loadingProfile ? '...' : profileLoaded ? '✓' : '👤'}
                  </span>
                  <span className={styles.loadProfileText}>
                    {loadingProfile
                      ? (t('app.loadingProfile') || 'Loading...')
                      : profileLoaded
                      ? (t('app.profileLoaded') || 'Profile Loaded!')
                      : (t('app.loadMyProfile') || 'Load My Profile')}
                  </span>
                </button>
                {profileLoaded && (
                  <div className={styles.successBanner}>
                    <span className={styles.successIcon}>✓</span>
                    <span className={styles.successText}>
                      {t('app.profileLoadedSuccess', '프로필을 성공적으로 불러왔습니다!')}
                    </span>
                  </div>
                )}
              </>
            )}

            <div className={styles.field}>
              <label className={styles.label}>
                <span className={styles.labelIcon}>✨</span>
                {t('app.name') || 'Name'}
              </label>
              <input
                className={styles.input}
                placeholder={t('app.namePh') || 'Your name (optional)'}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className={styles.grid2}>
              <div className={styles.field}>
                <label className={styles.label}>
                  <span className={styles.labelIcon}>📅</span>
                  {t('app.birthDate') || 'Birth Date'}
                  <span className={styles.requiredMark}>*</span>
                </label>
                <input
                  className={styles.input}
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  required
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>
                  <span className={styles.labelIcon}>🕐</span>
                  {t('app.birthTime') || 'Birth Time'}
                  <span className={styles.requiredMark}>*</span>
                </label>
                <input
                  className={styles.input}
                  type="time"
                  value={birthTime}
                  onChange={(e) => setBirthTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className={styles.grid2}>
              <div className={styles.field} style={{ position: 'relative' }}>
                <label className={styles.label}>
                  <span className={styles.labelIcon}>🌍</span>
                  {t('app.birthCity') || 'Birth City'}
                  <span className={styles.requiredMark}>*</span>
                </label>
                <input
                  className={styles.input}
                  placeholder={t('app.cityPh') || 'Enter your city'}
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    setIsUserTyping(true);
                    setOpenSug(true);
                  }}
                  onFocus={() => {
                    loadCitiesModule().catch(() => {});
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
                          onPick(s);
                        }}
                      >
                        <span className={styles.cityName}>{s.name}</span>
                        <span className={styles.country}>{s.country}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {cityErr && <div className={styles.error}>{cityErr}</div>}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  <span className={styles.labelIcon}>⚧</span>
                  {t('app.gender') || 'Gender'}
                </label>
                <div className={styles.genderSelectWrapper}>
                  <button
                    type="button"
                    className={`${styles.genderSelect} ${genderOpen ? styles.genderSelectOpen : ''}`}
                    onClick={() => setGenderOpen(!genderOpen)}
                    onBlur={() => setTimeout(() => setGenderOpen(false), 150)}
                  >
                    <span className={styles.genderIcon}>
                      {gender === 'Male' ? '♂' : '♀'}
                    </span>
                    <span className={styles.genderText}>
                      {gender === 'Male' ? (t('app.male') || '남성') : (t('app.female') || '여성')}
                    </span>
                    <span className={`${styles.genderArrow} ${genderOpen ? styles.genderArrowOpen : ''}`}>
                      ▾
                    </span>
                  </button>
                  {genderOpen && (
                    <div className={styles.genderDropdown}>
                      <button
                        type="button"
                        className={`${styles.genderOption} ${gender === 'Male' ? styles.genderOptionActive : ''}`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setGender('Male');
                          setGenderOpen(false);
                        }}
                      >
                        <span className={styles.genderOptionIcon}>♂</span>
                        <span className={styles.genderOptionText}>{t('app.male') || '남성'}</span>
                        {gender === 'Male' && <span className={styles.genderCheck}>✓</span>}
                      </button>
                      <button
                        type="button"
                        className={`${styles.genderOption} ${gender === 'Female' ? styles.genderOptionActive : ''}`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setGender('Female');
                          setGenderOpen(false);
                        }}
                      >
                        <span className={styles.genderOptionIcon}>♀</span>
                        <span className={styles.genderOptionText}>{t('app.female') || '여성'}</span>
                        {gender === 'Female' && <span className={styles.genderCheck}>✓</span>}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button className={styles.submitButton} type="submit">
              <span className={styles.buttonText}>
                {t('app.analyze') || 'Begin Your Journey'}
              </span>
              <span className={styles.buttonIcon}>→</span>
            </button>
          </form>

          <div className={styles.features}>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>🔮</span>
              <span className={styles.featureText}>동양운세</span>
            </div>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>✦</span>
              <span className={styles.featureText}>서양운세</span>
            </div>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>🃏</span>
              <span className={styles.featureText}>Tarot Insight</span>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
