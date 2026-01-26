/**
 * History Data Hook
 *
 * Manages loading and filtering of user history data
 */

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import type { DailyHistory } from '../lib';

export interface UseHistoryDataReturn {
  history: DailyHistory[];
  loading: boolean;
  selectedService: string | null;
  setSelectedService: (service: string | null) => void;
  showAllRecords: boolean;
  setShowAllRecords: (show: boolean) => void;
}

export function useHistoryData(authenticated: boolean): UseHistoryDataReturn {
  const [history, setHistory] = useState<DailyHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [showAllRecords, setShowAllRecords] = useState(false);

  useEffect(() => {
    const loadHistory = async () => {
      if (!authenticated) {return;}
      try {
        const res = await fetch('/api/me/history', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setHistory(data.history || []);
        }
      } catch (e) {
        logger.error('Failed to load history:', e);
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, [authenticated]);

  return {
    history,
    loading,
    selectedService,
    setSelectedService,
    showAllRecords,
    setShowAllRecords,
  };
}
