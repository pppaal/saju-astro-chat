//src/app/astrology/page.tsx

'use client';

import { useState, FormEvent, useMemo, useEffect } from 'react';
import { getSupportedTimezones, getUserTimezone } from '@/lib/Saju/timezone';
import ResultDisplay from '@/components/astrology/ResultDisplay';
import { searchCities } from '@/lib/cities';
import tzLookup from 'tz-lookup';
import { useI18n } from '@/i18n/I18nProvider';

type CityItem = { name: string; country: string; lat: number; lon: number };

export default function Home() {
  const { locale, t } = useI18n();

  // 날짜/시간
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  // 결과/상태
  const [interpretation, setInterpretation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Details 데이터
  const [chartData, setChartData] = useState<any | null>(null);
  const [aspects, setAspects] = useState<any[] | null>(null);

  // Advanced 데이터
  const [advanced, setAdvanced] = useState<any | null>(null);

  // 타임존 목록
  const timezones = useMemo(() => getSupportedTimezones(), []);
  const [timeZone, setTimeZone] = useState<string>(() => {
    const list = getSupportedTimezones();
    return list[0] || getUserTimezone() || 'UTC';
  });

  // 도시 자동완성
  const [cityQuery, setCityQuery] = useState<string>('');
  const [suggestions, setSuggestions] = useState<CityItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // 좌표
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // 디바운스 자동완성
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

  // 도시 선택
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

    // 입력 검증
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
    } catch (e: any) {
      setIsLoading(false);
      setError(e?.message || (t('error.unknown') as string) || 'Unknown error.');
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
      if (!response.ok) throw new Error(result?.error || `서버 응답 오류: ${response.status}`);
      if (result?.error) throw new Error(result.error);

      // 해석 텍스트
      const possible =
        result?.interpretation ??
        result?.result ??
        result?.data?.interpretation ??
        result?.data?.summary;

      if (typeof possible === 'string' && possible.trim()) {
        setInterpretation(possible);
      } else {
        throw new Error(t('error.noData') || '서버 응답에 분석 데이터가 없습니다.');
      }

      // 기본 테이블 데이터
      if (result?.chartData) setChartData(result.chartData);
      if (Array.isArray(result?.aspects)) setAspects(result.aspects);

      // Advanced 데이터 (여러 경로 대비)
      const adv =
        result?.advanced ??
        result?.data?.advanced ??
        result?.chartData?.advanced ??
        null;

      // 디버그는 필요하면 개발자도구에서만 확인
      // console.log('advanced from API:', adv);

      setAdvanced(adv);
    } catch (err: any) {
      setError(err.message || (t('error.unknown') as string) || '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-12px); } 100% { transform: translateY(0px); } }
        @keyframes pan-background { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        .fade-in-card { animation: fadeIn 1s ease-out forwards; }
        .animate-float { animation: float 8s ease-in-out infinite; }
      `}</style>

      <main
        className="relative flex min-h-screen flex-col items-center justify-center p-4 md:p-8 text-white font-sans overflow-hidden"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?q=80&w=2071&auto=format&fit=crop')",
          backgroundSize: '150% auto',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          animation: 'pan-background 90s linear infinite',
        }}
      >
        <button
          type="button"
          onClick={() => window.history.back()}
          aria-label={t('app.back') || 'Back'}
          className="absolute left-4 top-4 md:left-6 md:top-6 z-10 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-black/30 text-white/85 backdrop-blur-sm text-xl hover:bg-black/45 transition-colors"
        >
          ←
        </button>

        <div className="w-full max-w-3xl mx-auto bg-black/40 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6 md:p-10 lg:p-14 fade-in-card animate-float">
          <div className="text-center mb-8 md:mb-10">
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-3">
              {t('ui.titleAstrology') || 'AI Natal Chart'}
            </h1>
            <p className="text-base md:text-lg text-indigo-200">
              {t('ui.subtitleAstrology') || 'Discover your cosmic map based on your birth information.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 md:space-y-7">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-7">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-indigo-100 mb-2">
                  {t('app.birthDate') || 'Birth Date'}
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="time" className="block text-sm font-medium text-indigo-100 mb-2">
                  {t('app.birthTime') || 'Birth Time'}
                </label>
                <input
                  type="time"
                  id="time"
                  name="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                />
              </div>
            </div>

            {/* 도시 자동완성 */}
            <div className="relative">
              <label htmlFor="city" className="block text-sm font-medium text-indigo-100 mb-2">
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
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
              />
              {showDropdown && suggestions.length > 0 && (
                <ul className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-lg border border-white/15 bg-black/70 backdrop-blur-md">
                  {suggestions.map((s, i) => (
                    <li
                      key={`${s.country}-${s.name}-${i}`}
                      className="px-4 py-2 hover:bg-white/10 cursor-pointer"
                      onMouseDown={(e) => { e.preventDefault(); onPickCity(s); }}
                    >
                      {s.name}, {s.country}
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-white/60 mt-2">
                {t('ui.tipChooseCity') || 'Tip: Choose a city; time zone will be set automatically.'}
              </p>
            </div>

            {/* 숨김 좌표 */}
            <input type="hidden" name="latitude" value={latitude ?? ''} />
            <input type="hidden" name="longitude" value={longitude ?? ''} />

            {/* 타임존 */}
            <div>
              <label htmlFor="timeZone" className="block text-sm font-medium text-indigo-100 mb-2">
                {t('ui.timeZone') || 'Time Zone'}
              </label>
              <div className="grid grid-cols-1 gap-2">
                <input
                  id="timeZone"
                  readOnly
                  value={timeZone}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400"
                />
                <details className="text-xs text-white/70">
                  <summary className="cursor-pointer">{t('ui.changeManually') || 'Change manually'}</summary>
                  <select
                    value={timeZone}
                    onChange={(e) => setTimeZone(e.target.value)}
                    className="mt-2 w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                  >
                    {timezones.map((tz) => (
                      <option key={tz} value={tz} className="bg-gray-900 text-white">{tz}</option>
                    ))}
                  </select>
                </details>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-400/50 text-white font-bold py-3.5 px-4 rounded-lg transition-all duration-300 shadow-lg flex items-center justify-center text-lg"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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

          <ResultDisplay
            isLoading={isLoading}
            error={error}
            interpretation={interpretation}
            chartData={chartData}
            aspects={aspects}
            advanced={advanced}
          />
        </div>
      </main>
    </>
  );
}