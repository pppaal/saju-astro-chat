'use client';

import React, { useEffect, useCallback, useReducer } from 'react';
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

interface FormState {
  name: string;
  birthDate: string;
  birthTime: string;
  city: string;
  gender: 'Male' | 'Female';
  genderOpen: boolean;
  suggestions: CityHit[];
  selectedCity: CityHit | null;
  openSug: boolean;
  cityErr: string | null;
  loadingProfile: boolean;
  profileLoaded: boolean;
  userTimezone: string;
  isUserTyping: boolean;
}

const initialFormState: FormState = {
  name: '',
  birthDate: '',
  birthTime: '',
  city: '',
  gender: 'Male',
  genderOpen: false,
  suggestions: [],
  selectedCity: null,
  openSug: false,
  cityErr: null,
  loadingProfile: false,
  profileLoaded: false,
  userTimezone: 'Asia/Seoul',
  isUserTyping: false,
};

type FormAction =
  | { type: 'SET_FIELD'; field: keyof FormState; value: FormState[keyof FormState] }
  | { type: 'SET_FIELDS'; fields: Partial<FormState> }
  | { type: 'PICK_CITY'; city: string; selectedCity: CityHit }
  | { type: 'UPDATE_SELECTED_CITY_TZ'; name: string; country: string; timezone: string };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_FIELDS':
      return { ...state, ...action.fields };
    case 'PICK_CITY':
      return {
        ...state,
        isUserTyping: false,
        city: action.city,
        selectedCity: action.selectedCity,
        openSug: false,
      };
    case 'UPDATE_SELECTED_CITY_TZ': {
      const prev = state.selectedCity;
      if (!prev || prev.name !== action.name || prev.country !== action.country) return state;
      return { ...state, selectedCity: { ...prev, timezone: action.timezone } };
    }
    default:
      return state;
  }
}

