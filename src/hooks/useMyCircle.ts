import { useState, useEffect } from 'react';
import type { SavedPerson } from '@/app/compatibility/lib';
import { logger } from '@/lib/logger';

export type CirclePerson = SavedPerson;

export function useMyCircle(status: 'authenticated' | 'loading' | 'unauthenticated') {
  const [circlePeople, setCirclePeople] = useState<SavedPerson[]>([]);
  const [showCircleDropdown, setShowCircleDropdown] = useState<number | null>(null);

  // Load circle people when logged in
  useEffect(() => {
    if (status !== 'authenticated') return;

    const controller = new AbortController();

    const loadCircle = async () => {
      try {
        const res = await fetch('/api/me/circle', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setCirclePeople(data.people || []);
        }
      } catch (e) {
        // Ignore abort errors - they're expected when component unmounts
        if (e instanceof Error && e.name === 'AbortError') return;
        logger.error('Failed to load circle:', { error: e instanceof Error ? e.message : String(e) });
      }
    };

    loadCircle();

    // Cleanup: abort fetch on unmount or status change
    return () => controller.abort();
  }, [status]);

  // Close circle dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-circle-dropdown]')) {
        setShowCircleDropdown(null);
      }
    };
    if (showCircleDropdown !== null) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showCircleDropdown]);

  return {
    circlePeople,
    showCircleDropdown,
    setShowCircleDropdown,
  };
}
