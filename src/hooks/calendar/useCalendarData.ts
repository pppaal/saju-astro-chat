// src/hooks/calendar/useCalendarData.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { logger } from '@/lib/logger';

type EventCategory = "wealth" | "career" | "love" | "health" | "travel" | "study" | "general";
type ImportanceGrade = 0 | 1 | 2 | 3 | 4;

interface ImportantDate {
  date: string;
  grade: ImportanceGrade;
  score: number;
  categories: EventCategory[];
  title: string;
  description: string;
  summary?: string;
  bestTimes?: string[];
  sajuFactors: string[];
  astroFactors: string[];
  recommendations: string[];
  warnings: string[];
  ganzhi?: string;
  transitSunSign?: string;
  crossVerified?: boolean;
}

interface CalendarData {
  success: boolean;
  year: number;
  summary?: {
    total: number;
    grade0: number;
    grade1: number;
    grade2: number;
    grade3: number;
    grade4: number;
  };
  topDates?: ImportantDate[];
  goodDates?: ImportantDate[];
  cautionDates?: ImportantDate[];
  allDates?: ImportantDate[];
  error?: string;
}

interface BirthInfo {
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  gender: 'Male' | 'Female';
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

interface UseCalendarDataReturn {
  data: CalendarData | null;
  loading: boolean;
  error: string | null;
  cacheHit: boolean;
  fetchCalendar: (
    birthInfo: BirthInfo,
    year: number,
    category: string,
    locale: string
  ) => Promise<void>;
}

/**
 * Calendar data fetching hook with caching support and AbortController
 */
export function useCalendarData(): UseCalendarDataReturn {
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cacheHit, setCacheHit] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchCalendar = useCallback(
    async (
      birthInfo: BirthInfo,
      year: number,
      category: string,
      locale: string
    ) => {
      // Abort previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new AbortController for this request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setLoading(true);
      setError(null);
      setCacheHit(false);

      try {
        const params = new URLSearchParams({
          birthDate: birthInfo.birthDate,
          birthTime: birthInfo.birthTime || '12:00',
          latitude: String(birthInfo.latitude ?? 0),
          longitude: String(birthInfo.longitude ?? 0),
          timezone: birthInfo.timezone || 'UTC',
          year: String(year),
          category,
          locale,
        });

        const res = await fetch(`/api/calendar?${params.toString()}`, {
          signal: abortController.signal,
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const json = await res.json();

        if (!json.success) {
          throw new Error(json.error || 'Failed to fetch calendar');
        }

        setData(json);
        setCacheHit(json.cached === true);

        logger.info('[useCalendarData] Calendar loaded', {
          year,
          category,
          cached: json.cached,
          totalDates: json.allDates?.length || 0,
        });
      } catch (err) {
        // Don't set error if request was aborted
        if (err instanceof Error && err.name === 'AbortError') {
          logger.debug('[useCalendarData] Request aborted');
          return;
        }

        const message = err instanceof Error ? err.message : 'Unknown error';
        logger.error('[useCalendarData] Failed to fetch calendar', { error: message });
        setError(message);
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Cleanup: abort pending requests on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return { data, loading, error, cacheHit, fetchCalendar };
}
