//src/app/destiny-map/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/i18n/I18nProvider';
import { searchCities } from '@/lib/cities';
import tzLookup from 'tz-lookup';

// ✅ 도시 검색 결과 타입
type CityHit = { name: string; country: string; lat: number; lon: number; timezone?: string };

function extractCityPart(input: string) {
  const s = String(input || '').trim();
  const idx = s.indexOf(',');
  return (idx >= 0 ? s.slice(0, idx) : s).trim();
}

export default function DestinyMapPage() {
  const router = useRouter();
  const { t, locale, dir } = useI18n();

  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [city, setCity] = useState('Seoul, KR');
  const [gender, setGender] =
    useState<'Male' | 'Female' | 'Other' | 'Prefer not to say'>('Male');

  const [suggestions, setSuggestions] = useState<CityHit[]>([]);
  const [selectedCity, setSelectedCity] = useState<CityHit | null>(null);
  const [openSug, setOpenSug] = useState(false);
  const [cityErr, setCityErr] = useState<string | null>(null);

  // 서버 첫 호출 캐시 워밍업
  useEffect(() => {
    (async () => {
      try {
        await searchCities('se', { limit: 1 });
      } catch {}
    })();
  }, []);

  // ✅ 도시 입력에 따라 자동으로 좌표 검색
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
        setOpenSug(hits.length > 0);
      } catch {
        setSuggestions([]);
      }
    }, 120);
    return () => clearTimeout(t);
  }, [city]);

  // ✅ 도시 입력값이 변할 때 자동 좌표 세팅
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

    // ✅ 필수 입력 검증 + 좌표 검증
    if (!birthDate || !birthTime || !city) {
      setCityErr('⚠️ 생년월일, 출생시간, 도시를 모두 입력해 주세요.');
      return;
    }
    if (!selectedCity || !selectedCity.lat || !selectedCity.lon) {
      setCityErr('⚠️ 도시를 목록에서 선택하거나 존재하는 도시명을 입력해 주세요.');
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

    console.log('[DestinyMap] push params:', params.toString()); // 🪄 디버그

    router.push(`/destiny-map/theme?${params.toString()}`);
  };

  return (
    <div className="wrapper" dir={dir}>
      <main className="page" style={{ position: 'relative' }}>
        <button
          onClick={() => router.back()}
          className="back-btn"
          style={{ position: 'absolute', top: 24, left: 24, zIndex: 20 }}
          aria-label={t('app.back')}
          type="button"
        >
          ←
        </button>

        <section className="card">
          <h1 className="title">{t('menu.destinyMap')}</h1>
          <p className="subtitle">{t('app.subtitle')}</p>

          <form onSubmit={onSubmit} className="form" autoComplete="off">
            <div className="field">
              <label className="label">{t('app.name')}</label>
              <input
                className="input"
                placeholder={t('app.namePh')}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid2">
              <div className="field">
                <label className="label">{t('app.birthDate')}</label>
                <input
                  className="input"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label className="label">{t('app.birthTime')}</label>
                <input
                  className="input"
                  type="time"
                  value={birthTime}
                  onChange={(e) => setBirthTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid2">
              <div className="field" style={{ position: 'relative' }}>
                <label className="label">{t('app.birthCity')}</label>
                <input
                  className="input"
                  placeholder={t('app.cityPh') || 'Seoul, KR'}
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    setOpenSug(true);
                  }}
                  onBlur={() => setTimeout(() => setOpenSug(false), 150)}
                  onFocus={() => city && setOpenSug(suggestions.length > 0)}
                  required
                />
                {openSug && suggestions.length > 0 && (
                  <ul
                    className="dropdown"
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 30,
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      marginTop: 4,
                      maxHeight: 240,
                      overflowY: 'auto',
                    }}
                  >
                    {suggestions.map((s, idx) => (
                      <li
                        key={`${s.name}-${s.country}-${idx}`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          onPick(s);
                        }}
                        style={{ padding: '8px 12px', cursor: 'pointer' }}
                      >
                        {s.name}, {s.country}
                      </li>
                    ))}
                  </ul>
                )}
                {cityErr && <div className="error">{cityErr}</div>}
              </div>

              <div className="field">
                <label className="label">{t('app.gender')}</label>
                <select
                  className="input"
                  value={gender}
                  onChange={(e) =>
                    setGender(e.target.value as any)
                  }
                >
                  <option value="Male">
                    {t('app.male') || 'Male'}
                  </option>
                  <option value="Female">
                    {t('app.female') || 'Female'}
                  </option>
                </select>
              </div>
            </div>

            <button
              className="primary"
              type="submit"
              style={{ marginTop: 20 }}
            >
              {t('app.analyze') || 'Analyze'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}