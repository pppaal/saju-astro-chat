// src/hooks/calendar/useSavedDates.ts
import { useState, useCallback, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { UI_TIMEOUTS } from '@/lib/constants/formulas';

interface UseSavedDatesReturn {
  savedDates: Set<string>;
  saving: boolean;
  saveMsg: string | null;
  isSaved: (dateStr: string) => boolean;
  toggleSave: (dateStr: string, userId?: string) => Promise<void>;
}

/**
 * Hook for managing saved calendar dates
 */
export function useSavedDates(): UseSavedDatesReturn {
  const [savedDates, setSavedDates] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const isSaved = useCallback(
    (dateStr: string) => savedDates.has(dateStr),
    [savedDates]
  );

  const toggleSave = useCallback(
    async (dateStr: string, userId?: string) => {
      if (!userId) {
        logger.warn('[useSavedDates] No user ID provided');
        return;
      }

      setSaving(true);
      setSaveMsg(null);

      try {
        const willSave = !savedDates.has(dateStr);

        const res = await fetch('/api/calendar/save', {
          method: willSave ? 'POST' : 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: dateStr }),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json = await res.json();

        if (json.success) {
          setSavedDates((prev) => {
            const next = new Set(prev);
            if (willSave) {
              next.add(dateStr);
            } else {
              next.delete(dateStr);
            }
            return next;
          });

          setSaveMsg(willSave ? '날짜 저장 완료' : '저장 취소됨');

          setTimeout(() => setSaveMsg(null), UI_TIMEOUTS.TOAST_DISMISS);

          logger.info('[useSavedDates] Toggle save success', {
            date: dateStr,
            saved: willSave,
          });
        } else {
          throw new Error(json.error || 'Save failed');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        logger.error('[useSavedDates] Toggle save failed', { error: message });
        setSaveMsg('저장 실패');
        setTimeout(() => setSaveMsg(null), UI_TIMEOUTS.TOAST_DISMISS);
      } finally {
        setSaving(false);
      }
    },
    [savedDates]
  );

  // Auto-hide save message
  useEffect(() => {
    if (saveMsg) {
      const timer = setTimeout(() => setSaveMsg(null), UI_TIMEOUTS.TOAST_DISMISS);
      return () => clearTimeout(timer);
    }
  }, [saveMsg]);

  return { savedDates, saving, saveMsg, isSaved, toggleSave };
}
