import { useState, useCallback } from 'react';
import type { PersonForm, TimingData, GroupAnalysisData, SynergyBreakdown } from '@/app/compatibility/lib';

interface CompatibilityResult {
  interpretation?: string;
  timing?: TimingData;
  action_items?: string[];
  is_group?: boolean;
  group_analysis?: GroupAnalysisData;
  synergy_breakdown?: SynergyBreakdown;
  error?: string;
}

export function useCompatibilityAnalysis() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultText, setResultText] = useState<string | null>(null);
  const [timing, setTiming] = useState<TimingData | null>(null);
  const [actionItems, setActionItems] = useState<string[]>([]);
  const [groupAnalysis, setGroupAnalysis] = useState<GroupAnalysisData | null>(null);
  const [synergyBreakdown, setSynergyBreakdown] = useState<SynergyBreakdown | null>(null);
  const [isGroupResult, setIsGroupResult] = useState(false);

  const validate = useCallback((persons: PersonForm[], count: number, t: (key: string, fallback: string) => string) => {
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
  }, []);

  const analyzeCompatibility = useCallback(async (persons: PersonForm[]) => {
    setIsLoading(true);
    setError(null);
    setResultText(null);

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
      const data = (await res.json()) as CompatibilityResult | null;
      if (!data) throw new Error('Server error');
      if (!res.ok || data.error) throw new Error(data.error || 'Server error');
      if (!data) throw new Error('No data received');

      const interpretation = data.interpretation;
      if (interpretation !== null && interpretation !== undefined && interpretation !== '') {
        setResultText(String(interpretation));
      } else {
        setResultText(JSON.stringify(data, null, 2));
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
