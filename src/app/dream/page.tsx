'use client';

import { useEffect, useMemo, useState, FormEvent } from 'react';
import tzLookup from 'tz-lookup';
import { getSupportedTimezones, getUserTimezone } from '@/lib/Saju/timezone';
import { searchCities } from '@/lib/cities';

type CityItem = { name: string; country: string; lat: number; lon: number };

type InsightResponse = {
  summary?: string;
  dreamSymbols?: { label: string; meaning: string }[];
  astrology?: { highlights: string[]; sun?: string; moon?: string; asc?: string };
  crossInsights?: string[];
  recommendations?: string[];
  themes?: { label: string; weight: number }[]; // 0 ~ 1
  raw?: any;
  error?: string;
};

export default function DreamInsightPage() {
  // Dream
  const [dream, setDream] = useState('');
  const [share, setShare] = useState(false);

  // Birth data
  const [date, setDate] = useState('1995-02-09');
  const [time, setTime] = useState('06:40');
  const [cityQuery, setCityQuery] = useState('Seoul, KR');
  const [latitude, setLatitude] = useState(37.5665);
  const [longitude, setLongitude] = useState(126.978);
  const timezones = useMemo(() => getSupportedTimezones(), []);
  const [timeZone, setTimeZone] = useState(getUserTimezone() || 'Asia/Seoul');

  // Autocomplete
  const [suggestions, setSuggestions] = useState<CityItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InsightResponse | null>(null);

  // Autocomplete debounce
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

  const onPickCity = (item: CityItem) => {
    setCityQuery(`${item.name}, ${item.country}`);
    setLatitude(item.lat);
    setLongitude(item.lon);
    setShowDropdown(false);

    try {
      const guessed = tzLookup(item.lat, item.lon);
      if (guessed && typeof guessed === 'string') {
        setTimeZone(guessed);
      }
    } catch {}
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    const trimmed = dream.trim();
    if (!trimmed) {
      setIsLoading(false);
      setError('Please enter your dream.');
      return;
    }

    try {
      const body = {
        dream: trimmed,
        share,
        birth: { date, time, latitude, longitude, timeZone, city: cityQuery },
      };

      const res = await fetch('/api/dream-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data: InsightResponse = await res.json();
      if (!res.ok || data?.error) {
        throw new Error(data?.error || `Server error: ${res.status}`);
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn .5s ease-out forwards; }
      `}</style>

      <main className="relative min-h-screen p-4 md:p-8 text-white bg-[#0c0a1a]">
        <button
          type="button"
          onClick={() => window.history.back()}
          aria-label="Go back"
          className="absolute left-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-black/30 text-white/85 backdrop-blur-sm text-lg hover:bg-black/45 transition-colors"
        >
          ←
        </button>

        <h1 className="text-center text-3xl md:text-5xl font-extrabold mb-6 md:mb-8 text-[#a48fff] drop-shadow-lg">
          Dream + Natal Insight
        </h1>

        <div className="mx-auto w-full max-w-4xl bg-black/35 backdrop-blur-xl rounded-2xl border border-white/15 shadow-xl p-5 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Dream input */}
            <div>
              <label htmlFor="dream" className="block text-sm font-medium text-indigo-100 mb-2">
                Describe your dream
              </label>
              <textarea
                id="dream"
                placeholder="Include key symbols, feelings, people, places, colors, and what happened."
                value={dream}
                onChange={(e) => setDream(e.target.value)}
                className="w-full h-44 md:h-56 bg-white/10 border border-white/20 rounded-lg p-4 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
              />
              <div className="mt-2 flex items-center gap-2 text-sm">
                <input
                  id="share"
                  type="checkbox"
                  checked={share}
                  onChange={(e) => setShare(e.target.checked)}
                />
                <label htmlFor="share" className="text-white/80">Share anonymously to the Dreamer Map</label>
              </div>
            </div>

            {/* Birth data */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-indigo-100 mb-2">Date of Birth</label>
                <input
                  id="date"
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="time" className="block text-sm font-medium text-indigo-100 mb-2">Time of Birth</label>
                <input
                  id="time"
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                />
              </div>
            </div>

            {/* City autocomplete */}
            <div className="relative">
              <label htmlFor="city" className="block text-sm font-medium text-indigo-100 mb-2">City of Birth</label>
              <input
                id="city"
                autoComplete="off"
                value={cityQuery}
                onChange={(e) => setCityQuery(e.target.value)}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                placeholder='e.g., "Seoul, KR"'
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-400 focus:outline-none"
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
              <p className="text-xs text-white/60 mt-2">Tip: Timezone auto-detected from city.</p>
            </div>

            {/* Hidden lat/lon */}
            <input type="hidden" name="latitude" value={latitude} />
            <input type="hidden" name="longitude" value={longitude} />

            {/* Timezone */}
            <div>
              <label htmlFor="timeZone" className="block text-sm font-medium text-indigo-100 mb-2">Time Zone</label>
              <div className="grid grid-cols-1 gap-2">
                <input
                  id="timeZone"
                  readOnly
                  value={timeZone}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white"
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

            {/* Submit */}
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
                'Interpret My Dream'
              )}
            </button>
          </form>

          {/* Result */}
          <section className="mt-8 space-y-6 fade-in">
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-100">
                {error}
              </div>
            )}

            {result && (
              <div className="space-y-6">
                {result.summary && (
                  <div className="rounded-lg border border-white/15 bg-white/5 p-4">
                    <h2 className="text-xl font-semibold mb-2">Summary</h2>
                    <p className="text-white/90">{result.summary}</p>
                  </div>
                )}

                {Array.isArray(result.themes) && result.themes.length > 0 && (
                  <div className="rounded-lg border border-white/15 bg-white/5 p-4">
                    <h3 className="font-semibold mb-3">Themes</h3>
                    <div className="space-y-2">
                      {result.themes.map((t, idx) => (
                        <div key={idx}>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{t.label}</span>
                            <span className="text-white/60">{Math.round(t.weight * 100)}%</span>
                          </div>
                          <div className="h-2 w-full rounded bg-white/10 overflow-hidden">
                            <div
                              className="h-2 bg-gradient-to-r from-indigo-400 to-fuchsia-500"
                              style={{ width: `${Math.min(100, Math.max(0, t.weight * 100))}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {Array.isArray(result.dreamSymbols) && result.dreamSymbols.length > 0 && (
                  <div className="rounded-lg border border-white/15 bg-white/5 p-4">
                    <h3 className="font-semibold mb-3">Key Symbols</h3>
                    <ul className="list-disc pl-5 space-y-1 text-white/90">
                      {result.dreamSymbols.map((s, i) => (
                        <li key={i}>
                          <span className="font-medium">{s.label}:</span> {s.meaning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.astrology && (
                  <div className="rounded-lg border border-white/15 bg-white/5 p-4">
                    <h3 className="font-semibold mb-3">Astrology Highlights</h3>
                    <ul className="list-disc pl-5 space-y-1 text-white/90">
                      {result.astrology.sun && <li>Sun: {result.astrology.sun}</li>}
                      {result.astrology.moon && <li>Moon: {result.astrology.moon}</li>}
                      {result.astrology.asc && <li>Ascendant: {result.astrology.asc}</li>}
                      {Array.isArray(result.astrology.highlights) &&
                        result.astrology.highlights.map((h, i) => <li key={i}>{h}</li>)}
                    </ul>
                  </div>
                )}

                {Array.isArray(result.crossInsights) && result.crossInsights.length > 0 && (
                  <div className="rounded-lg border border-white/15 bg-white/5 p-4">
                    <h3 className="font-semibold mb-3">Cross-Insights</h3>
                    <ul className="list-disc pl-5 space-y-1 text-white/90">
                      {result.crossInsights.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                )}

                {Array.isArray(result.recommendations) && result.recommendations.length > 0 && (
                  <div className="rounded-lg border border-white/15 bg-white/5 p-4">
                    <h3 className="font-semibold mb-3">Next Steps</h3>
                    <ol className="list-decimal pl-5 space-y-1 text-white/90">
                      {result.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                    </ol>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}