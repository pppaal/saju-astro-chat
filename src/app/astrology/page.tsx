//src/app/astrology/page.tsx

'use client';

import { useState, FormEvent, useMemo, useEffect } from 'react';
import { getSupportedTimezones, getUserTimezone } from '@/lib/Saju/timezone';
import ResultDisplay from '@/components/astrology/ResultDisplay';
import { searchCities } from '@/lib/cities';
import tzLookup from 'tz-lookup';
import { useI18n } from '@/i18n/I18nProvider';
import ServicePageLayout from '@/components/ui/ServicePageLayout';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/hooks/useUserProfile';
import { saveUserProfile } from '@/lib/userProfile';
import styles from './Astrology.module.css';

type CityItem = { name: string; country: string; lat: number; lon: number };

export default function Home() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const { status } = useSession();
  const { profile, isLoading: profileLoading } = useUserProfile();

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [profileLoaded, setProfileLoaded] = useState(false);

  // 프리미엄 상태 관리 - 임시로 모든 사용자에게 프리미엄 제공
  const [isPremium, setIsPremium] = useState(true);
  const isLoggedIn = status === 'authenticated';

  // Load profile data into form
  useEffect(() => {
    if (profileLoading || profileLoaded) return;
    if (profile.birthDate) setDate(profile.birthDate);
    if (profile.birthTime) setTime(profile.birthTime);
    if (profile.birthCity) setCityQuery(profile.birthCity);
    if (profile.timezone) setTimeZone(profile.timezone);
    setProfileLoaded(true);
  }, [profile, profileLoading, profileLoaded]);

  // 프리미엄 상태 체크
  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/me/premium')
        .then((res) => res.json())
        .then((data) => {
          if (data.isPremium) setIsPremium(true);
        })
        .catch(() => {
          // 에러 시 기본값 유지
        });
    }
  }, [status]);

  const [interpretation, setInterpretation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [chartData, setChartData] = useState<Record<string, unknown> | null>(null);
  const [aspects, setAspects] = useState<Record<string, unknown>[] | null>(null);
  const [advanced, setAdvanced] = useState<Record<string, unknown> | null>(null);

  const timezones = useMemo(() => getSupportedTimezones(), []);
  const [timeZone, setTimeZone] = useState<string>(() => {
    const list = getSupportedTimezones();
    return list[0] || getUserTimezone() || 'UTC';
  });

  const [cityQuery, setCityQuery] = useState<string>('');
  const [suggestions, setSuggestions] = useState<CityItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  useEffect(() => {
    const q = cityQuery.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const tmr = setTimeout(async () => {
      try {
        const items = (await searchCities(q, { limit: 20 })) as CityItem[];
        setSuggestions(items);
        setShowDropdown(true);
      } catch {
        setSuggestions([]);
      }
    }, 150);
    return () => clearTimeout(tmr);
  }, [cityQuery]);

  const onPickCity = (item: CityItem) => {
    setCityQuery(`${item.name}, ${item.country}`);
    setLatitude(item.lat);
    setLongitude(item.lon);
    setShowDropdown(false);

    try {
      const guessed = tzLookup(item.lat, item.lon);
      if (guessed && typeof guessed === 'string') setTimeZone(guessed);
    } catch {
      // ignore
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setInterpretation(null);
    setChartData(null);
    setAspects(null);
    setAdvanced(null);

    try {
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error(t('error.dateRequired') || 'Please enter a valid birth date (YYYY-MM-DD).');
      }
      if (!time || !/^\d{2}:\d{2}$/.test(time)) {
        throw new Error(t('error.timeRequired') || 'Please enter a valid birth time (HH:MM).');
      }
      if (latitude == null || longitude == null) {
        throw new Error(t('error.cityRequired') || 'Please search and select your birth city.');
      }
      if (!timeZone) {
        throw new Error(t('error.timezoneRequired') || 'Please select a time zone.');
      }
    } catch (e: unknown) {
      setIsLoading(false);
      const message = e instanceof Error ? e.message : (t('error.unknown') as string) || 'Unknown error.';
      setError(message);
      return;
    }

    try {
      const body = {
        date,
        time,
        latitude,
        longitude,
        timeZone,
        city: cityQuery,
        locale,
      };

      const response = await fetch('/api/astrology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || `Server error: ${response.status}`);
      if (result?.error) throw new Error(result.error);

      const possible =
        result?.interpretation ??
        result?.result ??
        result?.data?.interpretation ??
        result?.data?.summary;

      if (typeof possible === 'string' && possible.trim()) {
        setInterpretation(possible);
      } else {
        throw new Error(t('error.noData') || 'No analysis data in server response.');
      }

      if (result?.chartData && typeof result.chartData === 'object') {
        setChartData(result.chartData as Record<string, unknown>);
      }
      if (Array.isArray(result?.aspects)) {
        setAspects(result.aspects as Record<string, unknown>[]);
      }

      const adv =
        result?.advanced ??
        result?.data?.advanced ??
        result?.chartData?.advanced ??
        null;

      setAdvanced(adv && typeof adv === 'object' ? (adv as Record<string, unknown>) : null);

      // Save profile for reuse across services
      saveUserProfile({
        birthDate: date,
        birthTime: time,
        birthCity: cityQuery,
        timezone: timeZone,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (t('error.unknown') as string) || 'Unknown error occurred.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (interpretation) {
      setInterpretation(null);
      setChartData(null);
      setAspects(null);
      setAdvanced(null);
      setError(null);
    } else {
      router.back();
    }
  };

  return (
    <ServicePageLayout
      icon="✧"
      title={t('ui.titleAstrology') || 'AI Natal Chart'}
      subtitle={t('ui.subtitleAstrology') || 'Discover your cosmic map based on your birth information.'}
      particleColor="#ffd782"
      onBack={handleBack}
      backLabel={t('app.back') || 'Back'}
    >
      <main className={styles.page}>
        {/* Background Stars */}
        <div className={styles.constellations}>
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className={styles.constellation}
              style={{
                left: `${((i * 37 + 13) % 100)}%`,
                top: `${((i * 53 + 7) % 100)}%`,
                animationDelay: `${(i % 4) + (i * 0.13)}s`,
                animationDuration: `${3 + (i % 3)}s`,
              }}
            />
          ))}
        </div>

        {!interpretation && (
          <div className={`${styles.formContainer} ${styles.fadeIn}`}>
            <div className={styles.formHeader}>
              <div className={styles.formIcon}>✧</div>
              <h1 className={styles.formTitle}>{t('ui.titleAstrology') || 'AI Natal Chart'}</h1>
              <p className={styles.formSubtitle}>
                {t('ui.subtitleAstrology') || 'Discover your cosmic map based on your birth information.'}
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className={`${styles.grid} ${styles.gridTwo}`}>
                <div>
                  <label htmlFor="date" className={styles.label}>
                    {t('app.birthDate') || 'Birth Date'}
                  </label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={styles.input}
                  />
                </div>

                <div>
                  <label htmlFor="time" className={styles.label}>
                    {t('app.birthTime') || 'Birth Time'}
                  </label>
                  <input
                    type="time"
                    id="time"
                    name="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className={styles.input}
                  />
                </div>
              </div>

              {/* City autocomplete */}
              <div className={styles.relative}>
                <label htmlFor="city" className={styles.label}>
                  {t('app.birthCity') || 'Birth City (English)'}
                </label>
                <input
                  id="city"
                  name="city"
                  autoComplete="off"
                  value={cityQuery}
                  onChange={(e) => setCityQuery(e.target.value)}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  placeholder={t('app.cityPh') || 'Seoul'}
                  className={styles.input}
                />
                {showDropdown && suggestions.length > 0 && (
                  <ul className={styles.dropdown}>
                    {suggestions.map((s, i) => (
                      <li
                        key={`${s.country}-${s.name}-${i}`}
                        className={styles.dropdownItem}
                        onMouseDown={(e) => { e.preventDefault(); onPickCity(s); }}
                      >
                        {s.name}, {s.country}
                      </li>
                    ))}
                  </ul>
                )}
                <p className={styles.inputHint}>
                  {t('ui.tipChooseCity') || 'Tip: Choose a city; time zone will be set automatically.'}
                </p>
              </div>

              <input type="hidden" name="latitude" value={latitude ?? ''} />
              <input type="hidden" name="longitude" value={longitude ?? ''} />

              {/* Timezone */}
              <div className={styles.grid}>
                <div>
                  <label htmlFor="timeZone" className={styles.label}>
                    {t('ui.timeZone') || 'Time Zone'}
                  </label>
                  <input
                    id="timeZone"
                    readOnly
                    value={timeZone}
                    className={styles.input}
                  />
                  <details className={styles.details}>
                    <summary className={styles.detailsSummary}>
                      {t('ui.changeManually') || 'Change manually'}
                    </summary>
                    <select
                      value={timeZone}
                      onChange={(e) => setTimeZone(e.target.value)}
                      className={styles.select}
                    >
                      {timezones.map((tz) => (
                        <option key={tz} value={tz}>{tz}</option>
                      ))}
                    </select>
                  </details>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={styles.submitButton}
              >
                <span className={styles.buttonGlow} />
                {isLoading ? (
                  <>
                    <svg className={styles.spinner} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a 8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t('ui.analyzing') || 'Analyzing...'}
                  </>
                ) : (
                  t('ui.generate') || 'Generate My Chart'
                )}
              </button>
            </form>

            {error && <div className={styles.error}>{error}</div>}
          </div>
        )}

        {interpretation && (
          <div className={styles.resultsContainer}>
            <ResultDisplay
              isLoading={isLoading}
              error={error}
              interpretation={interpretation}
              chartData={chartData as any}
              aspects={aspects}
              advanced={advanced}
              isLoggedIn={isLoggedIn}
              isPremium={isPremium}
            />
          </div>
        )}
      </main>
    </ServicePageLayout>
  );
}
