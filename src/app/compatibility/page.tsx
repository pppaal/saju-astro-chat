'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { getUserTimezone } from '@/lib/Saju/timezone';
import { searchCities } from '@/lib/cities';
import tzLookup from 'tz-lookup';
import ServicePageLayout from '@/components/ui/ServicePageLayout';
import { useI18n } from '@/i18n/I18nProvider';
import ShareButton from '@/components/share/ShareButton';
import { generateCompatibilityCard, CompatibilityData } from '@/components/share/cards/CompatibilityCard';
import { useRouter } from 'next/navigation';
import styles from './Compatibility.module.css';

type SavedPerson = {
  id: string;
  name: string;
  relation: string;
  birthDate?: string | null;
  birthTime?: string | null;
  gender?: string | null;
  birthCity?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  tzId?: string | null;
};

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
  date: '',
  time: '',
  cityQuery: '',
  lat: null,
  lon: null,
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

// Section title translation keys mapping
const sectionTitleKeys: Record<string, string> = {
  'Overall Score': 'compatibilityPage.sections.overallScore',
  'Saju Analysis': 'compatibilityPage.sections.sajuAnalysis',
  'Astrology Analysis': 'compatibilityPage.sections.astrologyAnalysis',
  'Element Harmony': 'compatibilityPage.sections.elementHarmony',
  'Love Compatibility': 'compatibilityPage.sections.loveCompatibility',
  'Communication': 'compatibilityPage.sections.communication',
  'Emotional Connection': 'compatibilityPage.sections.emotionalConnection',
  'Strengths': 'compatibilityPage.sections.strengths',
  'Challenges': 'compatibilityPage.sections.challenges',
  'Advice': 'compatibilityPage.sections.advice',
  'Summary': 'compatibilityPage.sections.summary',
  'Sun Sign': 'compatibilityPage.sections.sunSign',
  'Moon Sign': 'compatibilityPage.sections.moonSign',
  'Venus Aspect': 'compatibilityPage.sections.venusAspect',
  'Mars Aspect': 'compatibilityPage.sections.marsAspect',
  'Overview': 'compatibilityPage.sections.overview',
};

