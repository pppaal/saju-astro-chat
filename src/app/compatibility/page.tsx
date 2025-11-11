'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupportedTimezones, getUserTimezone } from '@/lib/Saju/timezone';
import { searchCities } from '@/lib/cities';
import tzLookup from 'tz-lookup';

type Relation = 'friend' | 'lover' | 'other';

type CityItem = { name: string; country: string; lat: number; lon: number };

type PersonForm = {
  name: string;
  date: string;
  time: string;
  cityQuery: string;
  lat: number | null;
  lon: number | null;
  timeZone: string;
  suggestions: CityItem[];
  showDropdown: boolean;

  // new: relation to Person 1 (Person 1 itself has no relation)
  relation?: Relation;
  relationNote?: string;
};

const makeEmptyPerson = (defaults?: Partial<PersonForm>): PersonForm => ({
  name: '',
  date: '1995-02-09',
  time: '06:40',
  cityQuery: 'Seoul, KR',
  lat: 37.5665,
  lon: 126.978,
  timeZone: getUserTimezone() || 'Asia/Seoul',
  suggestions: [],
  showDropdown: false,
  ...(defaults || {}),
});

export default function CompatPage() {
  // 인원수
  const [count, setCount] = useState<number>(2);

  // 타임존 목록
  const timezones = useMemo(() => getSupportedTimezones(), []);

  // 인원 배열
  const [persons, setPersons] = useState<PersonForm[]>([
    makeEmptyPerson({ name: 'Person 1' }),
    makeEmptyPerson({ name: 'Person 2', relation: 'lover' }),
  ]);

  // 결과/상태
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultText, setResultText] = useState<string | null>(null);

  // 인원수 변경 시 배열 조정
  useEffect(() => {
    setPersons((prev) => {
      const next = [...prev];
      if (count > prev.length) {
        for (let i = prev.length; i < count; i++) {
          next.push(makeEmptyPerson({ name: `Person ${i + 1}`, relation: 'friend' }));
        }
      } else if (count < prev.length) {
        next.length = count;
      }
      return next;
    });
  }, [count]);

  // 공용 업데이트 헬퍼
  const update = <K extends keyof PersonForm>(i: number, key: K, value: PersonForm[K]) => {
    setPersons((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [key]: value };
      return next;
    });
  };

  // 도시 자동완성 디바운스
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    persons.forEach((p, idx) => {
      const q = p.cityQuery.trim();
      if (q.length < 2) {
        if (p.suggestions.length) update(idx, 'suggestions', []);
        return;
      }
      const t = setTimeout(async () => {
        try {
          const items = (await searchCities(q, { limit: 20 })) as CityItem[];
          update(idx, 'suggestions', items);
          update(idx, 'showDropdown', true);
        } catch {
          update(idx, 'suggestions', []);
        }
      }, 150);
      timers.push(t);
    });
    return () => timers.forEach(clearTimeout);
  }, [persons.map((p) => p.cityQuery).join('|')]); // 간단 의존성

  const onPickCity = (i: number, item: CityItem) => {
    update(i, 'cityQuery', `${item.name}, ${item.country}`);
    update(i, 'lat', item.lat);
    update(i, 'lon', item.lon);
    update(i, 'showDropdown', false);
    update(i, 'suggestions', []);
    try {
      const guessed = tzLookup(item.lat, item.lon);
      if (guessed && typeof guessed === 'string') {
        update(i, 'timeZone', guessed);
      }
    } catch {
      /* keep previous timeZone */
    }
  };

  const validate = () => {
    if (count < 2 || count > 4) return '인원수는 2~4명만 가능합니다.';
    for (let i = 0; i < persons.length; i++) {
      const p = persons[i];
      if (!p.date || !p.time) return `${i + 1}번째 인원의 생년월일/시간을 입력해 주세요.`;
      if (p.lat == null || p.lon == null) return `${i + 1}번째 인원의 도시를 선택해 주세요.`;
      if (!p.timeZone) return `${i + 1}번째 인원의 타임존이 비어 있습니다.`;
      if (i > 0 && !p.relation) return `${i + 1}번째 인원의 관계 유형을 선택해 주세요.`;
      if (i > 0 && p.relation === 'other' && !p.relationNote?.trim()) {
        return `${i + 1}번째 인원의 관계 메모를 입력해 주세요.`;
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    setResultText(null);

    const v = validate();
    if (v) {
      setIsLoading(false);
      setError(v);
      return;
    }

    try {
      const body = {
        persons: persons.map((p, i) => ({
          name: p.name || undefined,
          date: p.date,
          time: p.time,
          city: p.cityQuery,
          latitude: p.lat,
          longitude: p.lon,
          timeZone: p.timeZone,
          relationToP1: i === 0 ? undefined : p.relation,
          relationNoteToP1: i === 0 ? undefined : p.relationNote,
        })),
      };

      const res = await fetch('/api/astrology/compat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `서버 오류: ${res.status}`);
      const text =
        json?.interpretation ??
        json?.result ??
        json?.data?.summary ??
        '분석 결과를 생성했지만 표시할 텍스트가 없습니다.';
      setResultText(text);
    } catch (e: any) {
      setError(e?.message || '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style jsx global>{`
        @keyframes pan-background { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }
        .animate-float { animation: float 8s ease-in-out infinite; }
      `}</style>

      <main
        className="relative flex min-h-screen flex-col items-center justify-center p-4 md:p-8 text-white font-sans overflow-hidden"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?q=80&w=2071&auto=format&fit=crop')",
          backgroundSize: '150% auto',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          animation: 'pan-background 90s linear infinite',
        }}
      >
        <button
          type="button"
          onClick={() => window.history.back()}
          aria-label="뒤로가기"
          title="뒤로가기"
          className="absolute left-4 top-4 md:left-6 md:top-6 z-10 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-black/30 text-white/85 backdrop-blur-sm text-xl hover:bg-black/45 transition-colors"
        >
          ←
        </button>

        <div className="w-full max-w-4xl mx-auto bg-black/40 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6 md:p-10 lg:p-12 animate-float">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-3">AI Compatibility</h1>
            <p className="text-base md:text-lg text-indigo-200">
              Compare 2–4 birth charts and get a relationship-focused reading.
            </p>
          </div>

          {/* 인원수 */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-indigo-100 mb-2">Number of people</label>
            <div className="flex gap-2">
              {[2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className={`px-4 py-2 rounded-lg border ${
                    count === n
                      ? 'bg-indigo-600 border-indigo-500'
                      : 'bg-white/10 border-white/20 hover:bg-white/15'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* 인원 카드 */}
          <div className="space-y-8">
            {persons.map((p, i) => (
              <div key={i} className="rounded-xl border border-white/15 bg-black/30 p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold">Person {i + 1}{i === 0 ? ' (You)' : ''}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-indigo-100 mb-2">Name</label>
                    <input
                      value={p.name}
                      onChange={(e) => update(i, 'name', e.target.value)}
                      placeholder={i === 0 ? 'Your name (optional)' : 'Optional'}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-indigo-100 mb-2">Date of Birth</label>
                    <input
                      type="date"
                      value={p.date}
                      onChange={(e) => update(i, 'date', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-indigo-100 mb-2">Time of Birth</label>
                    <input
                      type="time"
                      value={p.time}
                      onChange={(e) => update(i, 'time', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3"
                    />
                  </div>
                </div>

                {/* 도시 자동완성 */}
                <div className="mt-6 relative">
                  <label className="block text-sm font-medium text-indigo-100 mb-2">City of Birth</label>
                  <input
                    autoComplete="off"
                    value={p.cityQuery}
                    onChange={(e) => update(i, 'cityQuery', e.target.value)}
                    onFocus={() => update(i, 'showDropdown', true)}
                    onBlur={() => setTimeout(() => update(i, 'showDropdown', false), 150)}
                    placeholder='e.g., "Seoul, KR" or "London, GB"'
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3"
                  />
                  {p.showDropdown && p.suggestions.length > 0 && (
                    <ul className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-lg border border-white/15 bg-black/70 backdrop-blur-md">
                      {p.suggestions.map((s, j) => (
                        <li
                          key={`${s.country}-${s.name}-${j}`}
                          className="px-4 py-2 hover:bg-white/10 cursor-pointer"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            onPickCity(i, s);
                          }}
                        >
                          {s.name}, {s.country}
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="text-xs text-white/60 mt-2">
                    Tip: Choose a city; time zone will be set automatically.
                  </p>
                </div>

                {/* 타임존 */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-indigo-100 mb-2">Time Zone</label>
                  <div className="grid grid-cols-1 gap-2">
                    <input
                      readOnly
                      value={p.timeZone}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3"
                    />
                    <details className="text-xs text-white/70">
                      <summary className="cursor-pointer">Change manually</summary>
                      <select
                        value={p.timeZone}
                        onChange={(e) => update(i, 'timeZone', e.target.value)}
                        className="mt-2 w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2"
                      >
                        {timezones.map((tz) => (
                          <option key={tz} value={tz} className="bg-gray-900 text-white">
                            {tz}
                          </option>
                        ))}
                      </select>
                    </details>
                  </div>
                </div>

                {/* 관계: Person 2~N 에만 표시 */}
                {i > 0 && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-indigo-100 mb-2">
                      Relationship to Person 1
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {(['friend', 'lover', 'other'] as Relation[]).map((r) => (
                        <button
                          key={r}
                          onClick={() => update(i, 'relation', r)}
                          className={`px-4 py-2 rounded-lg border ${
                            p.relation === r
                              ? 'bg-indigo-600 border-indigo-500'
                              : 'bg-white/10 border-white/20 hover:bg-white/15'
                          }`}
                          type="button"
                        >
                          {r === 'friend' ? '친구' : r === 'lover' ? '애인' : '기타'}
                        </button>
                      ))}
                    </div>
                    {p.relation === 'other' && (
                      <input
                        value={p.relationNote || ''}
                        onChange={(e) => update(i, 'relationNote', e.target.value)}
                        placeholder="예: 가족, 동료, 썸 등"
                        className="mt-3 w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2"
                      />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="mt-8 w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-400/50 text-white font-bold py-3.5 px-4 rounded-lg transition-all duration-300 shadow-lg flex items-center justify-center text-lg"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a 8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Analyzing compatibility...
              </>
            ) : (
              'Generate Compatibility'
            )}
          </button>

          <div className="mt-6 whitespace-pre-wrap text-indigo-100">
            {error && <p className="text-red-300">{error}</p>}
            {!error && resultText && <p>{resultText}</p>}
          </div>
        </div>
      </main>
    </>
  );
}