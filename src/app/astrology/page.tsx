'use client';

import { useState, FormEvent, useMemo } from 'react';
import { getSupportedTimezones, getUserTimezone } from '@/lib/Saju/timezone';
import ResultDisplay from '@/components/astrology/ResultDisplay';

export default function Home() {
  // 날짜/시간
  const [date, setDate] = useState('1995-02-09');
  const [time, setTime] = useState('06:40');

  // 결과/상태
  const [interpretation, setInterpretation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 타임존
  const timezones = useMemo(() => getSupportedTimezones(), []);
  const [timeZone, setTimeZone] = useState<string>(getUserTimezone() || 'Asia/Seoul');

  // 도시 → 좌표 매핑 및 상태
  const cityCoords: Record<string, { lat: number; lon: number }> = {
    Seoul: { lat: 37.5665, lon: 126.9780 },
    Tokyo: { lat: 35.6762, lon: 139.6503 },
    HongKong: { lat: 22.3193, lon: 114.1694 },
    NewYork: { lat: 40.7128, lon: -74.0060 },
    London: { lat: 51.5074, lon: -0.1278 },
  };
  const [city, setCity] = useState<keyof typeof cityCoords>('Seoul');
  const [latitude, setLatitude] = useState<number>(cityCoords.Seoul.lat);
  const [longitude, setLongitude] = useState<number>(cityCoords.Seoul.lon);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setInterpretation(null);

    console.log('서버로 전송할 데이터:', { date, time, timeZone, latitude, longitude });

    try {
      const body = {
        date,        // "YYYY-MM-DD"
        time,        // "HH:mm"
        latitude,    // 선택한 도시의 위도
        longitude,   // 선택한 도시의 경도
        timeZone,    // 서버 필수 항목
      };

      const response = await fetch('/api/astrology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      console.log('서버 응답 JSON:', result);

      if (!response.ok) {
        throw new Error(result?.error || `서버 응답 오류: ${response.status}`);
      }

      // 서버가 200으로 error 필드를 내려보내는 경우 방어
      if (result?.error) {
        throw new Error(result.error);
      }

      // 다양한 키 이름에 대비
      const possible =
        result?.interpretation ??
        result?.result ??
        result?.data?.interpretation ??
        result?.data?.summary;

      if (typeof possible === 'string' && possible.trim()) {
        setInterpretation(possible);
      } else {
        console.warn('Unexpected server payload:', result);
        throw new Error('서버 응답에 분석 데이터가 없습니다.');
      }
    } catch (err: any) {
      console.error('폼 제출 중 에러 발생:', err);
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

            <div>
              <label htmlFor="city" className="block text-sm font-medium text-indigo-100 mb-2">City of Birth</label>
              <select
                id="city"
                name="city"
                value={city}
                onChange={(e) => {
                  const c = e.target.value as keyof typeof cityCoords;
                  setCity(c);
                  setLatitude(cityCoords[c].lat);
                  setLongitude(cityCoords[c].lon);
                }}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-400 focus:outline-none appearance-none"
              >
                {Object.keys(cityCoords).map((c) => (
                  <option key={c} value={c} className="bg-gray-900 text-white">{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-indigo-100 mb-2">Gender</label>
              <select
                id="gender"
                name="gender"
                required
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-400 focus:outline-none appearance-none"
              >
                <option value="male" className="bg-gray-900 text-white">Male</option>
                <option value="female" className="bg-gray-900 text-white">Female</option>
                <option value="other" className="bg-gray-900 text-white">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="timeZone" className="block text-sm font-medium text-indigo-100 mb-2">Time Zone</label>
              <select
                id="timeZone"
                name="timeZone"
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-400 focus:outline-none appearance-none"
              >
                {timezones.map((tz) => (
                  <option key={tz} value={tz} className="bg-gray-900 text-white">{tz}</option>
                ))}
              </select>
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
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
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