// Parse result text into sections for beautiful display
function parseResultSections(text: string): { title: string; icon: string; content: string }[] {
  const sections: { title: string; icon: string; content: string }[] = [];

  // Common section patterns with icons
  const sectionPatterns = [
    { pattern: /(?:^|\n)#+\s*(?:Overall|총합|종합|전체)\s*(?:Score|점수|Compatibility|궁합)/i, icon: '💫', title: 'Overall Score' },
    { pattern: /(?:^|\n)#+\s*(?:Saju|사주|Four Pillars)/i, icon: '☯️', title: 'Saju Analysis' },
    { pattern: /(?:^|\n)#+\s*(?:Astrology|점성술|별자리|Zodiac)/i, icon: '✨', title: 'Astrology Analysis' },
    { pattern: /(?:^|\n)#+\s*(?:Element|오행|五行)/i, icon: '🔮', title: 'Element Harmony' },
    { pattern: /(?:^|\n)#+\s*(?:Love|사랑|연애|Romance)/i, icon: '💕', title: 'Love Compatibility' },
    { pattern: /(?:^|\n)#+\s*(?:Communication|소통|대화)/i, icon: '💬', title: 'Communication' },
    { pattern: /(?:^|\n)#+\s*(?:Emotion|감정|Feeling)/i, icon: '💗', title: 'Emotional Connection' },
    { pattern: /(?:^|\n)#+\s*(?:Strength|강점|장점)/i, icon: '💪', title: 'Strengths' },
    { pattern: /(?:^|\n)#+\s*(?:Challenge|도전|과제|주의)/i, icon: '⚡', title: 'Challenges' },
    { pattern: /(?:^|\n)#+\s*(?:Advice|조언|충고)/i, icon: '💡', title: 'Advice' },
    { pattern: /(?:^|\n)#+\s*(?:Summary|요약|결론)/i, icon: '📝', title: 'Summary' },
    { pattern: /(?:^|\n)#+\s*(?:Sun|태양)/i, icon: '☀️', title: 'Sun Sign' },
    { pattern: /(?:^|\n)#+\s*(?:Moon|달|월)/i, icon: '🌙', title: 'Moon Sign' },
    { pattern: /(?:^|\n)#+\s*(?:Venus|금성)/i, icon: '💖', title: 'Venus Aspect' },
    { pattern: /(?:^|\n)#+\s*(?:Mars|화성)/i, icon: '🔥', title: 'Mars Aspect' },
  ];

  // Split by common section markers
  const lines = text.split('\n');
  let currentSection: { title: string; icon: string; content: string[] } | null = null;

  for (const line of lines) {
    let foundSection = false;

    for (const { pattern, icon, title } of sectionPatterns) {
      if (pattern.test(line)) {
        if (currentSection && currentSection.content.length > 0) {
          sections.push({
            title: currentSection.title,
            icon: currentSection.icon,
            content: currentSection.content.join('\n').trim(),
          });
        }
        currentSection = { title, icon, content: [] };
        foundSection = true;
        break;
      }
    }

    if (!foundSection && line.match(/^#{1,3}\s+.+/)) {
      // Generic heading
      if (currentSection && currentSection.content.length > 0) {
        sections.push({
          title: currentSection.title,
          icon: currentSection.icon,
          content: currentSection.content.join('\n').trim(),
        });
      }
      const headingText = line.replace(/^#+\s*/, '').trim();
      currentSection = { title: headingText, icon: '✨', content: [] };
    } else if (currentSection) {
      currentSection.content.push(line);
    } else if (line.trim()) {
      // Content before any section header
      if (!currentSection) {
        currentSection = { title: 'Overview', icon: '💫', content: [] };
      }
      currentSection.content.push(line);
    }
  }

  // Add last section
  if (currentSection && currentSection.content.length > 0) {
    sections.push({
      title: currentSection.title,
      icon: currentSection.icon,
      content: currentSection.content.join('\n').trim(),
    });
  }

  return sections;
}

// Extract score from text
function extractScore(text: string): number | null {
  const patterns = [
    /(\d{1,3})(?:\s*)?(?:%|점|\/100|out of 100)/i,
    /(?:score|점수|compatibility|궁합)[\s:]*(\d{1,3})/i,
    /(\d{1,3})(?:\s*)?(?:percent|퍼센트)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const score = parseInt(match[1], 10);
      if (score >= 0 && score <= 100) return score;
    }
  }
  return null;
}

export default function CompatPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [count, setCount] = useState<number>(2);

  const [persons, setPersons] = useState<PersonForm[]>([
    makeEmptyPerson({ name: '' }),
    makeEmptyPerson({ name: '', relation: 'lover' }),
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultText, setResultText] = useState<string | null>(null);

  // My Circle data
  const [circlePeople, setCirclePeople] = useState<SavedPerson[]>([]);
  const [showCircleDropdown, setShowCircleDropdown] = useState<number | null>(null);

  // NEW: Timing and Action Items from fusion system
  type TimingData = {
    current_month?: {
      branch: string;
      element: string;
      analysis: string;
    };
    good_days?: Array<{
      type: string;
      days: string;
      activities: string[];
      reason: string;
    }>;
    favorable_members?: number[];
    group_activities?: Array<{
      type: string;
      days: string;
      activities: string[];
      reason: string;
    }>;
  };

  type GroupAnalysisData = {
    element_distribution?: {
      oheng: Record<string, number>;
      astro: Record<string, number>;
      dominant_oheng: string | null;
      lacking_oheng: string | null;
      dominant_astro: string | null;
      lacking_astro: string | null;
    };
    pairwise_matrix?: Array<{
      pair: string;
      index: [number, number];
      saju: string;
      astro: string;
      // NEW: 상세 점수 정보
      score?: number;
      summary?: string;
      saju_details?: string[];
      astro_details?: string[];
      fusion_insights?: string[];
    }>;
    group_roles?: Record<string, string[]>;
  };

  type SynergyBreakdown = {
    total_score: number;
    overall_score?: number; // API returns overall_score
    avg_pair_score: number;
    oheng_bonus: number;
    astro_bonus: number;
    role_bonus: number;
    samhap_bonus: number;
    banghap_bonus?: number; // NEW: 방합 보너스
    size_adjustment: number;
    special_formations?: string[]; // NEW: 특수 합 설명
    best_pair: {
      pair: string;
      score: number;
      summary: string;
    };
    weakest_pair: {
      pair: string;
      score: number;
      summary: string;
    };
  };

  const [timing, setTiming] = useState<TimingData | null>(null);
  const [actionItems, setActionItems] = useState<string[]>([]);
  const [groupAnalysis, setGroupAnalysis] = useState<GroupAnalysisData | null>(null);
  const [synergyBreakdown, setSynergyBreakdown] = useState<SynergyBreakdown | null>(null);
  const [isGroupResult, setIsGroupResult] = useState(false);

  // Load circle people when logged in
  useEffect(() => {
    const loadCircle = async () => {
      if (status !== 'authenticated') return;
      try {
        const res = await fetch('/api/me/circle', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setCirclePeople(data.people || []);
        }
      } catch (e) {
        console.error('Failed to load circle:', e);
      }
    };
    loadCircle();
  }, [status]);

  // Fill person form from circle selection
  const fillFromCircle = (personIdx: number, savedPerson: SavedPerson) => {
    setPersons((prev) => {
      const next = [...prev];
      const mapRelation = (rel: string): Relation => {
        if (rel === 'partner') return 'lover';
        if (rel === 'friend') return 'friend';
        return 'other';
      };
      next[personIdx] = {
        ...next[personIdx],
        name: savedPerson.name,
        date: savedPerson.birthDate || '',
        time: savedPerson.birthTime || '',
        cityQuery: savedPerson.birthCity || '',
        lat: savedPerson.latitude || null,
        lon: savedPerson.longitude || null,
        timeZone: savedPerson.tzId || getUserTimezone() || 'Asia/Seoul',
        relation: personIdx > 0 ? mapRelation(savedPerson.relation) : undefined,
      };
      return next;
    });
    setShowCircleDropdown(null);
  };

  // Close circle dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(`.${styles.circleDropdownWrapper}`)) {
        setShowCircleDropdown(null);
      }
    };
    if (showCircleDropdown !== null) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showCircleDropdown]);

  useEffect(() => {
    setPersons((prev) => {
      const next = [...prev];
      if (count > prev.length) {
        for (let i = prev.length; i < count; i++) {
          next.push(makeEmptyPerson({ name: '', relation: 'friend' }));
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

  // Extract cityQuery values to avoid re-triggering when suggestions change
  // Also track if city is already selected (has lat/lon)
  const cityQueries = persons.map((p) => p.cityQuery);
  const citySelected = persons.map((p) => p.lat !== null && p.lon !== null);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    cityQueries.forEach((query, idx) => {
      const q = query.trim();
      // Skip if city already selected or query too short
      if (citySelected[idx] || q.length < 2) {
        setPersons((prev) => {
          if (prev[idx].suggestions.length === 0) return prev;
          const next = [...prev];
          next[idx] = { ...next[idx], suggestions: [], showDropdown: false };
          return next;
        });
        return;
      }
      const t = setTimeout(async () => {
        try {
          const items = (await searchCities(q, { limit: 20 })) as CityItem[];
          setPersons((prev) => {
            const next = [...prev];
            next[idx] = { ...next[idx], suggestions: items, showDropdown: true };
            return next;
          });
        } catch {
          setPersons((prev) => {
            const next = [...prev];
            next[idx] = { ...next[idx], suggestions: [] };
            return next;
          });
        }
      }, 150);
      timers.push(t);
    });
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityQueries.join('|'), citySelected.join('|')]);

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
    if (count < 2 || count > 5) return t('compatibilityPage.errorAddPeople', 'Add between 2 and 5 people.');
    for (let i = 0; i < persons.length; i++) {
      const p = persons[i];
      if (!p.date || !p.time) return `${i + 1}: ${t('compatibilityPage.errorDateTimeRequired', 'date and time are required.')}`;
      if (p.lat == null || p.lon == null) return `${i + 1}: ${t('compatibilityPage.errorSelectCity', 'select a city from suggestions.')}`;
      if (!p.timeZone) return `${i + 1}: ${t('compatibilityPage.errorTimezoneRequired', 'timezone is required.')}`;
      if (i > 0 && !p.relation) return `${i + 1}: ${t('compatibilityPage.errorRelationRequired', 'relation to Person 1 is required.')}`;
      if (i > 0 && p.relation === 'other' && !p.relationNote?.trim()) {
        return `${i + 1}: ${t('compatibilityPage.errorOtherNote', "add a note for relation 'other'.")}`;
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

      // NEW: Set timing and action items from fusion system
      if (data.timing) {
        setTiming(data.timing);
      }
      if (data.action_items && Array.isArray(data.action_items)) {
        setActionItems(data.action_items);
      }

      // NEW: Group analysis data
      if (data.is_group && data.group_analysis) {
        setGroupAnalysis(data.group_analysis);
        setIsGroupResult(true);
      } else {
        setGroupAnalysis(null);
        setIsGroupResult(false);
      }

      // NEW: Synergy breakdown
      if (data.synergy_breakdown) {
        setSynergyBreakdown(data.synergy_breakdown);
      } else {
        setSynergyBreakdown(null);
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to fetch compatibility.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (resultText) {
      setResultText(null);
      setError(null);
      setTiming(null);
      setActionItems([]);
      setGroupAnalysis(null);
      setSynergyBreakdown(null);
      setIsGroupResult(false);
    } else {
      router.back();
    }
  };

  // Parse results for beautiful display
  const sections = resultText ? parseResultSections(resultText) : [];
  const overallScore = resultText ? extractScore(resultText) : null;

  return (
    <ServicePageLayout
      icon="💕"
      title={t('compatibilityPage.analysisTitle', 'Compatibility Analysis')}
      subtitle={t('compatibilityPage.analysisSubtitle', 'Discover relationship compatibility through astrological birth data')}
      onBack={handleBack}
      backLabel={t('compatibilityPage.backToForm', 'Back')}
    >
      <main className={styles.page}>
        {/* Background Hearts - deterministic positions to avoid hydration mismatch */}
        <div className={styles.hearts}>
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className={styles.heart}
              style={{
                left: `${(i * 37 + 13) % 100}%`,
                top: `${(i * 53 + 7) % 100}%`,
                animationDelay: `${(i * 0.4) % 8}s`,
                animationDuration: `${6 + (i % 4)}s`,
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
              <h1 className={styles.formTitle}>{t('compatibilityPage.title', 'Relationship Compatibility')}</h1>
              <p className={styles.formSubtitle}>
                {t('compatibilityPage.subtitle', 'Explore the cosmic connections between hearts')}
              </p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
              {/* Count Selector */}
              <div className={styles.countSelector}>
                <label htmlFor="count" className={styles.countLabel}>
                  {t('compatibilityPage.numberOfPeople', 'Number of People (2-5)')}
                </label>
                <input
                  id="count"
                  type="number"
                  min={2}
                  max={5}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className={styles.countInput}
                />
              </div>

              {/* Person Cards - 2x2 Grid */}
              <div className={styles.personCardsGrid}>
              {persons.map((p, idx) => (
                <div
                  key={idx}
                  className={styles.personCard}
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  <div className={styles.cardGlow} />
                  <div className={styles.personTitleRow}>
                    <h3 className={styles.personTitle}>
                      <span className={styles.personIcon}>
                        {idx === 0 ? '👤' : relationIcons[p.relation || 'friend']}
                      </span>
                      {t('compatibilityPage.person', 'Person')} {idx + 1}
                    </h3>
                    {/* My Circle import button */}
                    {session && circlePeople.length > 0 && (
                      <div className={styles.circleDropdownWrapper}>
                        <button
                          type="button"
                          className={styles.circleImportBtn}
                          onClick={() => setShowCircleDropdown(showCircleDropdown === idx ? null : idx)}
                        >
                          👥 {t('compatibilityPage.fromCircle', 'My Circle')}
                        </button>
                        {showCircleDropdown === idx && (
                          <ul className={styles.circleDropdown}>
                            {circlePeople.map((cp) => (
                              <li
                                key={cp.id}
                                className={styles.circleDropdownItem}
                                onClick={() => fillFromCircle(idx, cp)}
                              >
                                <span className={styles.circlePersonName}>{cp.name}</span>
                                <span className={styles.circlePersonRelation}>
                                  {cp.relation === 'partner' ? '❤️' : cp.relation === 'family' ? '👨‍👩‍👧‍👦' : cp.relation === 'friend' ? '🤝' : '💼'}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>

                  <div className={styles.grid}>
                    {/* Name */}
                    <div>
                      <label htmlFor={`name-${idx}`} className={styles.label}>
                        {t('compatibilityPage.name', 'Name')}
                      </label>
                      <input
                        id={`name-${idx}`}
                        value={p.name}
                        onChange={(e) => update(idx, 'name', e.target.value)}
                        placeholder={t('compatibilityPage.namePlaceholder', 'Name')}
                        className={styles.input}
                      />
                    </div>

                    {/* Date & Time */}
                    <div className={`${styles.grid} ${styles.gridTwo}`}>
                      <div>
                        <label htmlFor={`date-${idx}`} className={styles.label}>
                          {t('compatibilityPage.dateOfBirth', 'Date of Birth')}
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
                          {t('compatibilityPage.timeOfBirth', 'Time of Birth')}
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
                        {t('compatibilityPage.cityOfBirth', 'City of Birth')}
                      </label>
                      <input
                        id={`city-${idx}`}
                        autoComplete="off"
                        value={p.cityQuery}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPersons((prev) => {
                            const next = [...prev];
                            next[idx] = { ...next[idx], cityQuery: val, lat: null, lon: null };
                            return next;
                          });
                        }}
                        onFocus={() => {
                          if (p.lat === null) update(idx, 'showDropdown', true);
                        }}
                        onBlur={() => setTimeout(() => update(idx, 'showDropdown', false), 200)}
                        placeholder={t('compatibilityPage.cityPlaceholder', 'e.g., Seoul, KR')}
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

                    {/* Timezone (auto-set, readonly) */}
                    <div>
                      <label htmlFor={`tz-${idx}`} className={styles.label}>
                        {t('compatibilityPage.timeZone', 'Time Zone')}
                      </label>
                      <input
                        id={`tz-${idx}`}
                        type="text"
                        value={p.timeZone}
                        readOnly
                        className={`${styles.input} ${styles.inputReadonly}`}
                        title={t('compatibilityPage.timezoneAutoSet', 'Automatically set based on city')}
                      />
                    </div>

                    {/* Relation (for Person 2+) */}
                    {idx > 0 && (
                      <div className={`${styles.grid} ${styles.gridTwo}`}>
                        <div>
                          <label htmlFor={`rel-${idx}`} className={styles.label}>
                            {t('compatibilityPage.relationToPerson1', 'Relation to Person 1')}
                          </label>
                          <select
                            id={`rel-${idx}`}
                            value={p.relation ?? ''}
                            onChange={(e) => update(idx, 'relation', e.target.value as Relation)}
                            className={styles.select}
                          >
                            <option value="">{t('compatibilityPage.selectRelation', 'Select relation')}</option>
                            <option value="lover">{t('compatibilityPage.partnerLover', 'Partner / Lover 💕')}</option>
                            <option value="friend">{t('compatibilityPage.friend', 'Friend 🤝')}</option>
                            <option value="other">{t('compatibilityPage.other', 'Other ✨')}</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor={`note-${idx}`} className={styles.label}>
                            {t('compatibilityPage.relationNote', 'Relation Note')}
                          </label>
                          <input
                            id={`note-${idx}`}
                            value={p.relationNote ?? ''}
                            onChange={(e) => update(idx, 'relationNote', e.target.value)}
                            placeholder={t('compatibilityPage.shortNote', 'Short note')}
                            className={styles.input}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              </div>

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
                    {t('compatibilityPage.calculating', 'Calculating...')}
                  </>
                ) : (
                  t('compatibilityPage.analyzeCompatibility', 'Analyze Compatibility')
                )}
              </button>

              {error && <div className={styles.error}>{error}</div>}
            </form>
          </div>
        )}

        {/* Results */}
        {resultText && (
          <div className={`${styles.resultsContainer} ${styles.fadeIn}`}>
            {/* Result Header */}
            <div className={styles.resultHeader}>
              <div className={styles.resultIcon}>💕</div>
              <h1 className={styles.resultTitle}>
                {t('compatibilityPage.resultTitle', 'Compatibility Analysis')}
              </h1>
              <p className={styles.resultSubtitle}>
                {persons.map(p => p.name || 'Person').join(' & ')}
              </p>
            </div>

            {/* Overall Score Circle */}
            {overallScore !== null && (
              <div className={styles.scoreSection}>
                <div className={styles.scoreCircle}>
                  <div className={styles.scoreCircleBg} />
                  <div
                    className={styles.scoreCircleProgress}
                    style={{ '--progress': `${overallScore}%` } as React.CSSProperties}
                  />
                  <span className={styles.scoreValue}>{overallScore}</span>
                </div>
                <span className={styles.scoreLabel}>
                  {t('compatibilityPage.overallCompatibility', 'Overall Compatibility')}
                </span>
              </div>
            )}

            {/* Parsed Sections */}
            {sections.length > 0 ? (
              <div className={styles.resultSections}>
                {sections.map((section, idx) => (
                  <div
                    key={idx}
                    className={`${styles.resultCard} ${section.content.length > 300 ? styles.resultCardFullWidth : ''}`}
                  >
                    <div className={styles.resultCardGlow} />
                    <div className={styles.resultCardHeader}>
                      <span className={styles.resultCardIcon}>{section.icon}</span>
                      <h3 className={styles.resultCardTitle}>
                        {sectionTitleKeys[section.title]
                          ? t(sectionTitleKeys[section.title], section.title)
                          : section.title}
                      </h3>
                    </div>
                    <div className={styles.resultCardContent}>
                      {section.content.split('\n').map((line, i) => {
                        // Check if line contains a score/percentage
                        const scoreMatch = line.match(/(\d{1,3})(?:\s*)?(?:%|점|\/100)/);
                        if (scoreMatch) {
                          const lineScore = parseInt(scoreMatch[1], 10);
                          if (lineScore >= 0 && lineScore <= 100) {
                            return (
                              <div key={i}>
                                <p>{line.replace(scoreMatch[0], '').trim()}</p>
                                <div className={styles.scoreBar}>
                                  <div className={styles.scoreBarHeader}>
                                    <span>{t('compatibilityPage.score', 'Score')}</span>
                                    <span>{lineScore}%</span>
                                  </div>
                                  <div className={styles.scoreBarTrack}>
                                    <div
                                      className={styles.scoreBarFill}
                                      style={{ width: `${lineScore}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          }
                        }
                        // Regular paragraph
                        if (line.trim()) {
                          return <p key={i}>{line}</p>;
                        }
                        return null;
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Fallback: plain text display with beautiful styling
              <div className={styles.interpretationText}>
                {resultText}
              </div>
            )}

            {/* Group Analysis Section - NEW */}
            {isGroupResult && groupAnalysis && (
              <div className={styles.groupAnalysisSection}>
                {/* Element Distribution */}
                {groupAnalysis.element_distribution && (
                  <div className={styles.resultCard}>
                    <div className={styles.resultCardGlow} />
                    <div className={styles.resultCardHeader}>
                      <span className={styles.resultCardIcon}>🔮</span>
                      <h3 className={styles.resultCardTitle}>
                        {t('compatibilityPage.groupElementDistribution', '그룹 원소 분포')}
                      </h3>
                    </div>
                    <div className={styles.resultCardContent}>
                      <div className={styles.elementDistribution}>
                        <div className={styles.elementColumn}>
                          <h4>☯️ 오행 (五行)</h4>
                          <div className={styles.elementBars}>
                            {Object.entries(groupAnalysis.element_distribution.oheng).map(([key, val]) => (
                              <div key={key} className={styles.elementBar}>
                                <span className={styles.elementLabel}>{key}</span>
                                <div className={styles.elementBarTrack}>
                                  <div
                                    className={styles.elementBarFill}
                                    style={{ width: `${(val / persons.length) * 100}%` }}
                                  />
                                </div>
                                <span className={styles.elementValue}>{val}</span>
                              </div>
                            ))}
                          </div>
                          {groupAnalysis.element_distribution.dominant_oheng && (
                            <p className={styles.elementNote}>
                              🔥 지배적: <strong>{groupAnalysis.element_distribution.dominant_oheng}</strong>
                            </p>
                          )}
                          {groupAnalysis.element_distribution.lacking_oheng && (
                            <p className={styles.elementNote}>
                              💧 부족: <strong>{groupAnalysis.element_distribution.lacking_oheng}</strong>
                            </p>
                          )}
                        </div>
                        <div className={styles.elementColumn}>
                          <h4>✨ 점성 원소</h4>
                          <div className={styles.elementBars}>
                            {Object.entries(groupAnalysis.element_distribution.astro).map(([key, val]) => (
                              <div key={key} className={styles.elementBar}>
                                <span className={styles.elementLabel}>
                                  {key === 'fire' ? '🔥 Fire' : key === 'earth' ? '🌍 Earth' : key === 'air' ? '💨 Air' : '💧 Water'}
                                </span>
                                <div className={styles.elementBarTrack}>
                                  <div
                                    className={styles.elementBarFill}
                                    style={{ width: `${(val / persons.length) * 100}%` }}
                                  />
                                </div>
                                <span className={styles.elementValue}>{val}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Group Roles */}
                {groupAnalysis.group_roles && Object.values(groupAnalysis.group_roles).some(arr => arr.length > 0) && (
                  <div className={styles.resultCard}>
                    <div className={styles.resultCardGlow} />
                    <div className={styles.resultCardHeader}>
                      <span className={styles.resultCardIcon}>🎭</span>
                      <h3 className={styles.resultCardTitle}>
                        {t('compatibilityPage.groupRoles', '그룹 역할 분석')}
                      </h3>
                    </div>
                    <div className={styles.resultCardContent}>
                      <div className={styles.rolesGrid}>
                        {groupAnalysis.group_roles.leader && groupAnalysis.group_roles.leader.length > 0 && (
                          <div className={styles.roleItem}>
                            <span className={styles.roleIcon}>🔥</span>
                            <span className={styles.roleLabel}>리더십</span>
                            <span className={styles.roleMembers}>{groupAnalysis.group_roles.leader.join(', ')}</span>
                          </div>
                        )}
                        {groupAnalysis.group_roles.mediator && groupAnalysis.group_roles.mediator.length > 0 && (
                          <div className={styles.roleItem}>
                            <span className={styles.roleIcon}>⚖️</span>
                            <span className={styles.roleLabel}>중재자</span>
                            <span className={styles.roleMembers}>{groupAnalysis.group_roles.mediator.join(', ')}</span>
                          </div>
                        )}
                        {groupAnalysis.group_roles.catalyst && groupAnalysis.group_roles.catalyst.length > 0 && (
                          <div className={styles.roleItem}>
                            <span className={styles.roleIcon}>⚡</span>
                            <span className={styles.roleLabel}>촉매제</span>
                            <span className={styles.roleMembers}>{groupAnalysis.group_roles.catalyst.join(', ')}</span>
                          </div>
                        )}
                        {groupAnalysis.group_roles.stabilizer && groupAnalysis.group_roles.stabilizer.length > 0 && (
                          <div className={styles.roleItem}>
                            <span className={styles.roleIcon}>🏔️</span>
                            <span className={styles.roleLabel}>안정자</span>
                            <span className={styles.roleMembers}>{groupAnalysis.group_roles.stabilizer.join(', ')}</span>
                          </div>
                        )}
                        {groupAnalysis.group_roles.creative && groupAnalysis.group_roles.creative.length > 0 && (
                          <div className={styles.roleItem}>
                            <span className={styles.roleIcon}>💡</span>
                            <span className={styles.roleLabel}>창의력</span>
                            <span className={styles.roleMembers}>{groupAnalysis.group_roles.creative.join(', ')}</span>
                          </div>
                        )}
                        {groupAnalysis.group_roles.emotional && groupAnalysis.group_roles.emotional.length > 0 && (
                          <div className={styles.roleItem}>
                            <span className={styles.roleIcon}>💗</span>
                            <span className={styles.roleLabel}>감정 지지</span>
                            <span className={styles.roleMembers}>{groupAnalysis.group_roles.emotional.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Synergy Breakdown */}
                {synergyBreakdown && (
                  <div className={styles.resultCard}>
                    <div className={styles.resultCardGlow} />
                    <div className={styles.resultCardHeader}>
                      <span className={styles.resultCardIcon}>📊</span>
                      <h3 className={styles.resultCardTitle}>
                        {t('compatibilityPage.synergyBreakdown', '시너지 점수 분석')}
                      </h3>
                    </div>
                    <div className={styles.resultCardContent}>
                      <div className={styles.synergyScore}>
                        <div className={styles.totalScore}>
                          <span className={styles.totalScoreValue}>{synergyBreakdown.overall_score ?? synergyBreakdown.total_score}</span>
                          <span className={styles.totalScoreLabel}>/100점</span>
                        </div>
                        {/* Special Formations (삼합/방합) */}
                        {synergyBreakdown.special_formations && synergyBreakdown.special_formations.length > 0 && (
                          <div className={styles.specialFormations}>
                            {synergyBreakdown.special_formations.map((formation, idx) => (
                              <div key={idx} className={styles.formationItem}>{formation}</div>
                            ))}
                          </div>
                        )}
                        <div className={styles.scoreBreakdown}>
                          <div className={styles.breakdownItem}>
                            <span>1:1 평균</span>
                            <span>{synergyBreakdown.avg_pair_score}점</span>
                          </div>
                          {synergyBreakdown.oheng_bonus > 0 && (
                            <div className={styles.breakdownItem}>
                              <span>오행 다양성</span>
                              <span className={styles.bonusText}>+{synergyBreakdown.oheng_bonus}</span>
                            </div>
                          )}
                          {synergyBreakdown.astro_bonus > 0 && (
                            <div className={styles.breakdownItem}>
                              <span>점성 다양성</span>
                              <span className={styles.bonusText}>+{synergyBreakdown.astro_bonus}</span>
                            </div>
                          )}
                          {synergyBreakdown.role_bonus > 0 && (
                            <div className={styles.breakdownItem}>
                              <span>역할 균형</span>
                              <span className={styles.bonusText}>+{synergyBreakdown.role_bonus}</span>
                            </div>
                          )}
                          {synergyBreakdown.samhap_bonus > 0 && (
                            <div className={styles.breakdownItem}>
                              <span>🌟 삼합 보너스</span>
                              <span className={styles.bonusText}>+{synergyBreakdown.samhap_bonus}</span>
                            </div>
                          )}
                          {synergyBreakdown.banghap_bonus && synergyBreakdown.banghap_bonus > 0 && (
                            <div className={styles.breakdownItem}>
                              <span>🧭 방합 보너스</span>
                              <span className={styles.bonusText}>+{synergyBreakdown.banghap_bonus}</span>
                            </div>
                          )}
                          {synergyBreakdown.size_adjustment !== 0 && (
                            <div className={styles.breakdownItem}>
                              <span>인원 조정</span>
                              <span className={synergyBreakdown.size_adjustment > 0 ? styles.bonusText : styles.penaltyText}>
                                {synergyBreakdown.size_adjustment}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className={styles.pairHighlights}>
                          <div className={styles.highlightItem}>
                            <span className={styles.highlightIcon}>🏆</span>
                            <span className={styles.highlightLabel}>최고 궁합</span>
                            <span className={styles.highlightPair}>{synergyBreakdown.best_pair.pair}</span>
                            <span className={styles.highlightScore}>{synergyBreakdown.best_pair.score}점</span>
                          </div>
                          <div className={styles.highlightItem}>
                            <span className={styles.highlightIcon}>⚠️</span>
                            <span className={styles.highlightLabel}>주의 궁합</span>
                            <span className={styles.highlightPair}>{synergyBreakdown.weakest_pair.pair}</span>
                            <span className={styles.highlightScore}>{synergyBreakdown.weakest_pair.score}점</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pairwise Matrix - Enhanced with scores */}
                {groupAnalysis.pairwise_matrix && groupAnalysis.pairwise_matrix.length > 0 && (
                  <div className={styles.resultCard}>
                    <div className={styles.resultCardGlow} />
                    <div className={styles.resultCardHeader}>
                      <span className={styles.resultCardIcon}>👥</span>
                      <h3 className={styles.resultCardTitle}>
                        {t('compatibilityPage.pairwiseMatrix', '1:1 궁합 조합')} ({groupAnalysis.pairwise_matrix.length}개)
                      </h3>
                    </div>
                    <div className={styles.resultCardContent}>
                      <div className={styles.pairwiseGrid}>
                        {groupAnalysis.pairwise_matrix.map((pair, idx) => (
                          <div key={idx} className={styles.pairItem}>
                            <div className={styles.pairHeader}>
                              <span className={styles.pairIcon}>💕</span>
                              <span className={styles.pairName}>{pair.pair}</span>
                              {pair.score !== undefined && (
                                <span className={styles.pairScore}>{pair.score}점</span>
                              )}
                            </div>
                            {pair.summary && (
                              <p className={styles.pairSummary}>{pair.summary}</p>
                            )}
                            <div className={styles.pairDetails}>
                              <span className={styles.pairSaju}>☯️ {pair.saju}</span>
                              <span className={styles.pairAstro}>✨ {pair.astro}</span>
                            </div>
                            {/* Detailed Analysis */}
                            {(pair.saju_details && pair.saju_details.length > 0) && (
                              <div className={styles.pairAnalysis}>
                                {pair.saju_details.map((detail, i) => (
                                  <p key={i} className={styles.analysisItem}>{detail}</p>
                                ))}
                              </div>
                            )}
                            {(pair.astro_details && pair.astro_details.length > 0) && (
                              <div className={styles.pairAnalysis}>
                                {pair.astro_details.map((detail, i) => (
                                  <p key={i} className={styles.analysisItem}>{detail}</p>
                                ))}
                              </div>
                            )}
                            {(pair.fusion_insights && pair.fusion_insights.length > 0) && (
                              <div className={styles.fusionInsights}>
                                {pair.fusion_insights.map((insight, i) => (
                                  <p key={i} className={styles.fusionItem}>{insight}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Timing Guide Section */}
            {timing && (
              <div className={styles.timingSection}>
                <div className={styles.resultCard}>
                  <div className={styles.resultCardGlow} />
                  <div className={styles.resultCardHeader}>
                    <span className={styles.resultCardIcon}>📅</span>
                    <h3 className={styles.resultCardTitle}>
                      {t('compatibilityPage.timingGuide', 'Timing Guide')}
                    </h3>
                  </div>
                  <div className={styles.resultCardContent}>
                    {timing.current_month && (
                      <div className={styles.timingItem}>
                        <h4>🌙 {t('compatibilityPage.thisMonth', 'This Month')}</h4>
                        <p className={styles.timingBranch}>
                          {timing.current_month.branch} ({timing.current_month.element})
                        </p>
                        <p>{timing.current_month.analysis}</p>
                      </div>
                    )}
                    {/* Group Activities for group analysis */}
                    {isGroupResult && timing.group_activities && timing.group_activities.length > 0 && (
                      <div className={styles.goodDays}>
                        <h4>👥 {t('compatibilityPage.groupActivities', '그룹 활동 추천')}</h4>
                        {timing.group_activities.map((activity, idx) => (
                          <div key={idx} className={styles.dayItem}>
                            <span className={styles.dayLabel}>{activity.days}</span>
                            <span className={styles.dayActivities}>
                              {activity.activities.join(', ')}
                            </span>
                            <span className={styles.dayReason}>{activity.reason}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Regular good_days for 2-person */}
                    {!isGroupResult && timing.good_days && timing.good_days.length > 0 && (
                      <div className={styles.goodDays}>
                        <h4>✨ {t('compatibilityPage.recommendedDays', 'Recommended Days')}</h4>
                        {timing.good_days.map((day, idx) => (
                          <div key={idx} className={styles.dayItem}>
                            <span className={styles.dayLabel}>{day.days}</span>
                            <span className={styles.dayActivities}>
                              {day.activities.join(', ')}
                            </span>
                            <span className={styles.dayReason}>{day.reason}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Action Items Section */}
            {actionItems.length > 0 && (
              <div className={styles.actionSection}>
                <div className={styles.resultCard}>
                  <div className={styles.resultCardGlow} />
                  <div className={styles.resultCardHeader}>
                    <span className={styles.resultCardIcon}>💪</span>
                    <h3 className={styles.resultCardTitle}>
                      {t('compatibilityPage.growthActions', 'Growth Actions')}
                    </h3>
                  </div>
                  <div className={styles.resultCardContent}>
                    <ul className={styles.actionList}>
                      {actionItems.map((item, idx) => (
                        <li key={idx} className={styles.actionItem}>
                          <span className={styles.actionNumber}>{idx + 1}</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons: Chat, Counselor, Tarot */}
            <div className={styles.actionButtons}>
              <button
                className={styles.actionButton}
                onClick={() => router.push(`/compatibility/chat?persons=${encodeURIComponent(JSON.stringify(persons.map(p => ({ name: p.name, date: p.date, time: p.time, city: p.cityQuery, relation: p.relation }))))}&result=${encodeURIComponent(resultText || '')}`)}
              >
                <span className={styles.actionButtonIcon}>💬</span>
                <div className={styles.actionButtonText}>
                  <strong>{t('compatibilityPage.chat.startChat', 'AI 상담 시작')}</strong>
                  <span>{t('compatibilityPage.chat.title', '궁합 상담')}</span>
                </div>
              </button>

              <button
                className={styles.actionButton}
                onClick={() => router.push('/destiny-map/counselor')}
              >
                <span className={styles.actionButtonIcon}>🧙‍♂️</span>
                <div className={styles.actionButtonText}>
                  <strong>{t('compatibilityPage.counselor.connect', '상담사 연결하기')}</strong>
                  <span>{t('compatibilityPage.counselor.description', '더 깊은 궁합 분석')}</span>
                </div>
              </button>

              <button
                className={styles.actionButton}
                onClick={() => {
                  const partnerName = persons[1]?.name || t('compatibilityPage.person', 'Person') + ' 2';
                  router.push(`/tarot?context=compatibility&partner=${encodeURIComponent(partnerName)}`);
                }}
              >
                <span className={styles.actionButtonIcon}>🔮</span>
                <div className={styles.actionButtonText}>
                  <strong>{t('compatibilityPage.tarot.start', '타로 시작하기')}</strong>
                  <span>{t('compatibilityPage.tarot.description', '상대방을 생각하며 타로')}</span>
                </div>
              </button>
            </div>

            {/* Share Button */}
            <div className={styles.shareSection}>
              <ShareButton
                generateCard={() => {
                  const shareData: CompatibilityData = {
                    person1Name: persons[0]?.name || 'Person 1',
                    person2Name: persons[1]?.name || 'Person 2',
                    score: overallScore ?? 75,
                    relation: (persons[1]?.relation as 'lover' | 'friend' | 'other') || 'lover',
                    highlights: sections.slice(0, 2).map(s => s.content.split('\n')[0]?.slice(0, 80)),
                  };
                  return generateCompatibilityCard(shareData, 'og');
                }}
                filename="compatibility-result.png"
                shareTitle={t('compatibilityPage.shareTitle', 'Our Compatibility Result')}
                shareText={`${persons[0]?.name || 'Person 1'} & ${persons[1]?.name || 'Person 2'}: ${overallScore ?? '?'}% compatible! Check yours at destinypal.me/compatibility`}
                label={t('share.shareResult', 'Share Result')}
              />
            </div>
          </div>
        )}
      </main>
    </ServicePageLayout>
  );
}
