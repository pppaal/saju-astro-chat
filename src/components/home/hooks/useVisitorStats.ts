/**
 * Visitor Stats Hook
 *
 * 방문자/회원 통계 로딩
 */

import { useState, useEffect, useRef } from 'react';

export interface VisitorStats {
  todayVisitors: number | null;
  totalVisitors: number | null;
  totalMembers: number | null;
  error: string | null;
}

export function useVisitorStats(metricsToken?: string) {
  const [stats, setStats] = useState<VisitorStats>({
    todayVisitors: null,
    totalVisitors: null,
    totalMembers: null,
    error: null,
  });

  const trackedOnce = useRef(false);

  useEffect(() => {
    if (trackedOnce.current) {return;}
    trackedOnce.current = true;

    const headers: HeadersInit = {};
    if (metricsToken) {headers['x-metrics-token'] = metricsToken;}

    async function run() {
      try {
        // Track visitor (POST - don't wait for response)
        fetch('/api/visitors-today', { method: 'POST', headers }).catch(() => {});

        // Fetch both visitor stats and member stats in parallel
        const [visitorRes, statsRes] = await Promise.all([
          fetch('/api/visitors-today', { headers }),
          fetch('/api/stats'),
        ]);

        // Process visitor stats
        if (visitorRes.ok) {
          const data = await visitorRes.json();
          setStats(prev => ({
            ...prev,
            todayVisitors: typeof data.count === 'number' ? data.count : 0,
            totalVisitors: typeof data.total === 'number' ? data.total : 0,
          }));
        }

        // Process member stats
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(prev => ({
            ...prev,
            totalMembers: typeof statsData.users === 'number' ? statsData.users : 0,
          }));
        }
      } catch {
        setStats(prev => ({ ...prev, error: 'Could not load stats.' }));
      }
    }

    run();
  }, [metricsToken]);

  return stats;
}
