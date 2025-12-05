'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupportedTimezones, getUserTimezone } from '@/lib/Saju/timezone';
import { searchCities } from '@/lib/cities';
import tzLookup from 'tz-lookup';
import ServicePageLayout from '@/components/ui/ServicePageLayout';
import styles from './Compatibility.module.css';

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

const relationIcons: Record<Relation, string> = {
  lover: '💕',
  friend: '🤝',
  other: '✨',
};

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
    <ServicePageLayout
      icon="💕"
      title="Compatibility Analysis"
      subtitle="Discover relationship compatibility through astrological birth data"
    >
      <main className={styles.page}>
        {/* Background Hearts */}
        <div className={styles.hearts}>
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className={styles.heart}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 8}s`,
                animationDuration: `${6 + Math.random() * 4}s`,
              }}
            >
              💖
            </div>
          ))}
        </div>

        {!resultText && (
          <div className={`${styles.formContainer} ${styles.fadeIn}`}>
            <div className={styles.formHeader}>
              <div className={styles.formIcon}>💕</div>
              <h1 className={styles.formTitle}>Relationship Compatibility</h1>
              <p className={styles.formSubtitle}>
                Explore the cosmic connections between hearts
              </p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
              {/* Count Selector */}
              <div className={styles.countSelector}>
                <label htmlFor="count" className={styles.countLabel}>
                  Number of People (2-4)
                </label>
                <input
                  id="count"
                  type="number"
                  min={2}
                  max={4}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className={styles.countInput}
                />
              </div>

              {/* Person Cards */}
              {persons.map((p, idx) => (
                <div
                  key={idx}
                  className={styles.personCard}
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  <div className={styles.cardGlow} />
                  <h3 className={styles.personTitle}>
                    <span className={styles.personIcon}>
                      {idx === 0 ? '👤' : relationIcons[p.relation || 'friend']}
                    </span>
                    Person {idx + 1}
                  </h3>

                  <div className={styles.grid}>
                    {/* Name */}
                    <div>
                      <label htmlFor={`name-${idx}`} className={styles.label}>
                        Name
                      </label>
                      <input
                        id={`name-${idx}`}
                        value={p.name}
                        onChange={(e) => update(idx, 'name', e.target.value)}
                        placeholder="Name"
                        className={styles.input}
                      />
                    </div>

                    {/* Date & Time */}
                    <div className={`${styles.grid} ${styles.gridTwo}`}>
                      <div>
                        <label htmlFor={`date-${idx}`} className={styles.label}>
                          Date of Birth
                        </label>
                        <input
                          id={`date-${idx}`}
                          type="date"
                          value={p.date}
                          onChange={(e) => update(idx, 'date', e.target.value)}
                          className={styles.input}
                        />
                      </div>
                      <div>
                        <label htmlFor={`time-${idx}`} className={styles.label}>
                          Time of Birth
                        </label>
                        <input
                          id={`time-${idx}`}
                          type="time"
                          value={p.time}
                          onChange={(e) => update(idx, 'time', e.target.value)}
                          className={styles.input}
                        />
                      </div>
                    </div>

                    {/* City Autocomplete */}
                    <div className={styles.relative}>
                      <label htmlFor={`city-${idx}`} className={styles.label}>
                        City of Birth
                      </label>
                      <input
                        id={`city-${idx}`}
                        autoComplete="off"
                        value={p.cityQuery}
                        onChange={(e) => update(idx, 'cityQuery', e.target.value)}
                        onFocus={() => update(idx, 'showDropdown', true)}
                        onBlur={() => setTimeout(() => update(idx, 'showDropdown', false), 200)}
                        placeholder='e.g., "Seoul, KR"'
                        className={styles.input}
                      />
                      {p.suggestions.length > 0 && p.showDropdown && (
                        <ul className={styles.dropdown}>
                          {p.suggestions.map((c, i) => (
                            <li
                              key={`${c.name}-${c.country}-${i}`}
                              className={styles.dropdownItem}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                onPickCity(idx, c);
                              }}
                            >
                              {c.name}, {c.country}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Timezone */}
                    <div>
                      <label htmlFor={`tz-${idx}`} className={styles.label}>
                        Time Zone
                      </label>
                      <select
                        id={`tz-${idx}`}
                        value={p.timeZone}
                        onChange={(e) => update(idx, 'timeZone', e.target.value)}
                        className={styles.select}
                      >
                        {timezones.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Relation (for Person 2+) */}
                    {idx > 0 && (
                      <div className={`${styles.grid} ${styles.gridTwo}`}>
                        <div>
                          <label htmlFor={`rel-${idx}`} className={styles.label}>
                            Relation to Person 1
                          </label>
                          <select
                            id={`rel-${idx}`}
                            value={p.relation ?? ''}
                            onChange={(e) => update(idx, 'relation', e.target.value as Relation)}
                            className={styles.select}
                          >
                            <option value="">Select relation</option>
                            <option value="lover">Partner / Lover 💕</option>
                            <option value="friend">Friend 🤝</option>
                            <option value="other">Other ✨</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor={`note-${idx}`} className={styles.label}>
                            Relation Note
                          </label>
                          <input
                            id={`note-${idx}`}
                            value={p.relationNote ?? ''}
                            onChange={(e) => update(idx, 'relationNote', e.target.value)}
                            placeholder="Short note"
                            disabled={p.relation !== 'other'}
                            className={styles.input}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={styles.submitButton}
              >
                <span className={styles.buttonGlow} />
                {isLoading ? (
                  <>
                    <svg
                      className={styles.spinner}
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Calculating...
                  </>
                ) : (
                  'Analyze Compatibility'
                )}
              </button>

              {error && <div className={styles.error}>{error}</div>}
            </form>
          </div>
        )}

        {/* Results */}
        {resultText && (
          <div className={styles.resultsContainer}>
            <div className={`${styles.resultCard} ${styles.fadeIn}`}>
              <div className={styles.resultCardGlow} />
              {resultText}
            </div>
          </div>
        )}
      </main>
    </ServicePageLayout>
  );
}
