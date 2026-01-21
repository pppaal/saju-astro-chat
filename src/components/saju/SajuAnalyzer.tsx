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
  type DayMaster,
  type DaeunData,
  type YeonunData,
  type WolunData,
  type IljinData,
  type PillarData,
} from '../../lib/Saju';

interface CityResult {
  name: string;
  country: string;
  lat: number;
  lon: number;
}

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

  const [cityQuery, setCityQuery] = useState('');
  const [citySuggestions, setCitySuggestions] = useState<CityResult[]>([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>('');

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

  const handleCitySelect = useCallback((city: CityResult) => {
    setSelectedCity(`${city.name}, ${city.country}`);
    setCityQuery(`${city.name}, ${city.country}`);
    setShowCitySuggestions(false);

    try {
      const tz = tzLookup(city.lat, city.lon);
      if (tz && typeof tz === 'string') {
        setFormData(prev => ({ ...prev, timezone: tz }));
      }
    } catch {
      // ignore
    }
  }, []);

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
      setSajuResult(data as ApiFullResponse);

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
    <div className="w-full max-w-[600px] mx-auto">
      <form
        onSubmit={handleSubmit}
        className="bg-slate-800 p-8 rounded-xl border border-slate-600 mb-8"
        aria-label="사주 분석 입력 폼"
      >
        {/* 양력/음력 */}
        <div className="mb-5">
          <label htmlFor="calendarType" className="block font-medium mb-2 text-gray-200">
            양력/음력
          </label>
          <select
            id="calendarType"
            name="calendarType"
            value={formData.calendarType}
            onChange={handleInputChange}
            className="w-full p-3 border border-slate-600 rounded-md text-base bg-slate-900 text-white
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="solar">양력</option>
            <option value="lunar">음력</option>
          </select>
        </div>

        {/* 생년월일 */}
        <div className="mb-5">
          <label htmlFor="birthDate" className="block font-medium mb-2 text-gray-200">
            생년월일
          </label>
          <input
            id="birthDate"
            name="birthDate"
            type="date"
            value={formData.birthDate}
            onChange={handleInputChange}
            className="w-full p-3 border border-slate-600 rounded-md text-base bg-slate-900 text-white
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* 태어난 시간 */}
        <div className="mb-5">
          <label htmlFor="birthTime" className="block font-medium mb-2 text-gray-200">
            태어난 시간
          </label>
          <input
            id="birthTime"
            name="birthTime"
            type="time"
            value={formData.birthTime}
            onChange={handleInputChange}
            className="w-full p-3 border border-slate-600 rounded-md text-base bg-slate-900 text-white
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 성별 */}
        <div className="mb-5">
          <label htmlFor="gender" className="block font-medium mb-2 text-gray-200">
            성별
          </label>
          <select
            id="gender"
            name="gender"
            value={formData.gender}
            onChange={handleInputChange}
            className="w-full p-3 border border-slate-600 rounded-md text-base bg-slate-900 text-white
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="male">남자</option>
            <option value="female">여자</option>
          </select>
        </div>

        {/* 출생 도시 */}
        <div className="mb-5 relative">
          <label htmlFor="birthCity" className="block font-medium mb-2 text-gray-200">
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
            className="w-full p-3 border border-slate-600 rounded-md text-base bg-slate-900 text-white
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-describedby={selectedCity ? 'selected-city-info' : undefined}
            aria-autocomplete="list"
            aria-controls="city-suggestions"
            aria-expanded={showCitySuggestions}
          />
          {showCitySuggestions && citySuggestions.length > 0 && (
            <ul
              id="city-suggestions"
              role="listbox"
              className="absolute top-full left-0 right-0 bg-slate-800 border border-slate-600
                rounded-md max-h-[200px] overflow-y-auto z-50 mt-1"
            >
              {citySuggestions.map((city, idx) => (
                <li
                  key={`${city.name}-${city.country}-${idx}`}
                  role="option"
                  className="px-4 py-3 cursor-pointer text-gray-200 border-b border-slate-600
                    hover:bg-slate-700 transition-colors last:border-b-0"
                  onMouseDown={() => handleCitySelect(city)}
                >
                  {city.name}, {city.country}
                </li>
              ))}
            </ul>
          )}
          {selectedCity && (
            <p id="selected-city-info" className="text-sm text-blue-400 mt-1">
              ✓ 선택됨: {selectedCity} → 타임존 자동 설정됨
            </p>
          )}
        </div>

        {/* 타임존 */}
        <div className="mb-8">
          <label className="block font-medium mb-2 text-gray-200">타임존</label>
          <details className="mb-2">
            <summary className="cursor-pointer text-gray-400 text-sm hover:text-gray-300">
              고급: 타임존 직접 선택
            </summary>
            <input
              placeholder="타임존 검색 (예: seoul, new_york)"
              value={tzQuery}
              onChange={(e) => setTzQuery(e.target.value)}
              className="w-full p-3 border border-slate-600 rounded-md text-base bg-slate-900 text-white mt-2
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="타임존 검색"
            />
            <select
              name="timezone"
              value={formData.timezone}
              onChange={handleInputChange}
              className="w-full p-3 border border-slate-600 rounded-md text-base bg-slate-900 text-white mt-2
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="타임존 선택"
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
          <p className="text-sm text-gray-400">
            현재: <strong className="text-yellow-400">{formData.timezone}</strong>{' '}
            ({formatOffset(getOffsetMinutes(baseInstant, formData.timezone))})
          </p>
        </div>

        {/* 제출 버튼 */}
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full p-4 rounded-md text-lg font-bold text-white transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-800
            ${isLoading
              ? 'bg-slate-700 cursor-not-allowed opacity-60'
              : 'bg-blue-600 hover:bg-blue-500 cursor-pointer'
            }`}
          aria-busy={isLoading}
        >
          {isLoading ? '분석 중...' : '사주 분석하기'}
        </button>
      </form>

      {error && (
        <p className="text-red-400 mt-4 text-center" role="alert">
          오류: {error}
        </p>
      )}
      {sajuResult && <SajuResultDisplay result={sajuResult} />}
    </div>
  );
}
