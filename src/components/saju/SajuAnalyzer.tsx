// components/saju/SajuAnalyzer.tsx

'use client';

import { useState, useEffect, FormEvent, useMemo, useCallback } from 'react';
import SajuResultDisplay from './SajuResultDisplay';
import { useUserProfile } from '@/hooks/useUserProfile';
import { saveUserProfile } from '@/lib/userProfile';
import { searchCities } from '@/lib/cities';
import tzLookup from 'tz-lookup';
import {
  getSupportedTimezones,
  getUserTimezone,
  getOffsetMinutes,
  formatOffset,
  // 라이브러리 타입
  type DayMaster,
  type DaeunData,
  type YeonunData,
  type WolunData,
  type IljinData,
  type PillarData,
} from '../../lib/Saju';

// 도시 검색 결과 타입 (astrology와 동일)
interface CityResult {
  name: string;
  country: string;
  lat: number;
  lon: number;
}

// 서버 응답 타입: 라이브러리 타입만 사용
interface ApiFullResponse {
  birthYear: number;
  yearPillar: PillarData;
  monthPillar: PillarData;
  dayPillar: PillarData;
  timePillar: PillarData;
  daeun: { daeunsu: number; cycles: DaeunData[] };
  fiveElements: { wood: number; fire: number; earth: number; metal: number; water: number };
  dayMaster: DayMaster;
  yeonun: YeonunData[];
  wolun: WolunData[];
  iljin: IljinData[];
  gptPrompt: string;
}

