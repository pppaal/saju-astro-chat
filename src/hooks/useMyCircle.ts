import { useState, useEffect } from 'react';
import type { SavedPerson } from '@/app/compatibility/lib';
import { logger } from '@/lib/logger';

export function useMyCircle(status: 'authenticated' | 'loading' | 'unauthenticated') {
  const [circlePeople, setCirclePeople] = useState<SavedPerson[]>([]);
  const [showCircleDropdown, setShowCircleDropdown] = useState<number | null>(null);

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
        logger.error('Failed to load circle:', { error: e instanceof Error ? e.message : String(e) });
      }
    };
    loadCircle();
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
