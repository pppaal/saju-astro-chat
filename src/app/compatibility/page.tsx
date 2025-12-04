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
  const [count, setCount] = useState<number>(2);
  const timezones = useMemo(() => getSupportedTimezones(), []);

  const [persons, setPersons] = useState<PersonForm[]>([
    makeEmptyPerson({ name: 'Person 1' }),
    makeEmptyPerson({ name: 'Person 2', relation: 'lover' }),
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultText, setResultText] = useState<string | null>(null);

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

  const update = <K extends keyof PersonForm>(i: number, key: K, value: PersonForm[K]) => {
    setPersons((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [key]: value };
      return next;
    });
  };

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
  }, [persons]);

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
    if (count < 2 || count > 4) return 'Add between 2 and 4 people.';
    for (let i = 0; i < persons.length; i++) {
      const p = persons[i];
      if (!p.date || !p.time) return `${i + 1}: date and time are required.`;
      if (p.lat == null || p.lon == null) return `${i + 1}: select a city from suggestions.`;
      if (!p.timeZone) return `${i + 1}: timezone is required.`;
      if (i > 0 && !p.relation) return `${i + 1}: relation to Person 1 is required.`;
      if (i > 0 && p.relation === 'other' && !p.relationNote?.trim()) {
        return `${i + 1}: add a note for relation 'other'.`;
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    setResultText(null);

    const errorMsg = validate();
    if (errorMsg) {
      setIsLoading(false);
      setError(errorMsg);
      return;
    }

    try {
      const body = {
        persons: persons.map((p, idx) => ({
          name: p.name || `Person ${idx + 1}`,
          date: p.date,
          time: p.time,
          city: p.cityQuery,
          latitude: p.lat,
          longitude: p.lon,
          timeZone: p.timeZone,
          relationToP1: idx === 0 ? undefined : p.relation,
          relationNoteToP1: idx === 0 ? undefined : p.relationNote,
        })),
      };

      const res = await fetch('/api/compatibility', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || 'Server error');
      setResultText(data.interpretation || JSON.stringify(data, null, 2));
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch compatibility.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <h1>Compatibility</h1>
      <p>Enter up to 4 people to get a quick compatibility score.</p>

      <div style={{ margin: '16px 0' }}>
        <label>People count: </label>
        <input
          type="number"
          min={2}
          max={4}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
        />
      </div>

      {persons.map((p, idx) => (
        <div key={idx} style={{ border: '1px solid #ccc', padding: 12, marginBottom: 12 }}>
          <h3>Person {idx + 1}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input value={p.name} onChange={(e) => update(idx, 'name', e.target.value)} placeholder="Name" />
            <input value={p.date} onChange={(e) => update(idx, 'date', e.target.value)} placeholder="YYYY-MM-DD" />
            <input value={p.time} onChange={(e) => update(idx, 'time', e.target.value)} placeholder="HH:mm" />
            <input
              value={p.cityQuery}
              onChange={(e) => update(idx, 'cityQuery', e.target.value)}
              placeholder="City, Country"
            />

            <select value={p.timeZone} onChange={(e) => update(idx, 'timeZone', e.target.value)}>
              {timezones.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            {idx > 0 && (
              <>
                <select value={p.relation ?? ''} onChange={(e) => update(idx, 'relation', e.target.value as Relation)}>
                  <option value="">Relation to Person 1</option>
                  <option value="lover">Partner</option>
                  <option value="friend">Friend</option>
                  <option value="other">Other</option>
                </select>
                <input
                  value={p.relationNote ?? ''}
                  onChange={(e) => update(idx, 'relationNote', e.target.value)}
                  placeholder="Short note"
                  disabled={p.relation !== 'other'}
                />
              </>
            )}
          </div>

          {p.suggestions.length > 0 && p.showDropdown && (
            <div style={{ background: '#f3f4f6', padding: 8 }}>
              {p.suggestions.map((c) => (
                <div key={`${c.name}-${c.country}`} onClick={() => onPickCity(idx, c)} style={{ cursor: 'pointer', padding: 4 }}>
                  {c.name}, {c.country}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      <button onClick={handleSubmit} disabled={isLoading}>
        {isLoading ? 'Calculating...' : 'Calculate'}
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {resultText && (
        <pre style={{ whiteSpace: 'pre-wrap', marginTop: 16, padding: 12, background: '#f9fafb' }}>
          {resultText}
        </pre>
      )}
    </div>
  );
}