export default function SajuAnalyzer() {
  const userTz = useMemo(() => getUserTimezone(), []);
  const tzList: string[] = useMemo(() => getSupportedTimezones(), []);
  const baseInstant = useMemo(() => new Date(), []);
  const [tzQuery, setTzQuery] = useState('');
  const { profile, isLoading: profileLoading } = useUserProfile();
  const [profileLoaded, setProfileLoaded] = useState(false);

  const [formData, setFormData] = useState({
    calendarType: 'solar' as 'solar' | 'lunar',
    birthDate: '',
    birthTime: '',
    gender: 'male' as 'male' | 'female',
    timezone: userTz,
  });

  const [sajuResult, setSajuResult] = useState<ApiFullResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 도시 검색 관련 상태
  const [cityQuery, setCityQuery] = useState('');
  const [citySuggestions, setCitySuggestions] = useState<CityResult[]>([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>('');

  // 도시 검색 - useEffect와 debounce 사용 (astrology와 동일)
  useEffect(() => {
    const q = cityQuery.trim();
    if (q.length < 2) {
      setCitySuggestions([]);
      return;
    }
    const tmr = setTimeout(async () => {
      try {
        const items = (await searchCities(q, { limit: 20 })) as CityResult[];
        setCitySuggestions(items);
        setShowCitySuggestions(true);
      } catch {
        setCitySuggestions([]);
      }
    }, 150);
    return () => clearTimeout(tmr);
  }, [cityQuery]);

  // 도시 선택 핸들러
  const handleCitySelect = useCallback((city: CityResult) => {
    setSelectedCity(`${city.name}, ${city.country}`);
    setCityQuery(`${city.name}, ${city.country}`);
    setShowCitySuggestions(false);

    // tzLookup으로 타임존 자동 설정
    try {
      const tz = tzLookup(city.lat, city.lon);
      if (tz && typeof tz === 'string') {
        setFormData(prev => ({ ...prev, timezone: tz }));
      }
    } catch {
      // ignore
    }
  }, []);

  // Load saved profile from hook
  useEffect(() => {
    if (profileLoading || profileLoaded) return;
    if (profile.birthDate || profile.birthTime || profile.gender) {
      setFormData(prev => ({
        ...prev,
        birthDate: profile.birthDate || prev.birthDate,
        birthTime: profile.birthTime || prev.birthTime,
        gender: (profile.gender === 'Male' ? 'male' : profile.gender === 'Female' ? 'female' : prev.gender) as 'male' | 'female',
        timezone: profile.timezone || prev.timezone,
      }));
      if (profile.birthCity) {
        setCityQuery(profile.birthCity);
        setSelectedCity(profile.birthCity);
      }
    }
    setProfileLoaded(true);
  }, [profile, profileLoading, profileLoaded]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const filteredTz: string[] = useMemo(() => {
    const q = tzQuery.trim().toLowerCase();
    if (!q) return tzList.slice(0, 200);
    return tzList.filter((t: string) => t.toLowerCase().includes(q)).slice(0, 200);
  }, [tzList, tzQuery]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSajuResult(null);

    try {
      // userTimezone: 사용자 현재 위치 타임존 (운세 계산용)
      const payload = { ...formData, userTimezone: userTz };
      const response = await fetch('/api/saju', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'An unknown server error occurred.');
      }
      // 서버가 라이브러리 타입과 동일 구조를 반환한다고 가정
      setSajuResult(data as ApiFullResponse);

      // Save profile for reuse across services
      saveUserProfile({
        birthDate: formData.birthDate,
        birthTime: formData.birthTime,
        gender: formData.gender === 'male' ? 'Male' : 'Female',
        timezone: formData.timezone,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analysis data.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
      <form
        onSubmit={handleSubmit}
        style={{
          background: '#1e1e2f',
          padding: '2rem',
          borderRadius: '12px',
          border: '1px solid #4f4f7a',
          marginBottom: '2rem',
        }}
      >
        <div style={{ marginBottom: '1.25rem' }}>
          <label htmlFor="calendarType" style={labelStyle}>
            양력/음력
          </label>
          <select
            id="calendarType"
            name="calendarType"
            value={formData.calendarType}
            onChange={handleInputChange}
            style={selectStyle}
          >
            <option value="solar">양력</option>
            <option value="lunar">음력</option>
          </select>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label htmlFor="birthDate" style={labelStyle}>
            생년월일
          </label>
          <input
            id="birthDate"
            name="birthDate"
            type="date"
            value={formData.birthDate}
            onChange={handleInputChange}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label htmlFor="birthTime" style={labelStyle}>
            태어난 시간
          </label>
          <input
            id="birthTime"
            name="birthTime"
            type="time"
            value={formData.birthTime}
            onChange={handleInputChange}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label htmlFor="gender" style={labelStyle}>
            성별
          </label>
          <select
            id="gender"
            name="gender"
            value={formData.gender}
            onChange={handleInputChange}
            style={selectStyle}
          >
            <option value="male">남자</option>
            <option value="female">여자</option>
          </select>
        </div>

        {/* 출생 도시 입력 (자동 타임존 설정) */}
        <div style={{ marginBottom: '1.25rem', position: 'relative' }}>
          <label htmlFor="birthCity" style={labelStyle}>
            출생 도시 (영문)
          </label>
          <input
            id="birthCity"
            name="birthCity"
            type="text"
            autoComplete="off"
            placeholder="예: Seoul, Tokyo, New York"
            value={cityQuery}
            onChange={(e) => setCityQuery(e.target.value)}
            onFocus={() => citySuggestions.length > 0 && setShowCitySuggestions(true)}
            onBlur={() => setTimeout(() => setShowCitySuggestions(false), 200)}
            style={inputStyle}
          />
          {showCitySuggestions && citySuggestions.length > 0 && (
            <ul style={suggestionListStyle}>
              {citySuggestions.map((city, idx) => (
                <li
                  key={`${city.name}-${city.country}-${idx}`}
                  style={suggestionItemStyle}
                  onMouseDown={() => handleCitySelect(city)}
                >
                  {city.name}, {city.country}
                </li>
              ))}
            </ul>
          )}
          {selectedCity && (
            <p style={{ fontSize: '0.8rem', color: '#8aa4ff', marginTop: '4px' }}>
              ✓ 선택됨: {selectedCity} → 타임존 자동 설정됨
            </p>
          )}
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <label style={labelStyle}>타임존</label>
          <details style={{ marginBottom: '8px' }}>
            <summary style={{ cursor: 'pointer', color: '#a0a0a0', fontSize: '0.85rem' }}>
              고급: 타임존 직접 선택
            </summary>
            <input
              placeholder="타임존 검색 (예: seoul, new_york)"
              value={tzQuery}
              onChange={(e) => setTzQuery(e.target.value)}
              style={{ ...inputStyle, marginTop: '8px' }}
            />
            <select
              name="timezone"
              value={formData.timezone}
              onChange={handleInputChange}
              style={{ ...selectStyle, marginTop: '8px' }}
            >
              {filteredTz.map((tz: string) => {
                const off = formatOffset(getOffsetMinutes(baseInstant, tz));
                return (
                  <option key={tz} value={tz}>
                    {tz} ({off})
                  </option>
                );
              })}
            </select>
          </details>
          <p style={{ fontSize: '0.85rem', color: '#a0a0a0' }}>
            현재: <strong style={{ color: '#ffd479' }}>{formData.timezone}</strong>{' '}
            ({formatOffset(getOffsetMinutes(baseInstant, formData.timezone))})
          </p>
        </div>

        <button type="submit" disabled={isLoading} style={buttonStyle(isLoading)}>
          {isLoading ? '분석 중...' : '사주 분석하기'}
        </button>
      </form>

      {error && (
        <p style={{ color: '#ff6b6b', marginTop: '1rem', textAlign: 'center' }}>
          오류: {error}
        </p>
      )}
      {sajuResult && <SajuResultDisplay result={sajuResult} />}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontWeight: '500',
  marginBottom: '0.5rem',
  color: '#e0e0e0',
};
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.8rem',
  border: '1px solid #4f4f7a',
  borderRadius: '6px',
  fontSize: '1rem',
  backgroundColor: '#161625',
  color: '#ffffff',
};
const selectStyle: React.CSSProperties = { ...inputStyle, appearance: 'none' };
const buttonStyle = (disabled: boolean): React.CSSProperties => ({
  width: '100%',
  padding: '1rem',
  cursor: disabled ? 'not-allowed' : 'pointer',
  background: disabled ? '#2a2a3e' : '#3a6df0',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontSize: '1.1rem',
  fontWeight: 'bold',
  transition: 'background-color 0.2s',
  opacity: disabled ? 0.6 : 1,
});

// 도시 추천 목록 스타일
const suggestionListStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  background: '#1e1e2f',
  border: '1px solid #4f4f7a',
  borderRadius: '6px',
  maxHeight: '200px',
  overflowY: 'auto',
  zIndex: 100,
  listStyle: 'none',
  margin: 0,
  padding: 0,
  marginTop: '4px',
};
const suggestionItemStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  cursor: 'pointer',
  color: '#e0e0e0',
  borderBottom: '1px solid #4f4f7a',
  transition: 'background-color 0.15s',
};