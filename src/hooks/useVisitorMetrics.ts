import { useState, useEffect, useRef } from 'react';

export function useVisitorMetrics(metricsToken?: string) {
  const [todayVisitors, setTodayVisitors] = useState<number | null>(null);
  const [totalVisitors, setTotalVisitors] = useState<number | null>(null);
  const [totalMembers, setTotalMembers] = useState<number | null>(null);
  const [visitorError, setVisitorError] = useState<string | null>(null);
  const trackedOnce = useRef(false);

  useEffect(() => {
    if (!metricsToken) return;

    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/metrics/public', {
          headers: { Authorization: `Bearer ${metricsToken}` },
        });

        if (!res.ok) throw new Error('Failed to fetch metrics');

        const data = await res.json();
        setTodayVisitors(data.todayVisitors ?? null);
        setTotalVisitors(data.totalVisitors ?? null);
        setTotalMembers(data.totalMembers ?? null);
      } catch (err) {
        console.error('Metrics fetch error:', err);
        setVisitorError('Failed to load metrics');
      }
    };

    fetchMetrics();

    // Track visit once
    if (!trackedOnce.current) {
      trackedOnce.current = true;
      fetch('/api/metrics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).catch(() => {});
    }
  }, [metricsToken]);

  return {
    todayVisitors,
    totalVisitors,
    totalMembers,
    visitorError,
  };
}