function DestinyMapContent() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { status } = useSession();

  const [form, dispatch] = useReducer(formReducer, initialFormState);

  useEffect(() => {
    let active = true;
    const resolveTimezone = async () => {
      try {
        const { getUserTimezone } = await loadTimezoneModule();
        if (active) {
          dispatch({ type: 'SET_FIELD', field: 'userTimezone', value: getUserTimezone() || 'Asia/Seoul' });
        }
      } catch {
        if (active) {
          dispatch({ type: 'SET_FIELD', field: 'userTimezone', value: 'Asia/Seoul' });
        }
      }
    };
    // Detect timezone on client side only (SSR에서 서버 타임존 방지)
    resolveTimezone();
    return () => {
      active = false;
    };
  }, []);

  const resolveCityTimezone = useCallback(async (hit: CityHit, fallback?: string) => {
    if (hit.timezone) {return hit.timezone;}
    if (fallback) {return fallback;}
    const { default: tzLookup } = await loadTzLookup();
    return tzLookup(hit.lat, hit.lon);
  }, []);

  // Load profile from DB for authenticated users
  const handleLoadProfile = useCallback(async () => {
    if (status !== 'authenticated') {return;}

    dispatch({ type: 'SET_FIELDS', fields: { loadingProfile: true, cityErr: null } });

    try {
      // Fetch directly from API to ensure fresh data
      const res = await fetch('/api/me/profile', { cache: 'no-store' });
      if (!res.ok) {
        dispatch({ type: 'SET_FIELDS', fields: {
          cityErr: t('error.profileLoadFailed') || 'Failed to load profile. Please try again.',
          loadingProfile: false,
        }});
        return;
      }

      const { user } = await res.json();
      if (!user || !user.birthDate) {
        dispatch({ type: 'SET_FIELDS', fields: {
          cityErr: t('error.noProfileData') || 'No saved profile data found. Please save your info in MyJourney first.',
          loadingProfile: false,
        }});
        return;
      }

      // Build fields update from DB data
      const fields: Partial<FormState> = {};
      if (user.name) {fields.name = user.name;}
      if (user.birthDate) {fields.birthDate = user.birthDate;}
      if (user.birthTime) {fields.birthTime = user.birthTime;}
      if (user.birthCity) {
        fields.city = user.birthCity;
        // Try to get city coordinates
        const cityName = user.birthCity.split(',')[0]?.trim();
        if (cityName) {
          try {
            const { searchCities } = await loadCitiesModule();
            const hits = await searchCities(cityName, { limit: 1 }) as CityHit[];
            if (hits && hits[0]) {
              const hit = hits[0];
              const timezone = await resolveCityTimezone(hit, user.tzId);
              fields.selectedCity = { ...hit, timezone };
            }
          } catch {
            // City search failed, but continue with other data
            logger.warn('City search failed for:', cityName);
          }
        }
      }
      // Convert gender from DB format (M/F) to form format (Male/Female)
      if (user.gender === 'M') {fields.gender = 'Male';}
      else if (user.gender === 'F') {fields.gender = 'Female';}

      fields.profileLoaded = true;
      fields.loadingProfile = false;
      dispatch({ type: 'SET_FIELDS', fields });
    } catch (err) {
      logger.error('Failed to load profile:', err);
      dispatch({ type: 'SET_FIELDS', fields: {
        cityErr: t('error.profileLoadFailed') || 'Failed to load profile. Please try again.',
        loadingProfile: false,
      }});
    }
  }, [status, t, resolveCityTimezone]);

  // Auto-load profile on mount for authenticated users
  useEffect(() => {
    if (status === 'authenticated' && !form.profileLoaded && !form.loadingProfile) {
      handleLoadProfile();
    }
  }, [status, form.profileLoaded, form.loadingProfile, handleLoadProfile]);

  // City search with debounce
  useEffect(() => {
    const raw = form.city.trim();
    const q = extractCityPart(raw);
    if (q.length < 1) {
      dispatch({ type: 'SET_FIELD', field: 'suggestions', value: [] });
      return;
    }
    const timer = setTimeout(async () => {
      try {
        logger.info('[DestinyMap] Searching cities for:', q);
        const { searchCities } = await loadCitiesModule();
        const hits = (await searchCities(q, { limit: 8 })) as CityHit[];
        logger.info('[DestinyMap] City search results:', hits);
        dispatch({ type: 'SET_FIELD', field: 'suggestions', value: hits });
        // Only open dropdown if user is actively typing
        if (form.isUserTyping) {
          dispatch({ type: 'SET_FIELD', field: 'openSug', value: hits.length > 0 });
        }
      } catch (err) {
        logger.error('[DestinyMap] City search error:', err);
        dispatch({ type: 'SET_FIELD', field: 'suggestions', value: [] });
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [form.city, form.isUserTyping]);

  // City lookup for coordinates
  useEffect(() => {
    const tryFindCity = async () => {
      const q = extractCityPart(form.city);
      if (!q) {return;}
      try {
        const { searchCities } = await loadCitiesModule();
        const hits = (await searchCities(q, { limit: 1 })) as CityHit[];
        if (hits && hits[0]) {
          const hit = hits[0];
          const timezone = await resolveCityTimezone(hit);
          dispatch({ type: 'SET_FIELD', field: 'selectedCity', value: { ...hit, timezone } });
        }
      } catch (err) {
        logger.warn('[DestinyMap] city lookup failed', err);
      }
    };
    tryFindCity();
  }, [form.city, resolveCityTimezone]);

  const onPick = useCallback((hit: CityHit) => {
    dispatch({ type: 'PICK_CITY', city: `${hit.name}, ${hit.country}`, selectedCity: { ...hit, timezone: hit.timezone } });
    resolveCityTimezone(hit)
      .then((timezone) => {
        dispatch({ type: 'UPDATE_SELECTED_CITY_TZ', name: hit.name, country: hit.country, timezone });
      })
      .catch(() => {});
  }, [resolveCityTimezone]);

  const onSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: 'SET_FIELD', field: 'cityErr', value: null });

    const lat = form.selectedCity?.lat?.toString() ?? '';
    const lon = form.selectedCity?.lon?.toString() ?? '';
    let tz = form.selectedCity?.timezone ?? 'Asia/Seoul';
    if (form.selectedCity && !form.selectedCity.timezone) {
      try {
        tz = await resolveCityTimezone(form.selectedCity);
      } catch {}
    }

    if (!form.birthDate || !form.birthTime || !form.city) {
      dispatch({ type: 'SET_FIELD', field: 'cityErr', value: t('error.allFieldsRequired') || '⚠️ All fields are required' });
      return;
    }
    if (!form.selectedCity || !form.selectedCity.lat || !form.selectedCity.lon) {
      dispatch({ type: 'SET_FIELD', field: 'cityErr', value: t('error.selectValidCity') || '⚠️ Please select a valid city from the list' });
      return;
    }

    const params = new URLSearchParams();
    params.set('name', form.name || '');
    params.set('birthDate', form.birthDate || '');
    params.set('birthTime', form.birthTime || '');
    params.set('city', form.city || '');
    params.set('gender', form.gender || '');
    params.set('lang', locale || 'ko');
    params.set('latitude', lat);
    params.set('longitude', lon);
    if (tz) {params.set('tz', tz);}
    params.set('userTz', form.userTimezone); // 사용자 현재 타임존 (운세 날짜용)

    // Save user profile for reuse across services
    const { saveUserProfile } = await import('@/lib/userProfile');
    saveUserProfile({
      name: form.name || undefined,
      birthDate: form.birthDate || undefined,
      birthTime: form.birthTime || undefined,
      birthCity: form.city || undefined,
      gender: form.gender as 'Male' | 'Female' | 'Other' | 'Prefer not to say',
      timezone: tz || undefined,
      latitude: form.selectedCity?.lat,
      longitude: form.selectedCity?.lon
    });

    // 테마 선택 건너뛰고 바로 인생총운(life_path)으로 이동
    params.set('theme', 'focus_overall');
    router.push(`/destiny-map/result?${params.toString()}`);
  }, [form, t, locale, router, resolveCityTimezone]);

  const handleCityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'SET_FIELDS', fields: { city: e.target.value, isUserTyping: true, openSug: true } });
  }, []);

  const handleCityFocus = useCallback(() => {
    loadCitiesModule().catch(() => {});
  }, []);

  const handleCityBlur = useCallback(() => {
    setTimeout(() => dispatch({ type: 'SET_FIELD', field: 'openSug', value: false }), 150);
    dispatch({ type: 'SET_FIELD', field: 'isUserTyping', value: false });
  }, []);

  const handleGenderToggle = useCallback(() => {
    dispatch({ type: 'SET_FIELD', field: 'genderOpen', value: !form.genderOpen });
  }, [form.genderOpen]);

  const handleGenderBlur = useCallback(() => {
    setTimeout(() => dispatch({ type: 'SET_FIELD', field: 'genderOpen', value: false }), 150);
  }, []);

  const handleSelectMale = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dispatch({ type: 'SET_FIELDS', fields: { gender: 'Male', genderOpen: false } });
  }, []);

  const handleSelectFemale = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dispatch({ type: 'SET_FIELDS', fields: { gender: 'Female', genderOpen: false } });
  }, []);

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
                  className={`${styles.loadProfileButton} ${form.profileLoaded ? styles.loadProfileSuccess : ''}`}
                  onClick={handleLoadProfile}
                  disabled={form.loadingProfile}
                >
                  <span className={styles.loadProfileIcon}>
                    {form.loadingProfile ? '...' : form.profileLoaded ? '✓' : '👤'}
                  </span>
                  <span className={styles.loadProfileText}>
                    {form.loadingProfile
                      ? (t('app.loadingProfile') || 'Loading...')
                      : form.profileLoaded
                      ? (t('app.profileLoaded') || 'Profile Loaded!')
                      : (t('app.loadMyProfile') || 'Load My Profile')}
                  </span>
                </button>
                {form.profileLoaded && (
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
                value={form.name}
                onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'name', value: e.target.value })}
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
                  value={form.birthDate}
                  onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'birthDate', value: e.target.value })}
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
                  value={form.birthTime}
                  onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'birthTime', value: e.target.value })}
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
                  value={form.city}
                  onChange={handleCityChange}
                  onFocus={handleCityFocus}
                  onBlur={handleCityBlur}
                  autoComplete="off"
                  required
                />
                {form.openSug && form.suggestions.length > 0 && (
                  <ul className={styles.dropdown}>
                    {form.suggestions.map((s: CityHit, idx: number) => (
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
                {form.cityErr && <div className={styles.error}>{form.cityErr}</div>}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  <span className={styles.labelIcon}>⚧</span>
                  {t('app.gender') || 'Gender'}
                </label>
                <div className={styles.genderSelectWrapper}>
                  <button
                    type="button"
                    className={`${styles.genderSelect} ${form.genderOpen ? styles.genderSelectOpen : ''}`}
                    onClick={handleGenderToggle}
                    onBlur={handleGenderBlur}
                  >
                    <span className={styles.genderIcon}>
                      {form.gender === 'Male' ? '♂' : '♀'}
                    </span>
                    <span className={styles.genderText}>
                      {form.gender === 'Male' ? (t('app.male') || '남성') : (t('app.female') || '여성')}
                    </span>
                    <span className={`${styles.genderArrow} ${form.genderOpen ? styles.genderArrowOpen : ''}`}>
                      ▾
                    </span>
                  </button>
                  {form.genderOpen && (
                    <div className={styles.genderDropdown}>
                      <button
                        type="button"
                        className={`${styles.genderOption} ${form.gender === 'Male' ? styles.genderOptionActive : ''}`}
                        onMouseDown={handleSelectMale}
                      >
                        <span className={styles.genderOptionIcon}>♂</span>
                        <span className={styles.genderOptionText}>{t('app.male') || '남성'}</span>
                        {form.gender === 'Male' && <span className={styles.genderCheck}>✓</span>}
                      </button>
                      <button
                        type="button"
                        className={`${styles.genderOption} ${form.gender === 'Female' ? styles.genderOptionActive : ''}`}
                        onMouseDown={handleSelectFemale}
                      >
                        <span className={styles.genderOptionIcon}>♀</span>
                        <span className={styles.genderOptionText}>{t('app.female') || '여성'}</span>
                        {form.gender === 'Female' && <span className={styles.genderCheck}>✓</span>}
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
