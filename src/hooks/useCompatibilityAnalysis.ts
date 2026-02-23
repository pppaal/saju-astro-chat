import { useState, useCallback } from 'react';
import type { PersonForm, TimingData, GroupAnalysisData, SynergyBreakdown } from '@/app/compatibility/lib';

interface CompatibilityResult {
  interpretation?: string;
  overall_score?: number;
  average?: number;
  timing?: TimingData;
  action_items?: string[];
  is_group?: boolean;
  group_analysis?: GroupAnalysisData;
  synergy_breakdown?: SynergyBreakdown;
  error?: string;
}

const QUICK_MODE_DEFAULTS = {
  time: '12:00',
  city: 'Seoul, KR',
  latitude: 37.5665,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
} as const

const getQuickModeTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || QUICK_MODE_DEFAULTS.timeZone
  } catch {
    return QUICK_MODE_DEFAULTS.timeZone
  }
}

export function useCompatibilityAnalysis() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultText, setResultText] = useState<string | null>(null);
  const [overallScore, setOverallScore] = useState<number | null>(null);
  const [timing, setTiming] = useState<TimingData | null>(null);
  const [actionItems, setActionItems] = useState<string[]>([]);
  const [groupAnalysis, setGroupAnalysis] = useState<GroupAnalysisData | null>(null);
  const [synergyBreakdown, setSynergyBreakdown] = useState<SynergyBreakdown | null>(null);
  const [isGroupResult, setIsGroupResult] = useState(false);

  const validate = useCallback((persons: PersonForm[], count: number, t: (key: string, fallback: string) => string) => {
    if (count < 2 || count > 4) {return t('compatibilityPage.errorAddPeople', 'Add between 2 and 4 people.');}
    for (let i = 0; i < persons.length; i++) {
      const p = persons[i];
      const isDetailedMode = Boolean(p.isDetailedMode);
      if (!p.date) {return `${i + 1}: ${t('compatibilityPage.errorDateTimeRequired', 'date and time are required.')}`;}
      if (isDetailedMode && !p.time) {return `${i + 1}: ${t('compatibilityPage.errorDateTimeRequired', 'date and time are required.')}`;}
      if (isDetailedMode && (p.lat == null || p.lon == null)) {return `${i + 1}: ${t('compatibilityPage.errorSelectCity', 'select a city from suggestions.')}`;}
      if (isDetailedMode && !p.timeZone) {return `${i + 1}: ${t('compatibilityPage.errorTimezoneRequired', 'timezone is required.')}`;}
      if (i > 0 && isDetailedMode && !p.relation) {return `${i + 1}: ${t('compatibilityPage.errorRelationRequired', 'relation to Person 1 is required.')}`;}
      if (i > 0 && isDetailedMode && p.relation === 'other' && !p.relationNote?.trim()) {
        return `${i + 1}: ${t('compatibilityPage.errorOtherNote', "add a note for relation 'other'.")}`;
      }
    }
    return null;
  }, []);

  const analyzeCompatibility = useCallback(async (persons: PersonForm[], locale: 'ko' | 'en' = 'en') => {
    setIsLoading(true);
    setError(null);
    setResultText(null);

    try {
      const body = {
        locale,
        persons: persons.map((p, idx) => ({
          name: p.name || `Person ${idx + 1}`,
          date: p.date,
          time: p.time || QUICK_MODE_DEFAULTS.time,
          city: p.cityQuery || QUICK_MODE_DEFAULTS.city,
          latitude: p.lat ?? QUICK_MODE_DEFAULTS.latitude,
          longitude: p.lon ?? QUICK_MODE_DEFAULTS.longitude,
          timeZone: p.timeZone || getQuickModeTimezone(),
          relationToP1: idx === 0 ? undefined : (p.relation || 'friend'),
          relationNoteToP1: idx === 0 ? undefined : p.relationNote,
        })),
      };

      const res = await fetch('/api/compatibility', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-token': process.env.NEXT_PUBLIC_API_TOKEN || '',
        },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as CompatibilityResult | null;
      if (!data) {throw new Error('Server error');}
      if (!res.ok || data.error) {
        const errMsg = typeof data.error === 'string'
          ? data.error
          : (data.error && typeof data.error === 'object' && 'message' in data.error)
            ? String((data.error as { message: string }).message)
            : 'Server error';
        throw new Error(errMsg);
      }

      const interpretation = data.interpretation;
      if (interpretation !== null && interpretation !== undefined && interpretation !== '') {
        setResultText(String(interpretation));
      } else {
        setResultText(JSON.stringify(data, null, 2));
      }

      // Extract numeric score from API response
      const numericScore = data.overall_score ?? data.average ?? null;
      if (typeof numericScore === 'number' && numericScore >= 0 && numericScore <= 100) {
        setOverallScore(numericScore);
      } else {
        setOverallScore(null);
      }

      // Set timing and action items from fusion system
      if (data.timing) {
        setTiming(data.timing);
      }
      if (data.action_items && Array.isArray(data.action_items)) {
        setActionItems(data.action_items);
      }

      // Group analysis data
      if (data.is_group && data.group_analysis) {
        setGroupAnalysis(data.group_analysis);
        setIsGroupResult(true);
      } else {
        setGroupAnalysis(null);
        setIsGroupResult(false);
      }

      // Synergy breakdown
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
  }, []);

  const resetResults = useCallback(() => {
    setResultText(null);
    setError(null);
    setOverallScore(null);
    setTiming(null);
    setActionItems([]);
    setGroupAnalysis(null);
    setSynergyBreakdown(null);
    setIsGroupResult(false);
  }, []);

  return {
    isLoading,
    error,
    setError,
    resultText,
    overallScore,
    timing,
    actionItems,
    groupAnalysis,
    synergyBreakdown,
    isGroupResult,
    validate,
    analyzeCompatibility,
    resetResults,
  };
}
