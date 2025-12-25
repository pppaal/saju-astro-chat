'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, SessionProvider } from 'next-auth/react';
import { useI18n } from '@/i18n/I18nProvider';
import { searchCities } from '@/lib/cities';
import tzLookup from 'tz-lookup';
import { getUserTimezone } from '@/lib/Saju/timezone';
import { saveUserProfile } from '@/lib/userProfile';
import CreditBadge from '@/components/ui/CreditBadge';
import BackButton from '@/components/ui/BackButton';
import styles from './destiny-map.module.css';

type CityHit = { name: string; country: string; lat: number; lon: number; timezone?: string };
type Particle = {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  color: string;
  update: () => void;
  draw: () => void;
};

function extractCityPart(input: string) {
  const s = String(input || '').trim();
  const idx = s.indexOf(',');
  return (idx >= 0 ? s.slice(0, idx) : s).trim();
}

export default function DestinyMapPage() {
  return (
    <SessionProvider>
      <DestinyMapContent />
    </SessionProvider>
  );
}

function DestinyMapContent() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { status } = useSession();
  const canvasRef = useRef<HTMLCanvasElement>(null!);

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
    // Detect timezone on client side only (SSR에서 서버 타임존 방지)
    setUserTimezone(getUserTimezone() || 'Asia/Seoul');
  }, []);

  // Load profile from DB for authenticated users
  const handleLoadProfile = async () => {
    if (status !== 'authenticated') return;

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
      if (user.name) setName(user.name);
      if (user.birthDate) setBirthDate(user.birthDate);
      if (user.birthTime) setBirthTime(user.birthTime);
      if (user.birthCity) {
        setCity(user.birthCity);
        // Try to get city coordinates
        const cityName = user.birthCity.split(',')[0]?.trim();
        if (cityName) {
          try {
            const hits = await searchCities(cityName, { limit: 1 }) as CityHit[];
            if (hits && hits[0]) {
              const hit = hits[0];
              setSelectedCity({
                ...hit,
                timezone: hit.timezone ?? user.tzId ?? tzLookup(hit.lat, hit.lon),
              });
            }
          } catch {
            // City search failed, but continue with other data
            console.warn('City search failed for:', cityName);
          }
        }
      }
      // Convert gender from DB format (M/F) to form format (Male/Female)
      if (user.gender === 'M') setGender('Male');
      else if (user.gender === 'F') setGender('Female');

      setProfileLoaded(true);
    } catch (err) {
      console.error('Failed to load profile:', err);
      setCityErr(t('error.profileLoadFailed') || 'Failed to load profile. Please try again.');
    } finally {
      setLoadingProfile(false);
    }
  };

  // Don't auto-load profile on mount - user should click "Load My Profile" button
  // or enter fresh data each time
  // useEffect(() => {
  //   const profile = getUserProfile();
  //   if (profile.name) setName(profile.name);
  //   ...
  // }, []);

  // Particle animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const PARTICLE_COUNT = 80;
    const MAX_LINK_DISTANCE = 120;
    const PARTICLE_BASE_SPEED = 0.3;
    const PARTICLE_COLOR = '#a78bfa';

    let particlesArray: Particle[] = [];
    let raf = 0;

    const mouse = {
      x: undefined as number | undefined,
      y: undefined as number | undefined,
      radius: 150,
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.x;
      mouse.y = e.y;
    };
    const handleMouseOut = () => {
      mouse.x = undefined;
      mouse.y = undefined;
    };
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      init();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseout', handleMouseOut);
    window.addEventListener('resize', handleResize);

    class ParticleImpl implements Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      color: string;

      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 1;
        this.speedX = (Math.random() * 2 - 1) * PARTICLE_BASE_SPEED;
        this.speedY = (Math.random() * 2 - 1) * PARTICLE_BASE_SPEED;
        this.color = PARTICLE_COLOR;
      }

      update() {
        if (this.x > canvas.width || this.x < 0) this.speedX = -this.speedX;
        if (this.y > canvas.height || this.y < 0) this.speedY = -this.speedY;

        this.x += this.speedX;
        this.y += this.speedY;

        if (mouse.x !== undefined && mouse.y !== undefined) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < mouse.radius) {
            const forceDirectionX = dx / distance;
            const forceDirectionY = dy / distance;
            const force = (mouse.radius - distance) / mouse.radius;
            const directionX = forceDirectionX * force * 2;
            const directionY = forceDirectionY * force * 2;
            this.x -= directionX;
            this.y -= directionY;
          }
        }
      }

      draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function init() {
      particlesArray = [];
      let numberOfParticles = (canvas.height * canvas.width) / 15000;
      numberOfParticles = Math.min(numberOfParticles, PARTICLE_COUNT);
      for (let i = 0; i < numberOfParticles; i++) {
        particlesArray.push(new ParticleImpl());
      }
    }

    function connectParticles() {
      for (let a = 0; a < particlesArray.length; a++) {
        for (let b = a; b < particlesArray.length; b++) {
          const dx = particlesArray[a].x - particlesArray[b].x;
          const dy = particlesArray[a].y - particlesArray[b].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < MAX_LINK_DISTANCE) {
            const opacity = 1 - distance / MAX_LINK_DISTANCE;
            ctx.strokeStyle = `rgba(167, 139, 250, ${opacity * 0.5})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
            ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
            ctx.stroke();
          }
        }
      }
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesArray.forEach((p) => {
        p.update();
        p.draw();
      });
      connectParticles();
      raf = requestAnimationFrame(animate);
    }

    init();
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseOut);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // City search
  useEffect(() => {
    (async () => {
      try {
        await searchCities('se', { limit: 1 });
      } catch {}
    })();
  }, []);

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
        const hits = (await searchCities(q, { limit: 8 })) as CityHit[];
        setSuggestions(hits);
        // Only open dropdown if user is actively typing
        if (isUserTyping) {
          setOpenSug(hits.length > 0);
        }
      } catch {
        setSuggestions([]);
      }
    }, 120);
    return () => clearTimeout(t);
  }, [city, isUserTyping]);

  useEffect(() => {
    const tryFindCity = async () => {
      const q = extractCityPart(city);
      if (!q) return;
      try {
        const hits = (await searchCities(q, { limit: 1 })) as CityHit[];
        if (hits && hits[0]) {
          const hit = hits[0];
          setSelectedCity({
            ...hit,
            timezone: hit.timezone ?? tzLookup(hit.lat, hit.lon),
          });
        }
      } catch (err) {
        console.warn('[DestinyMap] city lookup failed', err);
      }
    };
    tryFindCity();
  }, [city]);

  const onPick = (hit: CityHit) => {
    setIsUserTyping(false); // Prevent dropdown from reopening
    setCity(`${hit.name}, ${hit.country}`);
    setSelectedCity({
      ...hit,
      timezone: hit.timezone ?? tzLookup(hit.lat, hit.lon),
    });
    setOpenSug(false);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCityErr(null);

    const lat = selectedCity?.lat?.toString() ?? '';
    const lon = selectedCity?.lon?.toString() ?? '';
    const tz = selectedCity?.timezone ?? 'Asia/Seoul';

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
    if (tz) params.set('tz', tz);
    params.set('userTz', userTimezone); // 사용자 현재 타임존 (운세 날짜용)

    // Save user profile for reuse across services
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
      <canvas ref={canvasRef} className={styles.particleCanvas} />
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
