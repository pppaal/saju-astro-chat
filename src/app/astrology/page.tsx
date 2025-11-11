'use client';

import { useState, FormEvent, useMemo, useEffect } from 'react';
import { getSupportedTimezones, getUserTimezone } from '@/lib/Saju/timezone';
import ResultDisplay from '@/components/astrology/ResultDisplay';
import { searchCities } from '@/lib/cities';
import tzLookup from 'tz-lookup';

type CityItem = { name: string; country: string; lat: number; lon: number };

export default function Home() {
  // 날짜/시간
  const [date, setDate] = useState('1995-02-09');
  const [time, setTime] = useState('06:40');

  // 결과/상태
  const [interpretation, setInterpretation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 타임존 목록(선택적으로 표시만), 기본은 사용자 혹은 Asia/Seoul
  const timezones = useMemo(() => getSupportedTimezones(), []);
  const [timeZone, setTimeZone] = useState<string>(getUserTimezone() || 'Asia/Seoul');

  // 도시 자동완성 상태
  const [cityQuery, setCityQuery] = useState<string>('Seoul, KR');
  const [suggestions, setSuggestions] = useState<CityItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // 좌표(내부 상태로만 보관)
  const [latitude, setLatitude] = useState<number>(37.5665);
  const [longitude, setLongitude] = useState<number>(126.978);

  // 디바운스 자동완성
  useEffect(() => {
    const q = cityQuery.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const items = (await searchCities(q, { limit: 20 })) as CityItem[];
        setSuggestions(items);
        setShowDropdown(true);
      } catch {
        setSuggestions([]);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [cityQuery]);

  // 도시 선택 시: 위경도 설정 + 타임존 자동 추정 + 드롭다운 닫기
  const onPickCity = (item: CityItem) => {
    setCityQuery(`${item.name}, ${item.country}`);
    setLatitude(item.lat);
    setLongitude(item.lon);
    setShowDropdown(false);

    try {
      const guessed = tzLookup(item.lat, item.lon); // e.g., 'Asia/Seoul'
      if (guessed && typeof guessed === 'string') {
        setTimeZone(guessed);
      }
    } catch {
      // 경계 지역 등 오류 시 기존 timeZone 유지
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setInterpretation(null);

    try {
      const body = {
        date,
        time,
        latitude,
        longitude,
        timeZone,
        city: cityQuery,
      };

      const response = await fetch('/api/astrology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || `서버 응답 오류: ${response.status}`);
      if (result?.error) throw new Error(result.error);

      const possible =
        result?.interpretation ??
        result?.result ??
        result?.data?.interpretation ??
        result?.data?.summary;

      if (typeof possible === 'string' && possible.trim()) {
        setInterpretation(possible);
      } else {
        throw new Error('서버 응답에 분석 데이터가 없습니다.');
      }
    } catch (err: any) {
      setError(err.message || '알 수 없는 오류가 발생했습니다.');
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
          aria-label="Go back"
          className="absolute left-4 top-4 md:left-6 md:top-6 z-10 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-black/30 text-white/85 backdrop-blur-sm text-xl hover:bg-black/45 transition-colors"
        >
          ←
        </button>

        <div className="w-full max-w-3xl mx-auto bg-black/40 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6 md:p-10 lg:p-14 fade-in-card animate-float">
          <div className="text-center mb-8 md:mb-10">
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-3">AI Natal Chart</h1>
            <p className="text-base md:text-lg text-indigo-200">Discover your cosmic map based on your birth information.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 md:space-y-7">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-7">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-indigo-100 mb-2">Date of Birth</label>
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
                <label htmlFor="time" className="block text-sm font-medium text-indigo-100 mb-2">Time of Birth</label>
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
              <label htmlFor="city" className="block text-sm font-medium text-indigo-100 mb-2">City of Birth</label>
              <input
                id="city"
                name="city"
                autoComplete="off"
                value={cityQuery}
                onChange={(e) => setCityQuery(e.target.value)}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                placeholder='e.g., "Seoul, KR" or "London, GB"'
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
                      <span className="text-xs text-white/60"> {/* 좌표는 UI에서 감춤/축약 */}
                        {/* ({s.lat.toFixed(3)}, {s.lon.toFixed(3)}) */}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-white/60 mt-2">
                Tip: Choose a city; time zone will be set automatically.
              </p>
            </div>

            {/* 위도/경도 필드 숨김 처리 */}
            <input type="hidden" name="latitude" value={latitude} />
            <input type="hidden" name="longitude" value={longitude} />

            {/* 타임존은 자동 채움 + 필요 시만 수정 가능 */}
            <div>
              <label htmlFor="timeZone" className="block text-sm font-medium text-indigo-100 mb-2">Time Zone</label>
              <div className="grid grid-cols-1 gap-2">
                <input
                  id="timeZone"
                  readOnly
                  value={timeZone}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400"
                />
                <details className="text-xs text-white/70">
                  <summary className="cursor-pointer">Change manually</summary>
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
                  Analyzing...
                </>
              ) : (
                'Generate My Chart'
              )}
            </button>
          </form>

          <ResultDisplay isLoading={isLoading} error={error} interpretation={interpretation} />
        </div>
      </main>
    </>
  );
}