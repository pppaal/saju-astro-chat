'use client';

import { useEffect, useMemo, useState, FormEvent } from 'react';
import tzLookup from 'tz-lookup';
import { getSupportedTimezones, getUserTimezone } from '@/lib/Saju/timezone';
import { searchCities } from '@/lib/cities';
import ServicePageLayout from '@/components/ui/ServicePageLayout';
import { useI18n } from '@/i18n/I18nProvider';
import {
  DREAM_SYMBOLS,
  DREAM_EMOTIONS,
  DREAM_THEMES,
  DREAM_CONTEXT,
  generateDreamPrompt,
  generateQuickDreamEntry,
} from '@/lib/dream/dreamPrompts';
import styles from './Dream.module.css';

type CityItem = { name: string; country: string; lat: number; lon: number };

type InsightResponse = {
  summary?: string;
  dreamSymbols?: { label: string; meaning: string }[];
  astrology?: { highlights: string[]; sun?: string; moon?: string; asc?: string };
  crossInsights?: string[];
  recommendations?: string[];
  themes?: { label: string; weight: number }[];
  raw?: any;
  error?: string;
};

export default function DreamInsightPage() {
  // Dream - Quick Select Mode
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [selectedContext, setSelectedContext] = useState<string[]>([]);
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [useDetailedMode, setUseDetailedMode] = useState(false);
  const [detailedDream, setDetailedDream] = useState('');
  const [share, setShare] = useState(false);

  // Birth data
  const [showBirthData, setShowBirthData] = useState(false);
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
  const [activeSymbolCategory, setActiveSymbolCategory] = useState<keyof typeof DREAM_SYMBOLS>('animals');

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

  const toggleSymbol = (symbol: string) => {
    setSelectedSymbols(prev =>
      prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol]
    );
  };

  const toggleEmotion = (emotion: string) => {
    setSelectedEmotions(prev =>
      prev.includes(emotion) ? prev.filter(e => e !== emotion) : [...prev, emotion]
    );
  };

  const toggleTheme = (theme: string) => {
    setSelectedThemes(prev =>
      prev.includes(theme) ? prev.filter(t => t !== theme) : [...prev, theme]
    );
  };

  const toggleContext = (context: string) => {
    setSelectedContext(prev =>
      prev.includes(context) ? prev.filter(c => c !== context) : [...prev, context]
    );
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    // Generate dream text based on mode
    let dreamText: string;
    if (useDetailedMode) {
      dreamText = detailedDream.trim();
    } else {
      if (selectedSymbols.length === 0 && selectedEmotions.length === 0 && !additionalDetails.trim()) {
        setIsLoading(false);
        setError('Please select at least some symbols or emotions, or describe your dream.');
        return;
      }
      dreamText = generateQuickDreamEntry({
        symbols: selectedSymbols,
        emotions: selectedEmotions,
        additionalDetails,
      });
    }

    if (!dreamText) {
      setIsLoading(false);
      setError('Please enter your dream.');
      return;
    }

    try {
      const body = {
        dream: dreamText,
        symbols: selectedSymbols,
        emotions: selectedEmotions,
        themes: selectedThemes,
        context: selectedContext,
        share,
        birth: showBirthData ? { date, time, latitude, longitude, timeZone, city: cityQuery } : undefined,
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

  const resetForm = () => {
    setSelectedSymbols([]);
    setSelectedEmotions([]);
    setSelectedThemes([]);
    setSelectedContext([]);
    setAdditionalDetails('');
    setDetailedDream('');
    setResult(null);
    setError(null);
  };

  return (
    <ServicePageLayout
      icon="🌙"
      title="Dream Insight"
      subtitle="Explore the deeper meaning of your dreams with astrological insights"
    >
      <main className={styles.page}>
        {/* Background Stars */}
        <div className={styles.stars}>
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className={styles.star}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 4}s`,
                animationDuration: `${3 + Math.random() * 3}s`,
              }}
            />
          ))}
        </div>

        {!result && (
          <div className={`${styles.formContainer} ${styles.fadeIn}`}>
            <div className={styles.formHeader}>
              <div className={styles.formIcon}>🌙</div>
              <h1 className={styles.formTitle}>Dream Interpretation</h1>
              <p className={styles.formSubtitle}>Select dream elements or write freely</p>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Mode Toggle */}
              <div className={styles.modeToggle}>
                <button
                  type="button"
                  className={!useDetailedMode ? styles.modeActive : styles.modeInactive}
                  onClick={() => setUseDetailedMode(false)}
                >
                  Quick Select
                </button>
                <button
                  type="button"
                  className={useDetailedMode ? styles.modeActive : styles.modeInactive}
                  onClick={() => setUseDetailedMode(true)}
                >
                  Write Freely
                </button>
              </div>

              {!useDetailedMode ? (
                <>
                  {/* Dream Symbols - Quick Select */}
                  <div className={styles.section}>
                    <label className={styles.sectionLabel}>Dream Symbols</label>
                    <p className={styles.sectionHint}>Select what you saw in your dream</p>

                    {/* Symbol Category Tabs */}
                    <div className={styles.categoryTabs}>
                      {(Object.keys(DREAM_SYMBOLS) as Array<keyof typeof DREAM_SYMBOLS>).map((category) => (
                        <button
                          key={category}
                          type="button"
                          className={activeSymbolCategory === category ? styles.tabActive : styles.tab}
                          onClick={() => setActiveSymbolCategory(category)}
                        >
                          {category}
                        </button>
                      ))}
                    </div>

                    <div className={styles.chipGrid}>
                      {DREAM_SYMBOLS[activeSymbolCategory].map((symbol) => (
                        <button
                          key={symbol.en}
                          type="button"
                          className={selectedSymbols.includes(symbol.en) ? styles.chipSelected : styles.chip}
                          onClick={() => toggleSymbol(symbol.en)}
                        >
                          {symbol.emoji} {symbol.ko}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dream Emotions */}
                  <div className={styles.section}>
                    <label className={styles.sectionLabel}>Emotions Felt</label>
                    <p className={styles.sectionHint}>How did the dream make you feel?</p>
                    <div className={styles.chipGrid}>
                      {DREAM_EMOTIONS.map((emotion) => (
                        <button
                          key={emotion.en}
                          type="button"
                          className={selectedEmotions.includes(emotion.en) ? styles.chipSelected : styles.chip}
                          onClick={() => toggleEmotion(emotion.en)}
                        >
                          {emotion.emoji} {emotion.ko}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dream Themes */}
                  <div className={styles.section}>
                    <label className={styles.sectionLabel}>Dream Type (Optional)</label>
                    <p className={styles.sectionHint}>What kind of dream was it?</p>
                    <div className={styles.chipGrid}>
                      {DREAM_THEMES.map((theme) => (
                        <button
                          key={theme.en}
                          type="button"
                          className={selectedThemes.includes(theme.ko) ? styles.chipSelected : styles.chip}
                          onClick={() => toggleTheme(theme.ko)}
                        >
                          {theme.ko}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dream Context */}
                  <div className={styles.section}>
                    <label className={styles.sectionLabel}>When/Context (Optional)</label>
                    <p className={styles.sectionHint}>When did you have this dream?</p>
                    <div className={styles.chipGrid}>
                      {DREAM_CONTEXT.map((ctx) => (
                        <button
                          key={ctx.en}
                          type="button"
                          className={selectedContext.includes(ctx.ko) ? styles.chipSelected : styles.chip}
                          onClick={() => toggleContext(ctx.ko)}
                        >
                          {ctx.ko}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Additional Details */}
                  <div className={styles.section}>
                    <label htmlFor="additionalDetails" className={styles.sectionLabel}>
                      Additional Details (Optional)
                    </label>
                    <textarea
                      id="additionalDetails"
                      placeholder="Add any other details about your dream..."
                      value={additionalDetails}
                      onChange={(e) => setAdditionalDetails(e.target.value)}
                      className={styles.textareaSmall}
                      rows={3}
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Detailed Dream Input */}
                  <div className={styles.section}>
                    <label htmlFor="detailedDream" className={styles.label}>
                      Describe your dream in detail
                    </label>
                    <textarea
                      id="detailedDream"
                      placeholder="Include key symbols, feelings, people, places, colors, and what happened..."
                      value={detailedDream}
                      onChange={(e) => setDetailedDream(e.target.value)}
                      className={styles.textarea}
                      rows={8}
                    />
                  </div>
                </>
              )}

              {/* Share Checkbox */}
              <div className={styles.checkbox}>
                <input
                  id="share"
                  type="checkbox"
                  checked={share}
                  onChange={(e) => setShare(e.target.checked)}
                />
                <label htmlFor="share">Share anonymously to the Dreamer Map</label>
              </div>

              {/* Birth Data (Collapsible) */}
              <div className={styles.collapsibleSection}>
                <button
                  type="button"
                  className={styles.collapsibleToggle}
                  onClick={() => setShowBirthData(!showBirthData)}
                >
                  {showBirthData ? '▼' : '▶'} Add Birth Data for Astrological Insights (Optional)
                </button>

                {showBirthData && (
                  <div className={styles.birthDataSection}>
                    <div className={`${styles.grid} ${styles.gridTwo}`}>
                      <div>
                        <label htmlFor="date" className={styles.label}>Date of Birth</label>
                        <input
                          id="date"
                          type="date"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className={styles.input}
                        />
                      </div>
                      <div>
                        <label htmlFor="time" className={styles.label}>Time of Birth</label>
                        <input
                          id="time"
                          type="time"
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                          className={styles.input}
                        />
                      </div>
                    </div>

                    <div className={styles.relative}>
                      <label htmlFor="city" className={styles.label}>City of Birth</label>
                      <input
                        id="city"
                        autoComplete="off"
                        value={cityQuery}
                        onChange={(e) => setCityQuery(e.target.value)}
                        onFocus={() => setShowDropdown(true)}
                        onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                        placeholder='e.g., "Seoul, KR"'
                        className={styles.input}
                      />
                      {showDropdown && suggestions.length > 0 && (
                        <ul className={styles.dropdown}>
                          {suggestions.map((s, i) => (
                            <li
                              key={`${s.country}-${s.name}-${i}`}
                              className={styles.dropdownItem}
                              onMouseDown={(e) => { e.preventDefault(); onPickCity(s); }}
                            >
                              {s.name}, {s.country}
                            </li>
                          ))}
                        </ul>
                      )}
                      <p className={styles.inputSmall}>Timezone auto-detected from city.</p>
                    </div>

                    <input type="hidden" name="latitude" value={latitude} />
                    <input type="hidden" name="longitude" value={longitude} />

                    <div>
                      <label htmlFor="timeZone" className={styles.label}>Time Zone</label>
                      <input
                        id="timeZone"
                        readOnly
                        value={timeZone}
                        className={styles.input}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className={styles.submitButton}
              >
                <span className={styles.buttonGlow} />
                {isLoading ? (
                  <>
                    <svg className={styles.spinner} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a 8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Analyzing...
                  </>
                ) : (
                  'Interpret My Dream'
                )}
              </button>

              {error && <div className={styles.error}>{error}</div>}
            </form>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className={styles.resultsContainer}>
            <button
              onClick={resetForm}
              className={styles.resetButton}
            >
              ← Interpret Another Dream
            </button>

            {result.summary && (
              <div className={`${styles.resultCard} ${styles.fadeIn}`} style={{ animationDelay: '0s' }}>
                <div className={styles.resultCardGlow} />
                <h2 className={styles.resultTitle}>Summary</h2>
                <p className={styles.resultText}>{result.summary}</p>
              </div>
            )}

            {Array.isArray(result.themes) && result.themes.length > 0 && (
              <div className={`${styles.resultCard} ${styles.fadeIn}`} style={{ animationDelay: '0.1s' }}>
                <div className={styles.resultCardGlow} />
                <h3 className={styles.resultTitle}>Themes</h3>
                <div>
                  {result.themes.map((t, idx) => (
                    <div key={idx} className={styles.themeBar}>
                      <div className={styles.themeLabel}>
                        <span>{t.label}</span>
                        <span className={styles.themePercent}>{Math.round(t.weight * 100)}%</span>
                      </div>
                      <div className={styles.themeBarContainer}>
                        <div
                          className={styles.themeBarFill}
                          style={{
                            width: `${Math.min(100, Math.max(0, t.weight * 100))}%`,
                            animationDelay: `${0.2 + idx * 0.1}s`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray(result.dreamSymbols) && result.dreamSymbols.length > 0 && (
              <div className={`${styles.resultCard} ${styles.fadeIn}`} style={{ animationDelay: '0.2s' }}>
                <div className={styles.resultCardGlow} />
                <h3 className={styles.resultTitle}>Key Symbols</h3>
                <ul className={styles.resultList}>
                  {result.dreamSymbols.map((s, i) => (
                    <li key={i}>
                      <span style={{ fontWeight: 600 }}>{s.label}:</span> {s.meaning}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.astrology && (
              <div className={`${styles.resultCard} ${styles.fadeIn}`} style={{ animationDelay: '0.3s' }}>
                <div className={styles.resultCardGlow} />
                <h3 className={styles.resultTitle}>Astrology Highlights</h3>
                <ul className={styles.resultList}>
                  {result.astrology.sun && <li>Sun: {result.astrology.sun}</li>}
                  {result.astrology.moon && <li>Moon: {result.astrology.moon}</li>}
                  {result.astrology.asc && <li>Ascendant: {result.astrology.asc}</li>}
                  {Array.isArray(result.astrology.highlights) &&
                    result.astrology.highlights.map((h, i) => <li key={i}>{h}</li>)}
                </ul>
              </div>
            )}

            {Array.isArray(result.crossInsights) && result.crossInsights.length > 0 && (
              <div className={`${styles.resultCard} ${styles.fadeIn}`} style={{ animationDelay: '0.4s' }}>
                <div className={styles.resultCardGlow} />
                <h3 className={styles.resultTitle}>Cross-Insights</h3>
                <ul className={styles.resultList}>
                  {result.crossInsights.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            )}

            {Array.isArray(result.recommendations) && result.recommendations.length > 0 && (
              <div className={`${styles.resultCard} ${styles.fadeIn}`} style={{ animationDelay: '0.5s' }}>
                <div className={styles.resultCardGlow} />
                <h3 className={styles.resultTitle}>Next Steps</h3>
                <ol className={styles.resultListOrdered}>
                  {result.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                </ol>
              </div>
            )}
          </div>
        )}
      </main>
    </ServicePageLayout>
  );
}
